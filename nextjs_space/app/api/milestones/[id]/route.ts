import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Rekursive Funktion um alle abhängigen Meilensteine zu verschieben
async function shiftDependentMilestones(
  milestoneId: string, 
  daysDelta: number,
  processedIds: Set<string> = new Set()
): Promise<void> {
  // Verhindere Endlosschleifen
  if (processedIds.has(milestoneId)) return;
  processedIds.add(milestoneId);

  // Finde alle Meilensteine, die von diesem abhängen
  const dependents = await prisma.milestone.findMany({
    where: { dependsOnId: milestoneId },
  });

  for (const dependent of dependents) {
    const newDueDate = new Date(dependent.dueDate);
    newDueDate.setDate(newDueDate.getDate() + daysDelta);

    await prisma.milestone.update({
      where: { id: dependent.id },
      data: { dueDate: newDueDate },
    });

    // Rekursiv auch deren Abhängige verschieben
    await shiftDependentMilestones(dependent.id, daysDelta, processedIds);
  }
}

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
      include: {
        dependsOn: {
          select: { id: true, title: true, dueDate: true }
        },
        dependents: {
          select: { id: true, title: true, dueDate: true }
        }
      },
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
    const { title, description, dueDate, completed, color, position, responsibility, dependsOnId, cascadeShift } = body;

    // Hole aktuellen Meilenstein für Vergleich
    const currentMilestone = await prisma.milestone.findUnique({
      where: { id: params.id },
    });

    if (!currentMilestone) {
      return NextResponse.json({ error: 'Meilenstein nicht gefunden' }, { status: 404 });
    }

    // Berechne Differenz in Tagen falls cascadeShift aktiviert ist und Datum sich ändert
    let daysDelta = 0;
    if (cascadeShift && dueDate !== undefined) {
      const oldDate = new Date(currentMilestone.dueDate);
      const newDate = new Date(dueDate);
      daysDelta = Math.round((newDate.getTime() - oldDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    const milestone = await prisma.milestone.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(dueDate !== undefined && { dueDate: new Date(dueDate) }),
        ...(completed !== undefined && { completed }),
        ...(color !== undefined && { color }),
        ...(position !== undefined && { position }),
        ...(responsibility !== undefined && { responsibility }),
        ...(dependsOnId !== undefined && { dependsOnId: dependsOnId || null }),
      },
      include: {
        dependsOn: {
          select: { id: true, title: true, dueDate: true }
        },
        dependents: {
          select: { id: true, title: true, dueDate: true }
        }
      },
    });

    // Verschiebe abhängige Meilensteine wenn cascadeShift aktiviert
    if (cascadeShift && daysDelta !== 0) {
      await shiftDependentMilestones(params.id, daysDelta);
    }

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

    // Setze dependsOnId auf null für alle abhängigen Meilensteine
    await prisma.milestone.updateMany({
      where: { dependsOnId: params.id },
      data: { dependsOnId: null },
    });

    await prisma.milestone.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Löschen des Meilensteins:', error);
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}
