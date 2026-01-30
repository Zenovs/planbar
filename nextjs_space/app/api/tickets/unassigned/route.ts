import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: Alle Tickets ohne Kundenzuordnung laden
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    // Get current user with organization memberships
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        role: true,
        organizationId: true,
        organizationMemberships: {
          select: {
            organizationId: true,
            orgRole: true,
          },
        },
      },
    });

    const userRole = currentUser?.role?.toLowerCase() || '';
    const isSystemAdmin = userRole === 'admin';
    
    // System-Admins haben keinen Zugriff auf Projektdetails
    if (isSystemAdmin) {
      return NextResponse.json({ tickets: [] });
    }

    // Berechtigungsprüfung: Admin Unternehmen oder Projektleiter
    const allowedRoles = ['admin_organisation', 'org_admin', 'projektleiter'];
    const isAdminUnternehmen = ['admin_organisation', 'org_admin'].includes(userRole);
    const isProjektleiter = userRole === 'projektleiter';
    const hasOrgAdminRole = currentUser?.organizationMemberships?.some(
      (m: { orgRole: string | null }) => allowedRoles.includes(m.orgRole?.toLowerCase() || '')
    ) || false;

    if (!isAdminUnternehmen && !isProjektleiter && !hasOrgAdminRole) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    // Sammle alle Organisations-IDs des Users
    const userOrgIds: string[] = [];
    if (currentUser?.organizationId) {
      userOrgIds.push(currentUser.organizationId);
    }
    currentUser?.organizationMemberships?.forEach((m: { organizationId: string; orgRole: string | null }) => {
      if (allowedRoles.includes(m.orgRole?.toLowerCase() || '')) {
        if (!userOrgIds.includes(m.organizationId)) {
          userOrgIds.push(m.organizationId);
        }
      }
    });

    // Hole alle Team-IDs der Organisationen des Users
    const orgTeams = await prisma.team.findMany({
      where: { organizationId: { in: userOrgIds } },
      select: { id: true },
    });
    const orgTeamIds = orgTeams.map(t => t.id);

    // Finde Tickets ohne CustomerProject-Verknüpfung, die den Teams des Users zugeordnet sind
    const tickets = await prisma.ticket.findMany({
      where: {
        customerProject: null,
        OR: [
          { teamId: { in: orgTeamIds } },
          { teamId: null, createdById: session.user.id },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        createdAt: true,
        team: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('Error fetching unassigned tickets:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Tickets' },
      { status: 500 }
    );
  }
}
