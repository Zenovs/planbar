import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

// GET /api/subtasks?ticketId=xyz - Fetch all sub-tasks for a ticket
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');

    if (!ticketId) {
      return NextResponse.json({ error: 'ticketId is required' }, { status: 400 });
    }

    const subTasks = await prisma.subTask.findMany({
      where: { ticketId },
      orderBy: { position: 'asc' },
    });

    return NextResponse.json(subTasks);
  } catch (error) {
    console.error('Error fetching sub-tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/subtasks - Create a new sub-task
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ticketId, title, position } = body;

    if (!ticketId || !title) {
      return NextResponse.json({ error: 'ticketId and title are required' }, { status: 400 });
    }

    // Check if user has access to this ticket
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { createdBy: true, assignedTo: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check access rights
    const isAdmin = session.user.role === 'admin';
    const isCreator = ticket.createdById === session.user.id;
    const isAssignee = ticket.assignedToId === session.user.id;

    if (!isAdmin && !isCreator && !isAssignee) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the highest position to place new subtask at the end
    const highestPosition = await prisma.subTask.findFirst({
      where: { ticketId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const newPosition = position !== undefined ? position : (highestPosition?.position ?? -1) + 1;

    const subTask = await prisma.subTask.create({
      data: {
        ticketId,
        title,
        position: newPosition,
        completed: false,
      },
    });

    return NextResponse.json(subTask, { status: 201 });
  } catch (error) {
    console.error('Error creating sub-task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/subtasks - Update a sub-task (toggle completed or update title)
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, completed, title, position } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Get subtask with ticket to check access
    const subTask = await prisma.subTask.findUnique({
      where: { id },
      include: {
        ticket: {
          include: { createdBy: true, assignedTo: true },
        },
      },
    });

    if (!subTask) {
      return NextResponse.json({ error: 'Sub-task not found' }, { status: 404 });
    }

    // Check access rights
    const isAdmin = session.user.role === 'admin';
    const isCreator = subTask.ticket.createdById === session.user.id;
    const isAssignee = subTask.ticket.assignedToId === session.user.id;

    if (!isAdmin && !isCreator && !isAssignee) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update subtask
    const updateData: any = {};
    if (completed !== undefined) updateData.completed = completed;
    if (title !== undefined) updateData.title = title;
    if (position !== undefined) updateData.position = position;

    const updated = await prisma.subTask.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating sub-task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/subtasks?id=xyz - Delete a sub-task
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Get subtask with ticket to check access
    const subTask = await prisma.subTask.findUnique({
      where: { id },
      include: {
        ticket: {
          include: { createdBy: true, assignedTo: true },
        },
      },
    });

    if (!subTask) {
      return NextResponse.json({ error: 'Sub-task not found' }, { status: 404 });
    }

    // Check access rights
    const isAdmin = session.user.role === 'admin';
    const isCreator = subTask.ticket.createdById === session.user.id;
    const isAssignee = subTask.ticket.assignedToId === session.user.id;

    if (!isAdmin && !isCreator && !isAssignee) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.subTask.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Sub-task deleted successfully' });
  } catch (error) {
    console.error('Error deleting sub-task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
