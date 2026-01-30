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

    // Get current user with team info and organization memberships
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        role: true,
        teamId: true,
        organizationId: true,
        organizationMemberships: {
          select: {
            organizationId: true,
            orgRole: true,
          },
        },
      },
    });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assignedToId = searchParams.get('assignedTo');
    const projectManagerId = searchParams.get('projectManagerId');
    const teamId = searchParams.get('teamId');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const where: Record<string, unknown> = {};

    // Get user's team memberships
    const userTeamMemberships = await prisma.teamMember.findMany({
      where: { userId: session.user.id },
      select: { teamId: true },
    }).catch(() => []);
    const userTeamIds = userTeamMemberships.map((tm: { teamId: string }) => tm.teamId);

    // Role-based filtering
    const userRole = currentUser?.role?.toLowerCase() || '';
    const isSystemAdmin = userRole === 'admin';
    
    // Aus Datenschutzgründen sehen System-Admins keine Projekt-/Ticket-Details
    if (isSystemAdmin) {
      return NextResponse.json({ tickets: [], message: 'Admins haben aus Datenschutzgründen keinen Zugriff auf Projektdetails' });
    }

    // Prüfe ob User als Admin Unternehmen oder Projektleiter in mind. einer Organisation ist
    const allowedMembershipRoles = ['admin_organisation', 'org_admin', 'projektleiter'];
    const isAdminUnternehmen = ['admin_organisation', 'org_admin'].includes(userRole);
    const isProjektleiter = userRole === 'projektleiter';
    
    // Prüfe auch orgRole aus OrganizationMemberships
    const hasOrgAdminRole = currentUser?.organizationMemberships?.some(
      (m: { orgRole: string | null }) => allowedMembershipRoles.includes(m.orgRole?.toLowerCase() || '')
    ) || false;

    // Admin Unternehmen und Projektleiter können alle Tickets ihrer Organisationen sehen
    const canSeeOrgTickets = isAdminUnternehmen || isProjektleiter || hasOrgAdminRole;

    // Sammle alle Organisations-IDs des Users (für Berechtigte Rollen)
    const userOrgIds: string[] = [];
    
    // Wenn User eine berechtigte Rolle hat, füge primäre Organisation hinzu
    if (canSeeOrgTickets && currentUser?.organizationId) {
      userOrgIds.push(currentUser.organizationId);
    }
    
    // Zusätzliche Organisationen durch Memberships (nur wenn dort mind. Projektleiter)
    currentUser?.organizationMemberships?.forEach((m: { organizationId: string; orgRole: string | null }) => {
      if (allowedMembershipRoles.includes(m.orgRole?.toLowerCase() || '')) {
        if (!userOrgIds.includes(m.organizationId)) {
          userOrgIds.push(m.organizationId);
        }
      }
    });

    // Hole alle Team-IDs der Organisationen des Users (für Projektleiter/Admin Unternehmen)
    let orgTeamIds: string[] = [];
    if (canSeeOrgTickets && userOrgIds.length > 0) {
      const orgTeams = await prisma.team.findMany({
        where: { organizationId: { in: userOrgIds } },
        select: { id: true },
      });
      orgTeamIds = orgTeams.map(t => t.id);
    }
    
    // Wenn ein spezifisches Team gefiltert wird
    if (teamId && teamId !== 'all') {
      // Projektleiter/Admin Unternehmen können alle Teams ihrer Organisation filtern
      if (canSeeOrgTickets && orgTeamIds.includes(teamId)) {
        where.teamId = teamId;
      } else {
        // Normale User: nur wenn sie Mitglied sind
        const isMember = userTeamIds.includes(teamId) || currentUser?.teamId === teamId;
        if (isMember) {
          where.teamId = teamId;
        } else {
          // User ist nicht Mitglied des Teams - zeige keine Tickets
          where.id = 'none';
        }
      }
    } else {
      // Ohne Team-Filter
      if (canSeeOrgTickets && orgTeamIds.length > 0) {
        // Projektleiter/Admin Unternehmen: Zeige alle Tickets ihrer Organisation
        const orConditions: Record<string, unknown>[] = [
          { createdById: currentUser?.id },
          { assignedToId: currentUser?.id },
          { teamId: { in: orgTeamIds } },
        ];
        where.OR = orConditions;
      } else {
        // Normale User: Zeige Tickets des Users oder seiner Teams
        const orConditions: Record<string, unknown>[] = [
          { createdById: currentUser?.id },
          { assignedToId: currentUser?.id },
        ];
        
        if (currentUser?.teamId) {
          orConditions.push({ teamId: currentUser.teamId });
        }
        if (userTeamIds.length > 0) {
          orConditions.push({ teamId: { in: userTeamIds } });
        }
        
        where.OR = orConditions;
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

    if (projectManagerId && projectManagerId !== 'all') {
      where.projectManagerId = projectManagerId;
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
        projectManager: {
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
        subTasks: {
          select: {
            id: true,
            completed: true,
            estimatedHours: true,
          },
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
    const { title, description, status, priority, assignedToId, projectManagerId, teamId, templateId, subTasks, estimatedHours, mocoProjectId } = body;
    
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

    // Determine team: 1) explicit teamId, 2) assigned user's team
    let finalTeamId = teamId;
    
    // If no team and user is assigned, use their team
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
      projectManagerId: projectManagerId || null,
      teamId: finalTeamId || null,
      createdById: session.user.id,
      estimatedHours: estimatedHours || null,
      mocoProjectId: mocoProjectId || null,
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
          description: st.description || null,
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
        subTasks: {
          select: {
            id: true,
            completed: true,
            estimatedHours: true,
            title: true,
            description: true,
            dueDate: true,
            position: true,
            assigneeId: true,
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
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