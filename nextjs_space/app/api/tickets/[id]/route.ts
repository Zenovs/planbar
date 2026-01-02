import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

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
    const { title, description, status, priority, assignedToId, deadline } = body;

    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
    if (deadline !== undefined) {
      updateData.deadline = deadline ? new Date(deadline) : null;
    }

    const ticket = await prisma.ticket.update({
      where: { id: params.id },
      data: updateData,
      include: {
        assignedTo: true,
        createdBy: true,
      },
    });

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
