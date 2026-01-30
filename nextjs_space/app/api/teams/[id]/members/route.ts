import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { canManageTeams, isAdmin } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// Add or remove members from a team
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    // Get user with organization memberships
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        organizationMemberships: {
          select: {
            organizationId: true,
            orgRole: true,
          },
        },
      },
    });

    // Get the team to check organization
    const team = await prisma.team.findUnique({
      where: { id: params.id },
      select: { id: true, organizationId: true },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team nicht gefunden' }, { status: 404 });
    }

    // Check if user can manage this team's members
    // System admins can manage all teams
    const isSystemAdmin = isAdmin(user?.role);
    
    // Check if user has admin_organisation or projektleiter role for this team's organization
    let canManageThisTeam = isSystemAdmin;
    
    if (!canManageThisTeam && team.organizationId) {
      // Check user's primary organization
      if (user?.organizationId === team.organizationId && canManageTeams(user?.role)) {
        canManageThisTeam = true;
      }
      
      // Check organization memberships
      if (!canManageThisTeam && user?.organizationMemberships) {
        const membership = user.organizationMemberships.find(
          m => m.organizationId === team.organizationId
        );
        if (membership) {
          const orgRole = membership.orgRole?.toLowerCase() || '';
          // Allow if user has admin_organisation or projektleiter role in this org
          if (['admin_organisation', 'org_admin', 'projektleiter'].includes(orgRole)) {
            canManageThisTeam = true;
          }
        }
      }
    }

    if (!canManageThisTeam) {
      return NextResponse.json(
        { error: 'Keine Berechtigung zum Verwalten von Teammitgliedern' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { userId, action } = body;

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'userId und action sind erforderlich' },
        { status: 400 }
      );
    }

    if (action === 'add') {
      // Add user to team
      await prisma.user.update({
        where: { id: userId },
        data: {
          teamId: params.id,
        },
      });
    } else if (action === 'remove') {
      // Remove user from team
      await prisma.user.update({
        where: { id: userId },
        data: {
          teamId: null,
        },
      });
    } else {
      return NextResponse.json(
        { error: 'Ungültige Aktion. Erlaubt: add, remove' },
        { status: 400 }
      );
    }

    // Return updated team
    const updatedTeam = await prisma.team.findUnique({
      where: { id: params.id },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        _count: {
          select: {
            tickets: true,
          },
        },
      },
    });

    return NextResponse.json({ team: updatedTeam });
  } catch (error) {
    console.error('Error managing team members:', error);
    return NextResponse.json(
      { error: 'Fehler beim Verwalten der Teammitglieder' },
      { status: 500 }
    );
  }
}
