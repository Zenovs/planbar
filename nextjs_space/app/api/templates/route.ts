import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

// GET - Get all templates for the user's teams
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with team and team memberships
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        teamId: true,
        role: true,
        teamMemberships: {
          select: { teamId: true }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Collect all team IDs the user belongs to
    const teamIds: string[] = [];
    if (user.teamId) {
      teamIds.push(user.teamId);
    }
    if (user.teamMemberships) {
      user.teamMemberships.forEach(tm => {
        if (!teamIds.includes(tm.teamId)) {
          teamIds.push(tm.teamId);
        }
      });
    }

    // Admins can see all templates
    const isAdmin = ['admin', 'Administrator', 'ADMIN'].includes(user.role || '');

    // If no teams and not admin, return empty array (no error)
    if (teamIds.length === 0 && !isAdmin) {
      return NextResponse.json([]);
    }

    // Get templates for the user's teams (or all for admin)
    const templates = await prisma.template.findMany({
      where: isAdmin ? {} : { teamId: { in: teamIds } },
      include: {
        subTickets: {
          orderBy: { order: 'asc' }
        },
        team: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: { subTickets: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Map subTickets to subTasks for frontend compatibility
    const templatesWithSubTasks = templates.map((template: any) => ({
      ...template,
      subTasks: template.subTickets,
      _count: { subTasks: template._count.subTickets }
    }));

    return NextResponse.json(templatesWithSubTasks);
  } catch (error) {
    console.error('GET /api/templates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with team and team memberships
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        teamId: true,
        teamMemberships: {
          select: { teamId: true },
          take: 1
        }
      }
    });

    // Get the team ID - prefer direct teamId, fall back to first membership
    let effectiveTeamId = user?.teamId;
    if (!effectiveTeamId && user?.teamMemberships?.length) {
      effectiveTeamId = user.teamMemberships[0].teamId;
    }

    if (!effectiveTeamId) {
      return NextResponse.json({ error: 'User not assigned to a team' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, subTickets = [], teamId } = body;

    // Use provided teamId if admin, otherwise use user's team
    const targetTeamId = teamId || effectiveTeamId;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    // Check if template with same name already exists for this team
    const existing = await prisma.template.findFirst({
      where: { 
        name,
        teamId: targetTeamId
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'Template with this name already exists for your team' }, { status: 409 });
    }

    // Create template with sub-tickets
    const template = await prisma.template.create({
      data: {
        name,
        description,
        teamId: targetTeamId,
        subTickets: {
          create: subTickets.map((st: { title: string; description?: string; order?: number }, index: number) => ({
            title: st.title,
            description: st.description || null,
            order: st.order !== undefined ? st.order : index
          }))
        }
      },
      include: {
        subTickets: {
          orderBy: { order: 'asc' }
        },
        team: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('POST /api/templates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
