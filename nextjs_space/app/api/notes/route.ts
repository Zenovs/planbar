import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

// GET /api/notes?ticketId=xxx - Alle Notizen für ein Projekt abrufen
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get('ticketId');

    if (!ticketId) {
      return NextResponse.json({ error: 'ticketId erforderlich' }, { status: 400 });
    }

    // Prüfe ob User Zugriff auf das Ticket hat
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        team: {
          include: {
            teamMembers: {
              where: { userId: session.user.id }
            }
          }
        }
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 });
    }

    // Zugriffsprüfung
    const hasAccess = 
      ticket.createdById === session.user.id ||
      ticket.assignedToId === session.user.id ||
      (ticket.team && ticket.team.teamMembers.length > 0);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Kein Zugriff' }, { status: 403 });
    }

    // Notizen abrufen
    const notes = await prisma.note.findMany({
      where: { ticketId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      },
      orderBy: {
        noteDate: 'desc'
      }
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error('Fehler beim Abrufen der Notizen:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Notizen' },
      { status: 500 }
    );
  }
}

// POST /api/notes - Neue Notiz erstellen
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const body = await req.json();
    const { ticketId, title, content, noteDate } = body;

    if (!ticketId || !title || !content) {
      return NextResponse.json(
        { error: 'ticketId, title und content sind erforderlich' },
        { status: 400 }
      );
    }

    // Prüfe ob Ticket existiert und User Zugriff hat
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        team: {
          include: {
            teamMembers: {
              where: { userId: session.user.id }
            }
          }
        }
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 });
    }

    const hasAccess = 
      ticket.createdById === session.user.id ||
      ticket.assignedToId === session.user.id ||
      (ticket.team && ticket.team.teamMembers.length > 0);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Kein Zugriff' }, { status: 403 });
    }

    // Notiz erstellen
    const note = await prisma.note.create({
      data: {
        title,
        content,
        noteDate: noteDate ? new Date(noteDate) : new Date(),
        ticketId,
        authorId: session.user.id
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error('Fehler beim Erstellen der Notiz:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen der Notiz' },
      { status: 500 }
    );
  }
}
