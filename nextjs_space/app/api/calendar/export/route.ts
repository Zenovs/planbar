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

      // Add ticket as event
      const event = calendar.createEvent({
        start: ticket.deadline || new Date(),
        end: ticket.deadline || new Date(),
        summary: `[${ticket.priority.toUpperCase()}] ${ticket.title}`,
        description: `Status: ${ticket.status}\nPriorität: ${ticket.priority}\n\n${ticket.description || ''}`,
        location: 'planbar',
        url: `${process.env.NEXTAUTH_URL}/tickets/${ticket.id}`,
        id: `ticket-${ticket.id}@planbar`,
        organizer: {
          name: ticket.createdBy.name || 'planbar',
          email: ticket.createdBy.email,
        },
      });

      if (ticket.assignedTo?.email) {
        event.createAttendee({
          name: ticket.assignedTo.name || 'Unbekannt',
          email: ticket.assignedTo.email,
        });
      }
    } else {
      // Export all user's tickets
      const tickets = await prisma.ticket.findMany({
        where: {
          OR: [
            { assignedToId: session.user.id },
            { createdById: session.user.id },
          ],
          deadline: {
            not: null,
          },
        },
        include: {
          assignedTo: {
            select: { name: true, email: true },
          },
          createdBy: {
            select: { name: true, email: true },
          },
        },
        orderBy: { deadline: 'asc' },
      });

      // Add each ticket as event
      tickets.forEach((ticket: any) => {
        const event = calendar.createEvent({
          start: ticket.deadline!,
          end: ticket.deadline!,
          summary: `[${ticket.priority.toUpperCase()}] ${ticket.title}`,
          description: `Status: ${ticket.status}\nPriorität: ${ticket.priority}\n\n${ticket.description || ''}`,
          location: 'planbar',
          url: `${process.env.NEXTAUTH_URL}/tickets/${ticket.id}`,
          id: `ticket-${ticket.id}@planbar`,
          organizer: {
            name: ticket.createdBy.name || 'planbar',
            email: ticket.createdBy.email,
          },
        });

        if (ticket.assignedTo?.email) {
          event.createAttendee({
            name: ticket.assignedTo.name || 'Unbekannt',
            email: ticket.assignedTo.email,
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
