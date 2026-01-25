import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { canManageTeams, isAdmin } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filterOrgId = searchParams.get('organizationId');

    // Check if user is admin - only admins see all teams
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    const userIsAdmin = isAdmin(currentUser?.role);

    // Build where clause: Filter by organization first, then by role
    const whereClause: any = {};
    
    // Admin kann nach beliebiger Organisation filtern
    if (userIsAdmin && filterOrgId) {
      whereClause.organizationId = filterOrgId;
    } else if (!userIsAdmin) {
      // Normaler User sieht nur Teams, in denen er Mitglied ist (über alle Organisationen hinweg)
      whereClause.teamMembers = {
        some: {
          userId: session.user.id,
        },
      };
    }

    const teams = await prisma.team.findMany({
      where: whereClause,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        teamMembers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        _count: {
          select: {
            tickets: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ teams });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Teams' },
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

    // Check if user can manage teams (admin or projektleiter)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!canManageTeams(user?.role)) {
      return NextResponse.json(
        { error: 'Keine Berechtigung zum Erstellen von Teams' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, description, color } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name ist erforderlich' },
        { status: 400 }
      );
    }

    const team = await prisma.team.create({
      data: {
        name,
        description,
        color: color || '#3b82f6',
        // Team automatisch der Organisation des Users zuordnen
        ...(user?.organizationId && { organizationId: user.organizationId }),
      },
      include: {
        members: true,
        _count: {
          select: {
            tickets: true,
          },
        },
      },
    });

    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Teams' },
      { status: 500 }
    );
  }
}
