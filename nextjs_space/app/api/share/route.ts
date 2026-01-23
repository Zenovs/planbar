import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { randomBytes } from 'crypto';

// POST - Share-Link generieren oder deaktivieren
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ticketId, enabled } = body;

    if (!ticketId) {
      return NextResponse.json({ error: 'ticketId is required' }, { status: 400 });
    }

    // Hole Ticket
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { team: true }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    });

    // Zugriffskontrolle (nur Creator, Assigned oder Admin)
    const isAdmin = user?.role === 'admin';
    const isCreator = ticket.createdById === user?.id;
    const isAssigned = ticket.assignedToId === user?.id;
    const isTeamMember = ticket.teamId && ticket.teamId === user?.teamId;

    if (!isAdmin && !isCreator && !isAssigned && !isTeamMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Wenn enabled === false, deaktiviere den Link
    if (enabled === false) {
      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: { shareEnabled: false }
      });
      return NextResponse.json({ 
        shareEnabled: false,
        shareToken: updatedTicket.shareToken 
      });
    }

    // Wenn kein Token existiert, erstelle einen neuen
    let shareToken = ticket.shareToken;
    if (!shareToken) {
      shareToken = randomBytes(16).toString('hex');
    }

    // Aktiviere den Share-Link
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        shareToken,
        shareEnabled: true
      }
    });

    return NextResponse.json({
      shareEnabled: true,
      shareToken: updatedTicket.shareToken,
      shareUrl: `${process.env.NEXTAUTH_URL || 'https://planbar-one.vercel.app'}/share/${updatedTicket.shareToken}`
    });
  } catch (error) {
    console.error('POST /api/share error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Öffentliches Ticket laden (ohne Auth)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'token is required' }, { status: 400 });
    }

    // Finde Ticket mit diesem Token
    const ticket = await prisma.ticket.findUnique({
      where: { shareToken: token },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },

        subTasks: {
          orderBy: { position: 'asc' }
        }
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found or link expired' }, { status: 404 });
    }

    // Prüfe ob Share aktiviert ist
    if (!ticket.shareEnabled) {
      return NextResponse.json({ error: 'Share link is disabled' }, { status: 403 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error('GET /api/share error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
