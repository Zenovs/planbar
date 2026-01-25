import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { differenceInBusinessDays, addDays, startOfDay } from 'date-fns';

export const dynamic = 'force-dynamic';

// Hilfsfunktion: Finde den nächsten Arbeitstag (Mo-Fr)
function getNextWorkday(date: Date): Date {
  const result = startOfDay(new Date(date));
  const dayOfWeek = result.getDay();
  if (dayOfWeek === 0) { // Sonntag -> Montag
    result.setDate(result.getDate() + 1);
  } else if (dayOfWeek === 6) { // Samstag -> Montag
    result.setDate(result.getDate() + 2);
  }
  return result;
}

// Berechnet die verteilten Stunden eines Tasks für einen Zeitraum
function calculateDistributedHoursForPeriod(
  task: { estimatedHours: number | null; dueDate: Date | null },
  periodStart: Date,
  periodEnd: Date,
  today: Date
): number {
  if (!task.dueDate || !task.estimatedHours) return 0;
  
  const dueDate = startOfDay(new Date(task.dueDate));
  const todayStart = startOfDay(today);
  const nextWorkday = getNextWorkday(todayStart);
  
  // Task ist überfällig - alle Stunden fallen auf den nächsten Arbeitstag
  if (dueDate < todayStart) {
    // Prüfen ob der nächste Arbeitstag im Zeitraum liegt
    if (nextWorkday >= periodStart && nextWorkday < periodEnd) {
      return task.estimatedHours;
    }
    return 0;
  }
  
  // Task-Zeitraum: vom nächsten Arbeitstag bis Deadline
  const taskStart = nextWorkday;
  const taskEnd = dueDate;
  
  // Wenn Start nach Ende (Deadline ist am Wochenende vor dem nächsten Arbeitstag)
  if (taskStart > taskEnd) {
    if (nextWorkday >= periodStart && nextWorkday < periodEnd) {
      return task.estimatedHours;
    }
    return 0;
  }
  
  // Arbeitstage im gesamten Task-Zeitraum zählen
  let totalWorkDays = 0;
  let current = new Date(taskStart);
  while (current <= taskEnd) {
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) {
      totalWorkDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  totalWorkDays = Math.max(totalWorkDays, 1);
  
  // Stunden pro Arbeitstag
  const hoursPerDay = task.estimatedHours / totalWorkDays;
  
  // Arbeitstage im Zeitraum zählen, die auch im Task-Zeitraum liegen
  let periodWorkDays = 0;
  current = new Date(periodStart);
  while (current < periodEnd) {
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) {
      // Nur wenn im Task-Zeitraum
      if (current >= taskStart && current <= taskEnd) {
        periodWorkDays++;
      }
    }
    current.setDate(current.getDate() + 1);
  }
  
  return hoursPerDay * periodWorkDays;
}

// GET - Ressourcenverfügbarkeit aller Teammitglieder berechnen
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const deadline = searchParams.get('deadline');

    // Hole alle User mit Pensum
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        weeklyHours: true,
        workloadPercent: true,
        teamId: true,
        assignedSubTasks: {
          where: {
            completed: false,
            dueDate: { not: null }
          },
          select: {
            id: true,
            estimatedHours: true,
            dueDate: true,
            completed: true
          }
        },
        assignedTickets: {
          where: {
            status: { in: ['open', 'in_progress'] }
          },
          select: {
            id: true
          }
        }
      }
    });

    const today = startOfDay(new Date());
    const deadlineDate = deadline ? startOfDay(new Date(deadline)) : addDays(today, 14);
    
    // Arbeitstage bis Deadline berechnen (Mo-Fr)
    const workDays = Math.max(1, differenceInBusinessDays(deadlineDate, today));

    const resources = users.map((user: any) => {
      // Verfügbare Stunden pro Tag
      const dailyHours = (user.weeklyHours * user.workloadPercent / 100) / 5;
      
      // Gesamte verfügbare Stunden bis Deadline
      const totalAvailableHours = dailyHours * workDays;
      
      // Verteilte Stunden im Zeitraum berechnen
      let assignedHours = 0;
      for (const task of user.assignedSubTasks) {
        assignedHours += calculateDistributedHoursForPeriod(
          task,
          today,
          deadlineDate,
          today
        );
      }
      
      // Freie Kapazität
      const freeHours = Math.max(0, totalAvailableHours - assignedHours);
      
      // Auslastung in Prozent
      const utilizationPercent = totalAvailableHours > 0 
        ? Math.round((assignedHours / totalAvailableHours) * 100)
        : 0;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        weeklyHours: user.weeklyHours,
        workloadPercent: user.workloadPercent,
        dailyHours: Math.round(dailyHours * 10) / 10,
        workDays,
        totalAvailableHours: Math.round(totalAvailableHours * 10) / 10,
        assignedHours: Math.round(assignedHours * 10) / 10,
        freeHours: Math.round(freeHours * 10) / 10,
        utilizationPercent,
        openSubTasks: user.assignedSubTasks.length,
        openTickets: user.assignedTickets.length
      };
    });

    // Sortiere nach freien Stunden (absteigend)
    resources.sort((a: any, b: any) => b.freeHours - a.freeHours);

    return NextResponse.json({ 
      resources,
      period: {
        from: today.toISOString(),
        to: deadlineDate.toISOString(),
        workDays
      }
    });
  } catch (error) {
    console.error('GET /api/resources error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
