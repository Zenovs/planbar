import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/milestones?ticketId=xxx - Alle Meilensteine für ein Projekt
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');

    if (!ticketId) {
      return NextResponse.json({ error: 'ticketId ist erforderlich' }, { status: 400 });
    }

    const milestones = await prisma.milestone.findMany({
      where: { ticketId },
      include: {
        dependsOn: {
          select: { id: true, title: true, dueDate: true }
        },
        dependents: {
          select: { id: true, title: true, dueDate: true }
        }
      },
      orderBy: [{ dueDate: 'asc' }, { position: 'asc' }],
    });

    return NextResponse.json(milestones);
  } catch (error) {
    console.error('Fehler beim Abrufen der Meilensteine:', error);
    return NextResponse.json({ error: 'Fehler beim Abrufen der Meilensteine' }, { status: 500 });
  }
}

// POST /api/milestones - Neuen Meilenstein erstellen
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const body = await request.json();
    const { ticketId, title, description, dueDate, color, responsibility, dependsOnId } = body;

    if (!ticketId || !title || !dueDate) {
      return NextResponse.json({ error: 'ticketId, title und dueDate sind erforderlich' }, { status: 400 });
    }

    // Position für neuen Meilenstein ermitteln
    const lastMilestone = await prisma.milestone.findFirst({
      where: { ticketId },
      orderBy: { position: 'desc' },
    });

    const milestone = await prisma.milestone.create({
      data: {
        ticketId,
        title,
        description: description || null,
        dueDate: new Date(dueDate),
        color: color || 'gray',
        responsibility: responsibility || null,
        dependsOnId: dependsOnId || null,
        position: (lastMilestone?.position || 0) + 1,
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

    return NextResponse.json(milestone, { status: 201 });
  } catch (error) {
    console.error('Fehler beim Erstellen des Meilensteins:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen des Meilensteins' }, { status: 500 });
  }
}
