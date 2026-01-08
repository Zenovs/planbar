import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { sendTaskUpdateEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

/**
 * API-Route zum Versenden von Update-E-Mails (täglich/wöchentlich)
 * 
 * Kann manuell aufgerufen werden oder via Cron-Job
 * 
 * GET /api/send-update-emails?frequency=daily
 * GET /api/send-update-emails?frequency=weekly
 */
export async function GET(req: NextRequest) {
  try {
    // Authentifizierung (optional für Cron-Jobs)
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const frequency = searchParams.get('frequency') as 'daily' | 'weekly';
    const testMode = searchParams.get('test') === 'true';

    if (!frequency || !['daily', 'weekly'].includes(frequency)) {
      return NextResponse.json(
        { error: 'Frequency must be "daily" or "weekly"' },
        { status: 400 }
      );
    }

    // Berechne Zeitraum
    const now = new Date();
    const startDate = new Date(now);
    if (frequency === 'daily') {
      startDate.setDate(startDate.getDate() - 1); // Letzte 24 Stunden
    } else {
      startDate.setDate(startDate.getDate() - 7); // Letzte 7 Tage
    }

    // Finde alle Benutzer mit aktivierter Frequenz
    const users = await prisma.user.findMany({
      where: {
        emailReportFrequency: frequency,
        emailNotifications: true, // Müssen auch E-Mail-Benachrichtigungen aktiviert haben
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (testMode && session?.user) {
      // Test-Modus: Nur für aktuellen User
      const testUser = users.find(u => u.id === session.user.id);
      if (testUser) {
        const result = await sendUpdateEmailForUser(testUser, startDate, frequency);
        return NextResponse.json({
          success: true,
          testMode: true,
          user: testUser.email,
          ...result,
        });
      } else {
        return NextResponse.json({
          success: false,
          message: `Bitte aktivieren Sie "${frequency}" Updates in Ihren Profileinstellungen`,
        });
      }
    }

    // Versende E-Mails an alle Benutzer
    const results = await Promise.allSettled(
      users.map(user => sendUpdateEmailForUser(user, startDate, frequency))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({
      success: true,
      frequency,
      totalUsers: users.length,
      successful,
      failed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error sending update emails:', error);
    return NextResponse.json(
      { error: 'Failed to send update emails', details: error.message },
      { status: 500 }
    );
  }
}

// Hilfsfunktion: Versende Update-E-Mail für einen Benutzer
async function sendUpdateEmailForUser(
  user: { id: string; email: string; name: string | null },
  startDate: Date,
  frequency: 'daily' | 'weekly'
) {
  // Neue Tickets (zugewiesen an User)
  const newTickets = await prisma.ticket.count({
    where: {
      assignedToId: user.id,
      createdAt: {
        gte: startDate,
      },
    },
  });

  // Neue Subtasks (zugewiesen an User)
  const newSubTasks = await prisma.subTask.count({
    where: {
      assigneeId: user.id,
      createdAt: {
        gte: startDate,
      },
    },
  });

  // Erledigte Subtasks (vom User)
  const completedSubTasks = await prisma.subTask.count({
    where: {
      assigneeId: user.id,
      completed: true,
      updatedAt: {
        gte: startDate,
      },
    },
  });

  // Bald fällige Subtasks (nächste 7 Tage)
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const dueSoonSubTasks = await prisma.subTask.findMany({
    where: {
      assigneeId: user.id,
      completed: false,
      dueDate: {
        gte: new Date(),
        lte: sevenDaysFromNow,
      },
    },
    include: {
      ticket: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: {
      dueDate: 'asc',
    },
    take: 5, // Max. 5 Tasks
  });

  // Neueste Zuweisungen
  const recentTicketAssignments = await prisma.ticket.findMany({
    where: {
      assignedToId: user.id,
      createdAt: {
        gte: startDate,
      },
    },
    include: {
      createdBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 3,
  });

  const recentSubTaskAssignments = await prisma.subTask.findMany({
    where: {
      assigneeId: user.id,
      createdAt: {
        gte: startDate,
      },
    },
    include: {
      ticket: {
        select: {
          id: true,
          title: true,
          createdBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 3,
  });

  // E-Mail versenden
  const result = await sendTaskUpdateEmail(
    user.email,
    user.name || user.email,
    frequency,
    {
      newTickets,
      newSubTasks,
      completedSubTasks,
      dueSoonSubTasks: dueSoonSubTasks.map(task => ({
        title: task.title,
        ticketTitle: task.ticket.title,
        ticketId: task.ticket.id,
        dueDate: task.dueDate!,
      })),
      recentAssignments: [
        ...recentTicketAssignments.map(ticket => ({
          type: 'ticket' as const,
          title: ticket.title,
          ticketId: ticket.id,
          assignedBy: ticket.createdBy.name || ticket.createdBy.email,
        })),
        ...recentSubTaskAssignments.map(task => ({
          type: 'subtask' as const,
          title: task.title,
          ticketTitle: task.ticket.title,
          ticketId: task.ticket.id,
          assignedBy: task.ticket.createdBy.name || task.ticket.createdBy.email,
        })),
      ].slice(0, 5), // Max. 5 Zuweisungen
    }
  );

  return {
    userId: user.id,
    email: user.email,
    sent: result,
    stats: {
      newTickets,
      newSubTasks,
      completedSubTasks,
      dueSoonSubTasks: dueSoonSubTasks.length,
    },
  };
}
