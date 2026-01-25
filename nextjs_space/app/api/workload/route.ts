import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { isAdmin as checkIsAdmin, isKoordinatorOrHigher } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

interface TeamBreakdown {
  teamId: string;
  teamName: string;
  weeklyHours: number;
  workloadPercent: number;
  availableHoursPerWeek: number;
  periods: {
    day: { assigned: number; capacity: number; percentage: number };
    week: { assigned: number; capacity: number; percentage: number };
    month: { assigned: number; capacity: number; percentage: number };
  };
}

interface WorkloadResult {
  userId: string;
  userName: string | null;
  userEmail: string;
  weeklyHours: number;
  workloadPercent: number;
  availableHoursPerWeek: number;
  periods: {
    day: { assigned: number; capacity: number; percentage: number; absenceDays: number };
    week: { assigned: number; capacity: number; percentage: number; absenceDays: number };
    month: { assigned: number; capacity: number; percentage: number; absenceDays: number };
  };
  teamBreakdown?: TeamBreakdown[];
}

// Hilfsfunktion: Finde den nächsten Arbeitstag (Mo-Fr)
function getNextWorkday(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const dayOfWeek = result.getDay();
  if (dayOfWeek === 0) { // Sonntag -> Montag
    result.setDate(result.getDate() + 1);
  } else if (dayOfWeek === 6) { // Samstag -> Montag
    result.setDate(result.getDate() + 2);
  }
  return result;
}

// Hilfsfunktion: Prüft ob heute ein Wochenende ist
function isWeekend(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

// Berechnet die verteilten Stunden eines Tasks für einen bestimmten Tag
function calculateHoursForDay(
  task: { estimatedHours: number | null; dueDate: Date | null },
  targetDay: Date,
  today: Date
): number {
  if (!task.dueDate || !task.estimatedHours) return 0;
  
  const dueDate = new Date(task.dueDate);
  dueDate.setHours(0, 0, 0, 0);
  
  const targetDayStart = new Date(targetDay);
  targetDayStart.setHours(0, 0, 0, 0);
  
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);
  
  // Wochenende überspringen
  const dayOfWeek = targetDayStart.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return 0;
  
  // Nächster Arbeitstag (falls heute Wochenende)
  const nextWorkday = getNextWorkday(todayStart);
  
  // Task ist überfällig - alle Stunden werden auf den NÄCHSTEN ARBEITSTAG verrechnet
  if (dueDate < todayStart) {
    // Nur wenn targetDay = nächster Arbeitstag
    if (targetDayStart.getTime() === nextWorkday.getTime()) {
      return task.estimatedHours;
    }
    return 0;
  }
  
  // Task-Zeitraum: vom nächsten Arbeitstag bis Deadline
  const startDate = nextWorkday;
  const endDate = dueDate;
  
  // Wenn Start nach Ende (Deadline ist am Wochenende vor dem nächsten Arbeitstag)
  if (startDate > endDate) {
    if (targetDayStart.getTime() === nextWorkday.getTime()) {
      return task.estimatedHours;
    }
    return 0;
  }
  
  // Prüfen ob targetDay im Zeitraum liegt
  if (targetDayStart < startDate || targetDayStart > endDate) {
    return 0;
  }
  
  // Arbeitstage im Zeitraum zählen
  let workDays = 0;
  const current = new Date(startDate);
  while (current <= endDate) {
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) {
      workDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  // Minimum 1 Tag
  workDays = Math.max(workDays, 1);
  
  // Stunden pro Tag
  return task.estimatedHours / workDays;
}

// Berechnet die Summe der verteilten Stunden für einen Zeitraum
function calculateHoursForPeriod(
  tasks: { estimatedHours: number | null; dueDate: Date | null }[],
  periodStart: Date,
  periodEnd: Date,
  today: Date
): number {
  let totalHours = 0;
  
  const current = new Date(periodStart);
  while (current < periodEnd) {
    for (const task of tasks) {
      totalHours += calculateHoursForDay(task, current, today);
    }
    current.setDate(current.getDate() + 1);
  }
  
  return totalHours;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userIds = searchParams.get('userIds')?.split(',') || [session.user.id];

    // Get current user to check permissions
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, teamId: true },
    });

    const isAdmin = checkIsAdmin(currentUser?.role);
    const isKoordinator = isKoordinatorOrHigher(currentUser?.role);
    const canViewOthers = isAdmin || isKoordinator;

    // Validate access
    if (!canViewOthers && userIds.some(id => id !== session.user.id)) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Wenn heute Wochenende ist, verwende den nächsten Arbeitstag als Referenz
    // Das macht die Auslastungsplanung am Wochenende sinnvoller
    const referenceDay = isWeekend(today) ? getNextWorkday(today) : today;
    
    const startOfDay = new Date(referenceDay);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // Woche basierend auf referenceDay berechnen
    const startOfWeek = new Date(referenceDay);
    const dayOfWeek = startOfWeek.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Montag als Wochenstart
    startOfWeek.setDate(startOfWeek.getDate() + diff);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const results: WorkloadResult[] = [];

    for (const userId of userIds) {
      // Get user info mit TeamMember-Zuordnungen für korrekte Arbeitsstunden
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          weeklyHours: true,
          workloadPercent: true,
          // TeamMember-Zuordnungen für die tatsächlichen Arbeitsstunden
          teamMemberships: {
            select: {
              teamId: true,
              weeklyHours: true,
              workloadPercent: true,
              team: {
                select: {
                  id: true,
                  name: true,
                }
              }
            }
          }
        },
      });

      if (!user) continue;

      // Verwende TeamMember-Stunden wenn vorhanden, sonst User-Defaults
      // Bei mehreren Team-Mitgliedschaften: SUMMIERE die verfügbaren Stunden
      let weeklyHours = user.weeklyHours;
      let workloadPercent = user.workloadPercent;
      
      if (user.teamMemberships && user.teamMemberships.length > 0) {
        // Berechne die tatsächlich verfügbaren Stunden pro Team und summiere
        const totalAvailableHours = user.teamMemberships.reduce((sum, tm) => {
          return sum + (tm.weeklyHours * tm.workloadPercent / 100);
        }, 0);
        
        // Setze weeklyHours auf die Gesamtsumme und workloadPercent auf 100
        weeklyHours = totalAvailableHours;
        workloadPercent = 100;
      }

      const availableHoursPerWeek = (weeklyHours * workloadPercent) / 100;
      const hoursPerDay = availableHoursPerWeek / 5; // 5 Arbeitstage
      
      // Berechne Werktage im Monat
      const workdaysInMonth = getWorkdaysInMonth(now.getFullYear(), now.getMonth());

      // Abwesenheiten laden
      const absences = await prisma.absence.findMany({
        where: {
          userId,
          OR: [
            { startDate: { gte: startOfMonth, lt: endOfMonth } },
            { endDate: { gte: startOfMonth, lt: endOfMonth } },
            { AND: [{ startDate: { lte: startOfMonth } }, { endDate: { gte: endOfMonth } }] }
          ]
        }
      });

      // Berechne Abwesenheitstage für jeden Zeitraum
      const dayAbsenceDays = countAbsenceWorkdays(absences, startOfDay, endOfDay);
      const weekAbsenceDays = countAbsenceWorkdays(absences, startOfWeek, endOfWeek);
      const monthAbsenceDays = countAbsenceWorkdays(absences, startOfMonth, endOfMonth);

      // Kapazität nach Abzug der Abwesenheiten
      const dayCapacity = Math.max(0, hoursPerDay - (dayAbsenceDays * hoursPerDay));
      const weekCapacity = Math.max(0, availableHoursPerWeek - (weekAbsenceDays * hoursPerDay));
      const monthCapacity = Math.max(0, (hoursPerDay * workdaysInMonth) - (monthAbsenceDays * hoursPerDay));

      // Alle offenen Tasks des Users laden MIT Team-Zuordnung (über Ticket)
      const allOpenTasks = await prisma.subTask.findMany({
        where: {
          OR: [
            { assigneeId: userId },
            { assignees: { some: { userId: userId } } }
          ],
          completed: false,
          dueDate: { not: null },
        },
        select: { 
          id: true,
          estimatedHours: true,
          dueDate: true,
          ticket: {
            select: {
              teamId: true,
            }
          }
        },
      });
      
      // Deduplizieren (falls ein Task sowohl über assigneeId als auch SubTaskAssignee zugewiesen ist)
      const uniqueTasks = Array.from(new Map(allOpenTasks.map(t => [t.id, t])).values());

      // Verteilte Stunden für jeden Zeitraum berechnen (GESAMT)
      const dayHours = calculateHoursForPeriod(uniqueTasks, startOfDay, endOfDay, referenceDay);
      const weekHours = calculateHoursForPeriod(uniqueTasks, startOfWeek, endOfWeek, referenceDay);
      const monthHours = calculateHoursForPeriod(uniqueTasks, startOfMonth, endOfMonth, referenceDay);

      // Wenn komplett abwesend, 100% Auslastung durch Abwesenheit
      const dayPercentage = dayAbsenceDays >= 1 ? 100 : (dayCapacity > 0 ? Math.round((dayHours / dayCapacity) * 100) : 0);
      const weekPercentage = weekAbsenceDays >= 5 ? 100 : (weekCapacity > 0 ? Math.round((weekHours / weekCapacity) * 100) : 0);
      const monthPercentage = monthAbsenceDays >= workdaysInMonth ? 100 : (monthCapacity > 0 ? Math.round((monthHours / monthCapacity) * 100) : 0);

      // TEAM BREAKDOWN: Pro Team separate Auslastung berechnen
      const teamBreakdown: TeamBreakdown[] = [];
      
      if (user.teamMemberships && user.teamMemberships.length > 0) {
        for (const membership of user.teamMemberships) {
          const teamAvailableHours = (membership.weeklyHours * membership.workloadPercent) / 100;
          const teamHoursPerDay = teamAvailableHours / 5;
          
          // Tasks nur für dieses Team filtern
          const teamTasks = uniqueTasks.filter(t => t.ticket?.teamId === membership.teamId);
          
          // Stunden pro Zeitraum für dieses Team
          const teamDayHours = calculateHoursForPeriod(teamTasks, startOfDay, endOfDay, referenceDay);
          const teamWeekHours = calculateHoursForPeriod(teamTasks, startOfWeek, endOfWeek, referenceDay);
          const teamMonthHours = calculateHoursForPeriod(teamTasks, startOfMonth, endOfMonth, referenceDay);
          
          // Kapazität für dieses Team (mit Abwesenheiten)
          const teamDayCapacity = Math.max(0, teamHoursPerDay - (dayAbsenceDays * teamHoursPerDay));
          const teamWeekCapacity = Math.max(0, teamAvailableHours - (weekAbsenceDays * teamHoursPerDay));
          const teamMonthCapacity = Math.max(0, (teamHoursPerDay * workdaysInMonth) - (monthAbsenceDays * teamHoursPerDay));
          
          // Prozente
          const teamDayPct = teamDayCapacity > 0 ? Math.round((teamDayHours / teamDayCapacity) * 100) : 0;
          const teamWeekPct = teamWeekCapacity > 0 ? Math.round((teamWeekHours / teamWeekCapacity) * 100) : 0;
          const teamMonthPct = teamMonthCapacity > 0 ? Math.round((teamMonthHours / teamMonthCapacity) * 100) : 0;
          
          teamBreakdown.push({
            teamId: membership.teamId,
            teamName: membership.team.name,
            weeklyHours: membership.weeklyHours,
            workloadPercent: membership.workloadPercent,
            availableHoursPerWeek: teamAvailableHours,
            periods: {
              day: {
                assigned: Math.round(teamDayHours * 10) / 10,
                capacity: Math.round(teamDayCapacity * 10) / 10,
                percentage: teamDayPct,
              },
              week: {
                assigned: Math.round(teamWeekHours * 10) / 10,
                capacity: Math.round(teamWeekCapacity * 10) / 10,
                percentage: teamWeekPct,
              },
              month: {
                assigned: Math.round(teamMonthHours * 10) / 10,
                capacity: Math.round(teamMonthCapacity * 10) / 10,
                percentage: teamMonthPct,
              },
            },
          });
        }
      }

      results.push({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        weeklyHours,
        workloadPercent,
        availableHoursPerWeek,
        periods: {
          day: {
            assigned: Math.round(dayHours * 10) / 10,
            capacity: Math.round(dayCapacity * 10) / 10,
            percentage: dayPercentage,
            absenceDays: dayAbsenceDays,
          },
          week: {
            assigned: Math.round(weekHours * 10) / 10,
            capacity: Math.round(weekCapacity * 10) / 10,
            percentage: weekPercentage,
            absenceDays: weekAbsenceDays,
          },
          month: {
            assigned: Math.round(monthHours * 10) / 10,
            capacity: Math.round(monthCapacity * 10) / 10,
            percentage: monthPercentage,
            absenceDays: monthAbsenceDays,
          },
        },
        teamBreakdown: teamBreakdown.length > 0 ? teamBreakdown : undefined,
      });
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error calculating workload:', error);
    return NextResponse.json(
      { error: 'Fehler beim Berechnen der Auslastung' },
      { status: 500 }
    );
  }
}

function getWorkdaysInMonth(year: number, month: number): number {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let workdays = 0;

  for (let day = new Date(firstDay); day <= lastDay; day.setDate(day.getDate() + 1)) {
    const dayOfWeek = day.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workdays++;
    }
  }

  return workdays;
}

// Berechnet die Anzahl der Werktage, die durch Abwesenheiten im Zeitraum belegt sind
function countAbsenceWorkdays(
  absences: { startDate: Date; endDate: Date }[],
  periodStart: Date,
  periodEnd: Date
): number {
  let totalDays = 0;
  const countedDays = new Set<string>();

  for (const absence of absences) {
    const absStart = new Date(absence.startDate);
    const absEnd = new Date(absence.endDate);
    
    // Überlappung berechnen
    const overlapStart = new Date(Math.max(absStart.getTime(), periodStart.getTime()));
    const overlapEnd = new Date(Math.min(absEnd.getTime(), periodEnd.getTime()));
    
    if (overlapStart <= overlapEnd) {
      // Zähle Werktage in der Überlappung
      for (let day = new Date(overlapStart); day <= overlapEnd; day.setDate(day.getDate() + 1)) {
        const dayOfWeek = day.getDay();
        const dayKey = day.toISOString().split('T')[0];
        
        // Nur Werktage zählen und keine Doppelzählung
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !countedDays.has(dayKey)) {
          countedDays.add(dayKey);
          totalDays++;
        }
      }
    }
  }

  return totalDays;
}
