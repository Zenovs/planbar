import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { sendTicketCreatedEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    // Get current user with team info
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        role: true,
        teamId: true,
      },
    });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assignedToId = searchParams.get('assignedTo');
    const teamId = searchParams.get('teamId');
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const where: any = {};

    // Team-based filtering: Admins see all tickets, members see only their team's tickets
    if (currentUser?.role !== 'admin') {
      if (currentUser?.teamId) {
        where.teamId = currentUser.teamId;
      } else {
        // User has no team - show only tickets assigned to them or created by them
        where.OR = [
          { assignedToId: currentUser?.id },
          { createdById: currentUser?.id },
        ];
      }
    } else {
      // Admin can optionally filter by teamId
      if (teamId && teamId !== 'all') {
        where.teamId = teamId;
      }
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (priority && priority !== 'all') {
      where.priority = priority;
    }

    if (assignedToId && assignedToId !== 'all') {
      where.assignedToId = assignedToId;
    }

    if (categoryId && categoryId !== 'all') {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        category: true,
        subTasks: {
          orderBy: { position: 'asc' },
        },
      },
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Tickets' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, status, priority, assignedToId, deadline, teamId, categoryId, templateId, subTasks } = body;
    
    if (!title) {
      return NextResponse.json(
        { error: 'Titel ist erforderlich' },
        { status: 400 }
      );
    }

    // Load template data if templateId is provided
    let templateData: any = null;
    if (templateId) {
      templateData = await prisma.template.findUnique({
        where: { id: templateId },
        include: {
          subTickets: {
            orderBy: { order: 'asc' },
          },
        },
      });
    }

    // If a user is assigned, automatically set the ticket's team to that user's team
    let finalTeamId = teamId;
    if (assignedToId && !finalTeamId) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: assignedToId },
        select: { teamId: true },
      });
      finalTeamId = assignedUser?.teamId || null;
    }

    // Prepare ticket data
    const ticketData: any = {
      title,
      description: description || null,
      status: status || 'open',
      priority: priority || 'medium',
      assignedToId: assignedToId || null,
      deadline: deadline ? new Date(deadline) : null,
      teamId: finalTeamId || null,
      categoryId: categoryId || null,
      createdById: session.user.id,
    };

    // Create sub-tasks from request or template
    let subTasksData = subTasks || [];
    
    // If template is provided and no sub-tasks in request, use template sub-tickets
    if (templateData && (!subTasks || subTasks.length === 0)) {
      subTasksData = templateData.subTickets || [];
    }
    
    if (subTasksData.length > 0) {
      ticketData.subTasks = {
        create: subTasksData.map((st: any, index: number) => ({
          title: st.title,
          position: index,
          completed: false,
        })),
      };
    }

    const ticket = await prisma.ticket.create({
      data: ticketData,
      include: {
        assignedTo: true,
        createdBy: true,
        team: true,
        category: true,
        subTasks: {
          orderBy: { position: 'asc' },
        },
      },
    });

    // Send email notification to assigned user
    if (ticket.assignedTo && ticket.assignedTo.emailNotifications) {
      try {
        await sendTicketCreatedEmail(
          ticket.assignedTo.email,
          ticket.assignedTo.name || ticket.assignedTo.email,
          ticket.title,
          ticket.id,
          session.user.name || session.user.email || 'Unbekannt'
        );
      } catch (error) {
        console.error('Failed to send email notification:', error);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    console.error('Error creating ticket:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Tickets' },
      { status: 500 }
    );
  }
}