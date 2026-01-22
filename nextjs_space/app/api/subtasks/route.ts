import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { sendSubTaskAssignedEmail } from '@/lib/email';
import { isAdmin as checkIsAdmin, isKoordinatorOrHigher } from '@/lib/auth-helpers';

// GET - Alle SubTasks eines Tickets laden
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');

    if (!ticketId) {
      return NextResponse.json({ error: 'ticketId is required' }, { status: 400 });
    }

    // Prüfe ob User Zugriff auf das Ticket hat
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { team: true }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    });

    // Zugriffskontrolle
    const isAdmin = checkIsAdmin(user?.role);
    const isCreator = ticket.createdById === user?.id;
    const isAssigned = ticket.assignedToId === user?.id;
    const isTeamMember = ticket.teamId && ticket.teamId === user?.teamId;
    
    // Prüfe auch TeamMember-Tabelle
    let isTeamMemberViaTable = false;
    if (ticket.teamId && user?.id) {
      const membership = await prisma.teamMember.findFirst({
        where: { userId: user.id, teamId: ticket.teamId }
      });
      isTeamMemberViaTable = !!membership;
    }

    if (!isAdmin && !isCreator && !isAssigned && !isTeamMember && !isTeamMemberViaTable) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const subTasks = await prisma.subTask.findMany({
      where: { ticketId },
      orderBy: { position: 'asc' },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, weeklyHours: true, workloadPercent: true }
        }
      }
    });

    return NextResponse.json(subTasks);
  } catch (error) {
    console.error('GET /api/subtasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Neue SubTask erstellen
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ticketId, title, description, position = 0, dueDate, assigneeId, estimatedHours } = body;

    if (!ticketId || !title) {
      return NextResponse.json({ error: 'ticketId and title are required' }, { status: 400 });
    }

    // Prüfe ob User Zugriff auf das Ticket hat
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { team: true }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    });

    // Zugriffskontrolle (nur Creator, Assigned, TeamMember oder Admin)
    const isAdmin = checkIsAdmin(user?.role);
    const isKoordinator = isKoordinatorOrHigher(user?.role);
    const isCreator = ticket.createdById === user?.id;
    const isAssigned = ticket.assignedToId === user?.id;
    const isTeamMember = ticket.teamId && ticket.teamId === user?.teamId;
    
    // Prüfe auch TeamMember-Tabelle
    let isTeamMemberViaTable = false;
    if (ticket.teamId && user?.id) {
      const membership = await prisma.teamMember.findFirst({
        where: { userId: user.id, teamId: ticket.teamId }
      });
      isTeamMemberViaTable = !!membership;
    }

    if (!isAdmin && !isCreator && !isAssigned && !isTeamMember && !isTeamMemberViaTable) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Berechtigungsprüfung für Zuweisung an andere:
    // - Admin, Projektleiter und Koordinator können an andere zuweisen
    // - Normale Mitglieder können nur sich selbst zuweisen
    let finalAssigneeId = assigneeId;
    if (assigneeId && assigneeId !== user?.id) {
      if (!isAdmin && !isKoordinator) {
        // Mitglied versucht, jemand anderem zuzuweisen -> weise sich selbst zu oder niemanden
        finalAssigneeId = user?.id || null;
      }
    }

    const subTask = await prisma.subTask.create({
      data: {
        ticketId,
        title,
        description: description || null,
        position,
        completed: false,
        dueDate: dueDate ? new Date(dueDate) : null,
        assigneeId: finalAssigneeId || null,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, emailNotifications: true }
        },
        ticket: {
          select: { id: true, title: true }
        }
      }
    });

    // E-Mail-Benachrichtigung an zugewiesenen User senden
    if (subTask.assignee && subTask.assignee.emailNotifications && finalAssigneeId) {
      try {
        await sendSubTaskAssignedEmail(
          subTask.assignee.email,
          subTask.assignee.name || subTask.assignee.email,
          subTask.title,
          subTask.ticket.title,
          subTask.ticket.id,
          session.user.name || session.user.email || 'Unbekannt',
          subTask.dueDate || undefined
        );
      } catch (error) {
        console.error('Failed to send subtask assignment email:', error);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json(subTask, { status: 201 });
  } catch (error) {
    console.error('POST /api/subtasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - SubTask aktualisieren (z.B. abhaken)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const body = await request.json();
    const { title, description, completed, status, position, dueDate, assigneeId, estimatedHours } = body;

    // Hole SubTask mit Ticket
    const subTask = await prisma.subTask.findUnique({
      where: { id },
      include: {
        ticket: {
          include: { team: true }
        }
      }
    });

    if (!subTask) {
      return NextResponse.json({ error: 'SubTask not found' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    });

    // Zugriffskontrolle
    const isAdmin = checkIsAdmin(user?.role);
    const isKoordinator = isKoordinatorOrHigher(user?.role);
    const isCreator = subTask.ticket.createdById === user?.id;
    const isAssigned = subTask.ticket.assignedToId === user?.id;
    const isTeamMember = subTask.ticket.teamId && subTask.ticket.teamId === user?.teamId;
    
    // Prüfe auch TeamMember-Tabelle
    let isTeamMemberViaTable = false;
    if (subTask.ticket.teamId && user?.id) {
      const membership = await prisma.teamMember.findFirst({
        where: { userId: user.id, teamId: subTask.ticket.teamId }
      });
      isTeamMemberViaTable = !!membership;
    }

    if (!isAdmin && !isCreator && !isAssigned && !isTeamMember && !isTeamMemberViaTable) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Berechtigungsprüfung für Zuweisung an andere:
    // - Admin, Projektleiter und Koordinator können an andere zuweisen
    // - Normale Mitglieder können nur sich selbst zuweisen
    let finalAssigneeId = assigneeId;
    if (assigneeId !== undefined && assigneeId !== user?.id && assigneeId !== null) {
      if (!isAdmin && !isKoordinator) {
        // Mitglied versucht, jemand anderem zuzuweisen -> behalte aktuelle Zuweisung
        finalAssigneeId = subTask.assigneeId;
      }
    }

    const updatedSubTask = await prisma.subTask.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description: description || null }),
        ...(completed !== undefined && { completed }),
        ...(status !== undefined && { status }),
        ...(position !== undefined && { position }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(assigneeId !== undefined && { assigneeId: finalAssigneeId || null }),
        ...(estimatedHours !== undefined && { estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null })
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return NextResponse.json(updatedSubTask);
  } catch (error) {
    console.error('PATCH /api/subtasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - SubTask löschen
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Hole SubTask mit Ticket
    const subTask = await prisma.subTask.findUnique({
      where: { id },
      include: {
        ticket: {
          include: { team: true }
        }
      }
    });

    if (!subTask) {
      return NextResponse.json({ error: 'SubTask not found' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    });

    // Zugriffskontrolle
    const isAdmin = checkIsAdmin(user?.role);
    const isCreator = subTask.ticket.createdById === user?.id;
    const isAssigned = subTask.ticket.assignedToId === user?.id;
    const isTeamMember = subTask.ticket.teamId && subTask.ticket.teamId === user?.teamId;
    
    // Prüfe auch TeamMember-Tabelle
    let isTeamMemberViaTable = false;
    if (subTask.ticket.teamId && user?.id) {
      const membership = await prisma.teamMember.findFirst({
        where: { userId: user.id, teamId: subTask.ticket.teamId }
      });
      isTeamMemberViaTable = !!membership;
    }

    if (!isAdmin && !isCreator && !isAssigned && !isTeamMember && !isTeamMemberViaTable) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.subTask.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'SubTask deleted' });
  } catch (error) {
    console.error('DELETE /api/subtasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
