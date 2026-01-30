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

    // Hole User mit Organisation-Memberships
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        organizationMemberships: {
          select: {
            organizationId: true,
            role: true,
          },
        },
      },
    });
    
    const userIsAdmin = isAdmin(currentUser?.role);
    const userRole = currentUser?.role?.toLowerCase() || '';
    
    // Admin Unternehmen oder Projektleiter können alle Teams ihrer Organisationen sehen
    const canManageOrgTeams = ['admin_organisation', 'org_admin', 'projektleiter'].includes(userRole);

    // Build where clause: Filter by organization first, then by role
    const whereClause: any = {};
    
    // System-Admin kann nach beliebiger Organisation filtern oder alle sehen
    if (userIsAdmin) {
      if (filterOrgId) {
        whereClause.organizationId = filterOrgId;
      }
      // Ohne Filter: alle Teams
    } else if (canManageOrgTeams) {
      // Admin Unternehmen und Projektleiter sehen alle Teams ihrer Organisationen
      const userOrgIds: string[] = [];
      
      // Primäre Organisation
      if (currentUser?.organizationId) {
        userOrgIds.push(currentUser.organizationId);
      }
      
      // Zusätzliche Organisationen durch Memberships (nur wenn dort mind. Projektleiter)
      const allowedMembershipRoles = ['admin_organisation', 'org_admin', 'projektleiter'];
      currentUser?.organizationMemberships?.forEach((m) => {
        if (allowedMembershipRoles.includes(m.role?.toLowerCase() || '')) {
          if (!userOrgIds.includes(m.organizationId)) {
            userOrgIds.push(m.organizationId);
          }
        }
      });
      
      if (userOrgIds.length > 0) {
        whereClause.organizationId = { in: userOrgIds };
      } else {
        // Fallback: nur Teams, in denen sie Mitglied sind
        whereClause.teamMembers = {
          some: {
            userId: session.user.id,
          },
        };
      }
    } else {
      // Normale User (Koordinator, Member) sehen nur Teams, in denen sie Mitglied sind
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
      include: {
        organizationMemberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!canManageTeams(user?.role)) {
      return NextResponse.json(
        { error: 'Keine Berechtigung zum Erstellen von Teams' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, description, color, organizationId } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name ist erforderlich' },
        { status: 400 }
      );
    }

    // Bestimme die Ziel-Organisation
    let targetOrgId = organizationId;
    
    // Wenn eine spezifische Organisation angegeben wurde, prüfe ob User dort berechtigt ist
    if (targetOrgId) {
      const userIsAdmin = isAdmin(user?.role);
      
      // System-Admin kann überall Teams erstellen
      if (!userIsAdmin) {
        // Prüfe ob User in der Ziel-Organisation mindestens Projektleiter ist
        const isPrimaryOrgMatch = user?.organizationId === targetOrgId;
        const membershipInOrg = user?.organizationMemberships?.find(
          (m: { organizationId: string }) => m.organizationId === targetOrgId
        );
        
        // User muss entweder primär in der Org sein oder eine Membership haben
        if (!isPrimaryOrgMatch && !membershipInOrg) {
          return NextResponse.json(
            { error: 'Keine Berechtigung für dieses Unternehmen' },
            { status: 403 }
          );
        }
      }
    } else {
      // Fallback: primäre Organisation des Users
      targetOrgId = user?.organizationId;
    }

    const team = await prisma.team.create({
      data: {
        name,
        description,
        color: color || '#3b82f6',
        ...(targetOrgId && { organizationId: targetOrgId }),
      },
      include: {
        members: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
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
