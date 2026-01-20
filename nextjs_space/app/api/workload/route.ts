import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

interface WorkloadResult {
  userId: string;
  userName: string | null;
  userEmail: string;
  weeklyHours: number;
  workloadPercent: number;
  availableHoursPerWeek: number;
  periods: {
    day: { assigned: number; capacity: number; percentage: number };
    week: { assigned: number; capacity: number; percentage: number };
    month: { assigned: number; capacity: number; percentage: number };
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userIds = searchParams.get('userIds')?.split(',') || [session.user.id];
    const period = searchParams.get('period') || 'week'; // day, week, month

    // Get current user to check permissions
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, teamId: true },
    });

    const isAdmin = ['admin', 'Administrator', 'ADMIN'].includes(currentUser?.role || '');
    const isKoordinator = ['koordinator', 'Koordinator'].includes(currentUser?.role || '');
    const canViewOthers = isAdmin || isKoordinator;

    // Validate access
    if (!canViewOthers && userIds.some(id => id !== session.user.id)) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const startOfWeek = new Date(startOfDay);
    const dayOfWeek = startOfWeek.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Montag als Wochenstart
    startOfWeek.setDate(startOfWeek.getDate() + diff);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const results: WorkloadResult[] = [];

    for (const userId of userIds) {
      // Get user info
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          weeklyHours: true,
          workloadPercent: true,
        },
      });

      if (!user) continue;

      const availableHoursPerWeek = (user.weeklyHours * user.workloadPercent) / 100;
      const hoursPerDay = availableHoursPerWeek / 5; // 5 Arbeitstage
      
      // Berechne Tage im Monat (nur Werktage)
      const workdaysInMonth = getWorkdaysInMonth(now.getFullYear(), now.getMonth());
      const hoursPerMonth = hoursPerDay * workdaysInMonth;

      // Get assigned hours for each period (nur offene Tasks)
      const [dayTasks, weekTasks, monthTasks] = await Promise.all([
        prisma.subTask.findMany({
          where: {
            assigneeId: userId,
            completed: false,
            dueDate: {
              gte: startOfDay,
              lt: endOfDay,
            },
          },
          select: { estimatedHours: true },
        }),
        prisma.subTask.findMany({
          where: {
            assigneeId: userId,
            completed: false,
            dueDate: {
              gte: startOfWeek,
              lt: endOfWeek,
            },
          },
          select: { estimatedHours: true },
        }),
        prisma.subTask.findMany({
          where: {
            assigneeId: userId,
            completed: false,
            dueDate: {
              gte: startOfMonth,
              lt: endOfMonth,
            },
          },
          select: { estimatedHours: true },
        }),
      ]);

      const dayHours = dayTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
      const weekHours = weekTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
      const monthHours = monthTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);

      results.push({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        weeklyHours: user.weeklyHours,
        workloadPercent: user.workloadPercent,
        availableHoursPerWeek,
        periods: {
          day: {
            assigned: dayHours,
            capacity: hoursPerDay,
            percentage: hoursPerDay > 0 ? Math.round((dayHours / hoursPerDay) * 100) : 0,
          },
          week: {
            assigned: weekHours,
            capacity: availableHoursPerWeek,
            percentage: availableHoursPerWeek > 0 ? Math.round((weekHours / availableHoursPerWeek) * 100) : 0,
          },
          month: {
            assigned: monthHours,
            capacity: hoursPerMonth,
            percentage: hoursPerMonth > 0 ? Math.round((monthHours / hoursPerMonth) * 100) : 0,
          },
        },
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
