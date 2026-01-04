import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { sendTicketStatusChangedEmail, sendTicketAssignedEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        assignedTo: true,
        createdBy: true,
        team: true,
        category: true,
        subTasks: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket nicht gefunden' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden des Tickets' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, status, priority, assignedToId, deadline, teamId, categoryId } = body;

    // Get old ticket data for comparison
    const oldTicket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        assignedTo: true,
        createdBy: true,
        team: true,
        category: true,
        subTasks: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!oldTicket) {
      return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 });
    }

    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    
    if (assignedToId !== undefined) {
      updateData.assignedToId = assignedToId;
      
      // If a new user is assigned, automatically update the ticket's team to that user's team
      if (assignedToId) {
        const assignedUser = await prisma.user.findUnique({
          where: { id: assignedToId },
          select: { teamId: true },
        });
        updateData.teamId = assignedUser?.teamId || null;
      } else {
        updateData.teamId = null;
      }
    }
    
    // Allow manual team override
    if (teamId !== undefined) {
      updateData.teamId = teamId;
    }
    
    if (deadline !== undefined) {
      updateData.deadline = deadline ? new Date(deadline) : null;
    }

    const ticket = await prisma.ticket.update({
      where: { id: params.id },
      data: updateData,
      include: {
        assignedTo: true,
        createdBy: true,
        team: true,
        category: true,
        subTasks: {
          orderBy: { position: 'asc' },
        },
      },
    });

    // Send email notifications
    try {
      // Status changed notification
      if (status !== undefined && status !== oldTicket.status) {
        // Notify assigned user
        if (ticket.assignedTo && ticket.assignedTo.emailNotifications) {
          await sendTicketStatusChangedEmail(
            ticket.assignedTo.email,
            ticket.assignedTo.name || ticket.assignedTo.email,
            ticket.title,
            ticket.id,
            oldTicket.status,
            ticket.status,
            session.user.name || session.user.email || 'Unbekannt'
          );
        }
        // Notify creator if different from assigned user
        if (
          ticket.createdBy &&
          ticket.createdBy.emailNotifications &&
          ticket.createdBy.id !== ticket.assignedTo?.id
        ) {
          await sendTicketStatusChangedEmail(
            ticket.createdBy.email,
            ticket.createdBy.name || ticket.createdBy.email,
            ticket.title,
            ticket.id,
            oldTicket.status,
            ticket.status,
            session.user.name || session.user.email || 'Unbekannt'
          );
        }
      }

      // Assignment changed notification
      if (assignedToId !== undefined && assignedToId !== oldTicket.assignedToId) {
        if (ticket.assignedTo && ticket.assignedTo.emailNotifications) {
          await sendTicketAssignedEmail(
            ticket.assignedTo.email,
            ticket.assignedTo.name || ticket.assignedTo.email,
            ticket.title,
            ticket.id,
            session.user.name || session.user.email || 'Unbekannt'
          );
        }
      }
    } catch (error) {
      console.error('Failed to send email notification:', error);
      // Don't fail the request if email fails
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error('Error updating ticket:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Tickets' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    await prisma.ticket.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Tickets' },
      { status: 500 }
    );
  }
}