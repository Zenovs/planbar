import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { randomBytes } from 'crypto';

// POST /api/share - Generate or disable share token for a ticket
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ticketId, enable } = body;

    if (!ticketId) {
      return NextResponse.json({ error: 'ticketId is required' }, { status: 400 });
    }

    // Check if user has access to this ticket
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { createdBy: true, assignedTo: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check access rights
    const isAdmin = session.user.role === 'admin';
    const isCreator = ticket.createdById === session.user.id;
    const isAssignee = ticket.assignedToId === session.user.id;

    if (!isAdmin && !isCreator && !isAssignee) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Enable or disable sharing
    let shareToken = ticket.shareToken;
    
    if (enable) {
      // Generate a new token if one doesn't exist
      if (!shareToken) {
        shareToken = randomBytes(32).toString('base64url');
      }
      
      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          shareToken,
          shareEnabled: true,
        },
      });

      return NextResponse.json({
        shareToken: updatedTicket.shareToken,
        shareEnabled: true,
        shareUrl: `${process.env.NEXTAUTH_URL}/share/${updatedTicket.shareToken}`,
      });
    } else {
      // Disable sharing but keep the token
      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          shareEnabled: false,
        },
      });

      return NextResponse.json({
        shareEnabled: false,
        message: 'Sharing disabled',
      });
    }
  } catch (error) {
    console.error('Error managing share token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/share?token=xyz - Fetch public ticket data (no auth required)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'token is required' }, { status: 400 });
    }

    const ticket = await prisma.ticket.findFirst({
      where: {
        shareToken: token,
        shareEnabled: true,
      },
      include: {
        category: true,
        assignedTo: {
          select: {
            name: true,
            email: true,
          },
        },
        subTasks: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found or sharing is disabled' }, { status: 404 });
    }

    // Calculate progress
    const totalSubTasks = ticket.subTasks.length;
    const completedSubTasks = ticket.subTasks.filter(st => st.completed).length;
    const progress = totalSubTasks > 0 ? Math.round((completedSubTasks / totalSubTasks) * 100) : 0;

    return NextResponse.json({
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      deadline: ticket.deadline,
      category: ticket.category,
      assignedTo: ticket.assignedTo,
      subTasks: ticket.subTasks.map(st => ({
        id: st.id,
        title: st.title,
        completed: st.completed,
      })),
      progress,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching public ticket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
