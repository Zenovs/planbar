import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/milestones/[id] - Einzelnen Meilenstein abrufen
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const milestone = await prisma.milestone.findUnique({
      where: { id: params.id },
    });

    if (!milestone) {
      return NextResponse.json({ error: 'Meilenstein nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json(milestone);
  } catch (error) {
    console.error('Fehler beim Abrufen des Meilensteins:', error);
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}

// PUT /api/milestones/[id] - Meilenstein aktualisieren
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, dueDate, completed, color, position } = body;

    const milestone = await prisma.milestone.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(dueDate !== undefined && { dueDate: new Date(dueDate) }),
        ...(completed !== undefined && { completed }),
        ...(color !== undefined && { color }),
        ...(position !== undefined && { position }),
      },
    });

    return NextResponse.json(milestone);
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Meilensteins:', error);
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}

// DELETE /api/milestones/[id] - Meilenstein löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    await prisma.milestone.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Löschen des Meilensteins:', error);
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}
