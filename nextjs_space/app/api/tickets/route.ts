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

    // Get user's team memberships
    const userTeamMemberships = await prisma.teamMember.findMany({
      where: { userId: session.user.id },
      select: { teamId: true },
    }).catch(() => []);
    const userTeamIds = userTeamMemberships.map((tm: any) => tm.teamId);

    // Team-based filtering: Show tickets from user's teams OR created by user
    if (currentUser?.role !== 'admin') {
      const orConditions: any[] = [
        { createdById: currentUser?.id },
        { assignedToId: currentUser?.id },
      ];
      
      // Add team filter if user has teams
      if (currentUser?.teamId) {
        orConditions.push({ teamId: currentUser.teamId });
      }
      if (userTeamIds.length > 0) {
        orConditions.push({ teamId: { in: userTeamIds } });
      }
      
      where.OR = orConditions;
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
      // Wenn bereits eine OR-Bedingung existiert (für Team-Filterung),
      // muss die Suche mit AND verknüpft werden
      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ]
          }
        ];
        delete where.OR;
      } else {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }
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
        _count: {
          select: {
            subTasks: {
              where: {
                completed: false,
              },
            },
          },
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
    const { title, description, status, priority, assignedToId, teamId, categoryId, templateId, subTasks } = body;
    
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

    // Determine team: 1) explicit teamId, 2) category's team, 3) assigned user's team
    let finalTeamId = teamId;
    
    // If category is set and has a team, use that team
    if (categoryId && !finalTeamId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { teamId: true },
      });
      finalTeamId = category?.teamId || null;
    }
    
    // If still no team and user is assigned, use their team
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
          dueDate: st.dueDate ? new Date(st.dueDate) : null,
          assigneeId: st.assigneeId || null,
          estimatedHours: st.estimatedHours || null,
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
          include: { assignee: true },
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