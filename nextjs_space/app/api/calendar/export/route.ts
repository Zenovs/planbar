import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import ical, { ICalCalendar } from 'ical-generator';

export const dynamic = 'force-dynamic';

// GET: Export tickets as iCal file
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get('ticketId');

    // Create calendar
    const calendar: ICalCalendar = ical({
      name: 'planbar Tickets',
      description: 'Ihre Tickets aus planbar',
      timezone: 'Europe/Berlin',
      prodId: '//planbar//Ticket Management//DE',
    });

    if (ticketId) {
      // Export single ticket
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          assignedTo: {
            select: { name: true, email: true },
          },
          createdBy: {
            select: { name: true, email: true },
          },
          subTasks: {
            where: {
              dueDate: { not: null },
            },
            include: {
              assignee: {
                select: { name: true, email: true },
              },
            },
          },
        },
      });

      if (!ticket) {
        return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 });
      }

      // Check if user has access to this ticket
      if (
        ticket.createdById !== session.user.id &&
        ticket.assignedToId !== session.user.id &&
        !['admin', 'Administrator', 'ADMIN'].includes(session.user.role || '')
      ) {
        return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 });
      }

      // Add sub-tasks with due dates as events
      ticket.subTasks?.forEach((subTask: any) => {
        if (subTask.dueDate) {
          const event = calendar.createEvent({
            start: new Date(subTask.dueDate),
            end: new Date(subTask.dueDate),
            summary: `${ticket.title} - ${subTask.title}`,
            description: `Projekt: ${ticket.title}\nStatus: ${ticket.status}\nPriorität: ${ticket.priority}\n\n${ticket.description || ''}`,
            location: 'planbar',
            url: `${process.env.NEXTAUTH_URL}/tickets/${ticket.id}`,
            id: `subtask-${subTask.id}@planbar`,
            organizer: {
              name: ticket.createdBy.name || 'planbar',
              email: ticket.createdBy.email,
            },
          });

          if (subTask.assignee?.email) {
            event.createAttendee({
              name: subTask.assignee.name || 'Unbekannt',
              email: subTask.assignee.email,
            });
          }
        }
      });
    } else {
      // Export all user's sub-tasks with due dates
      const subTasks = await prisma.subTask.findMany({
        where: {
          OR: [
            { assigneeId: session.user.id },
            { ticket: { createdById: session.user.id } },
            { ticket: { assignedToId: session.user.id } },
          ],
          dueDate: {
            not: null,
          },
        },
        include: {
          assignee: {
            select: { name: true, email: true },
          },
          ticket: {
            include: {
              createdBy: {
                select: { name: true, email: true },
              },
            },
          },
        },
        orderBy: { dueDate: 'asc' },
      });

      // Add each sub-task as event
      subTasks.forEach((subTask: any) => {
        const event = calendar.createEvent({
          start: new Date(subTask.dueDate!),
          end: new Date(subTask.dueDate!),
          summary: `${subTask.ticket.title} - ${subTask.title}`,
          description: `Projekt: ${subTask.ticket.title}\nStatus: ${subTask.ticket.status}\nPriorität: ${subTask.ticket.priority}`,
          location: 'planbar',
          url: `${process.env.NEXTAUTH_URL}/tickets/${subTask.ticket.id}`,
          id: `subtask-${subTask.id}@planbar`,
          organizer: {
            name: subTask.ticket.createdBy.name || 'planbar',
            email: subTask.ticket.createdBy.email,
          },
        });

        if (subTask.assignee?.email) {
          event.createAttendee({
            name: subTask.assignee.name || 'Unbekannt',
            email: subTask.assignee.email,
          });
        }
      });
    }

    // Generate iCal file content
    const calendarContent = calendar.toString();

    // Return as downloadable .ics file
    return new NextResponse(calendarContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="planbar-tickets-${new Date().toISOString().split('T')[0]}.ics"`,
      },
    });
  } catch (error) {
    console.error('Calendar export error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Exportieren des Kalenders' },
      { status: 500 }
    );
  }
}
