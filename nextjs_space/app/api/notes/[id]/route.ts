import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

// PATCH /api/notes/[id] - Notiz aktualisieren
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const noteId = params.id;
    const body = await req.json();
    const { title, content, noteDate } = body;

    // Notiz abrufen
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: {
        ticket: {
          include: {
            team: {
              include: {
                teamMembers: {
                  where: { userId: session.user.id }
                }
              }
            }
          }
        }
      }
    });

    if (!note) {
      return NextResponse.json({ error: 'Notiz nicht gefunden' }, { status: 404 });
    }

    // Zugriffsprüfung: Nur Autor oder Team-Mitglieder können bearbeiten
    const hasAccess = 
      note.authorId === session.user.id ||
      note.ticket.createdById === session.user.id ||
      note.ticket.assignedToId === session.user.id ||
      (note.ticket.team && note.ticket.team.teamMembers.length > 0);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Kein Zugriff' }, { status: 403 });
    }

    // Notiz aktualisieren
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (noteDate !== undefined) updateData.noteDate = new Date(noteDate);

    const updatedNote = await prisma.note.update({
      where: { id: noteId },
      data: updateData,
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

    return NextResponse.json(updatedNote);
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Notiz:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren der Notiz' },
      { status: 500 }
    );
  }
}

// DELETE /api/notes/[id] - Notiz löschen
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const noteId = params.id;

    // Notiz abrufen
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: {
        ticket: {
          include: {
            team: {
              include: {
                teamMembers: {
                  where: { userId: session.user.id }
                }
              }
            }
          }
        }
      }
    });

    if (!note) {
      return NextResponse.json({ error: 'Notiz nicht gefunden' }, { status: 404 });
    }

    // Zugriffsprüfung: Nur Autor oder Projekt-Ersteller können löschen
    const canDelete = 
      note.authorId === session.user.id ||
      note.ticket.createdById === session.user.id;

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Nur der Autor oder Projektersteller kann diese Notiz löschen' },
        { status: 403 }
      );
    }

    // Notiz löschen
    await prisma.note.delete({
      where: { id: noteId }
    });

    return NextResponse.json({ message: 'Notiz gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen der Notiz:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen der Notiz' },
      { status: 500 }
    );
  }
}
