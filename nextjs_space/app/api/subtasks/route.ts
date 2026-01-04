import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

// GET /api/subtasks?ticketId=123
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');

    if (!ticketId) {
      return NextResponse.json({ error: 'TicketId erforderlich' }, { status: 400 });
    }

    const subtasks = await prisma.subTask.findMany({
      where: { ticketId },
      orderBy: { position: 'asc' },
    });

    return NextResponse.json(subtasks);
  } catch (error) {
    console.error('Fehler beim Laden der SubTasks:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der SubTasks' }, { status: 500 });
  }
}

// POST /api/subtasks
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const body = await request.json();
    const { ticketId, title, position } = body;

    if (!ticketId || !title) {
      return NextResponse.json({ error: 'TicketId und Titel erforderlich' }, { status: 400 });
    }

    const subtask = await prisma.subTask.create({
      data: {
        ticketId,
        title,
        position: position ?? 0,
        completed: false,
      },
    });

    return NextResponse.json(subtask, { status: 201 });
  } catch (error) {
    console.error('Fehler beim Erstellen der SubTask:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen der SubTask' }, { status: 500 });
  }
}

// PATCH /api/subtasks?id=123
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'SubTask-ID erforderlich' }, { status: 400 });
    }

    const body = await request.json();
    const { title, completed, position } = body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (completed !== undefined) updateData.completed = completed;
    if (position !== undefined) updateData.position = position;

    const subtask = await prisma.subTask.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(subtask);
  } catch (error) {
    console.error('Fehler beim Aktualisieren der SubTask:', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren der SubTask' }, { status: 500 });
  }
}

// DELETE /api/subtasks?id=123
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'SubTask-ID erforderlich' }, { status: 400 });
    }

    await prisma.subTask.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Löschen der SubTask:', error);
    return NextResponse.json({ error: 'Fehler beim Löschen der SubTask' }, { status: 500 });
  }
}