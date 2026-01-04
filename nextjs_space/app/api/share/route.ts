import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { randomBytes } from 'crypto';

// POST /api/share - Generate share token for a ticket
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const body = await request.json();
    const { ticketId, enabled } = body;

    if (!ticketId) {
      return NextResponse.json({ error: 'TicketId erforderlich' }, { status: 400 });
    }

    // Check if ticket exists and user has access
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 });
    }

    // Only admin, creator, or assignee can share
    const isAdmin = session.user.role === 'admin';
    const isCreator = ticket.createdById === session.user.id;
    const isAssignee = ticket.assignedToId === session.user.id;

    if (!isAdmin && !isCreator && !isAssignee) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    // Generate new token if needed
    let shareToken = ticket.shareToken;
    if (!shareToken || enabled) {
      shareToken = randomBytes(32).toString('hex');
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        shareToken,
        shareEnabled: enabled ?? true,
      },
    });

    return NextResponse.json({
      shareToken: updatedTicket.shareToken,
      shareEnabled: updatedTicket.shareEnabled,
      shareUrl: `${process.env.NEXTAUTH_URL}/share/${updatedTicket.shareToken}`,
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Share-Links:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen des Share-Links' }, { status: 500 });
  }
}

// GET /api/share?token=xyz - Get public ticket details
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token erforderlich' }, { status: 400 });
    }

    const ticket = await prisma.ticket.findFirst({
      where: {
        shareToken: token,
        shareEnabled: true,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        category: true,
        subTasks: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket nicht gefunden oder Link deaktiviert' }, { status: 404 });
    }

    // Calculate progress
    const progress = ticket.subTasks.length > 0
      ? Math.round((ticket.subTasks.filter(st => st.completed).length / ticket.subTasks.length) * 100)
      : 0;

    return NextResponse.json({ ...ticket, progress });
  } catch (error) {
    console.error('Fehler beim Laden des öffentlichen Tickets:', error);
    return NextResponse.json({ error: 'Fehler beim Laden des Tickets' }, { status: 500 });
  }
}