import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// PATCH /api/subtasks/[id] - Update subtask
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { completed, title, dueDate, estimatedHours, assigneeId } = body;

    // Check if subtask exists and user has access
    const existingSubTask = await prisma.subTask.findUnique({
      where: { id },
      include: {
        ticket: true,
      },
    });

    if (!existingSubTask) {
      return NextResponse.json({ error: 'Subtask nicht gefunden' }, { status: 404 });
    }

    // Check permissions: user must be creator, assignee, or assigned to the ticket
    const hasAccess =
      existingSubTask.ticket.createdById === session.user.id ||
      existingSubTask.ticket.assignedToId === session.user.id ||
      existingSubTask.assigneeId === session.user.id;

    if (!hasAccess) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    // Update subtask
    const updateData: any = {};
    if (completed !== undefined) updateData.completed = completed;
    if (title !== undefined) updateData.title = title;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId;

    const updatedSubTask = await prisma.subTask.update({
      where: { id },
      data: updateData,
      include: {
        ticket: true,
        assignee: true,
      },
    });

    return NextResponse.json({ subtask: updatedSubTask });
  } catch (error) {
    console.error('Error updating subtask:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Subtasks' },
      { status: 500 }
    );
  }
}

// DELETE /api/subtasks/[id] - Delete subtask
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { id } = params;

    // Check if subtask exists and user has access
    const existingSubTask = await prisma.subTask.findUnique({
      where: { id },
      include: {
        ticket: true,
      },
    });

    if (!existingSubTask) {
      return NextResponse.json({ error: 'Subtask nicht gefunden' }, { status: 404 });
    }

    // Check permissions: only creator of the ticket can delete subtasks
    if (existingSubTask.ticket.createdById !== session.user.id) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    await prisma.subTask.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Subtask gelöscht' });
  } catch (error) {
    console.error('Error deleting subtask:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Subtasks' },
      { status: 500 }
    );
  }
}
