import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { differenceInBusinessDays, addDays, startOfDay } from 'date-fns';

export const dynamic = 'force-dynamic';

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
            dueDate: deadline ? { lte: new Date(deadline) } : undefined
          },
          select: {
            id: true,
            estimatedHours: true,
            dueDate: true
          }
        },
        assignedTickets: {
          where: {
            status: { in: ['open', 'in_progress'] }
          },
          select: {
            id: true,
            deadline: true
          }
        }
      }
    });

    const today = startOfDay(new Date());
    const deadlineDate = deadline ? startOfDay(new Date(deadline)) : addDays(today, 14);
    
    // Arbeitstage bis Deadline berechnen (Mo-Fr)
    const workDays = Math.max(1, differenceInBusinessDays(deadlineDate, today));

    const resources = users.map(user => {
      // Verfügbare Stunden pro Tag
      const dailyHours = (user.weeklyHours * user.workloadPercent / 100) / 5;
      
      // Gesamte verfügbare Stunden bis Deadline
      const totalAvailableHours = dailyHours * workDays;
      
      // Bereits zugewiesene Stunden (SubTasks)
      const assignedHours = user.assignedSubTasks.reduce((sum, st) => {
        return sum + (st.estimatedHours || 0);
      }, 0);
      
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
    resources.sort((a, b) => b.freeHours - a.freeHours);

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
