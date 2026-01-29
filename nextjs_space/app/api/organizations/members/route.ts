import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { canManageOrganizations, isAdmin } from '@/lib/auth-helpers';

// GET: Benutzer abrufen (für Admin) - alle oder gefiltert
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser || !canManageOrganizations(currentUser.role)) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const withoutOrg = searchParams.get('withoutOrg') === 'true';
    const orgId = searchParams.get('orgId');
    const excludeOrgId = searchParams.get('excludeOrgId'); // NEU: User nicht in dieser Org
    const allUsers = searchParams.get('all') === 'true'; // NEU: Alle User für Hinzufügen-Dialog

    let users;
    if (withoutOrg) {
      // User ohne Organisation
      users = await prisma.user.findMany({
        where: {
          organizationId: null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          organizationId: true,
        },
        orderBy: { name: 'asc' },
      });
    } else if (orgId) {
      // User in einer bestimmten Organisation
      users = await prisma.user.findMany({
        where: {
          organizationId: orgId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          orgRole: true,
          image: true,
          organizationId: true,
        },
        orderBy: { name: 'asc' },
      });
    } else if (excludeOrgId || allUsers) {
      // NEU: Alle User die NICHT in der angegebenen Organisation sind (für Hinzufügen)
      users = await prisma.user.findMany({
        where: excludeOrgId ? {
          OR: [
            { organizationId: null },
            { organizationId: { not: excludeOrgId } },
          ],
        } : undefined,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          orgRole: true,
          organizationId: true,
          image: true,
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    } else {
      // Alle User
      users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          orgRole: true,
          organizationId: true,
          image: true,
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    }

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

// POST: User zu einem Unternehmen hinzufügen (auch von anderen Organisationen)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 });
    }

    // System-Admin oder Org-Admin kann Mitglieder hinzufügen
    const isSystemAdmin = isAdmin(currentUser.role);
    const isOrgAdmin = currentUser.orgRole === 'org_admin';
    
    if (!isSystemAdmin && !isOrgAdmin) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const { userId, organizationId, orgRole = 'member', moveFromOtherOrg = false } = await request.json();

    if (!userId || !organizationId) {
      return NextResponse.json({ error: 'User-ID und Unternehmens-ID erforderlich' }, { status: 400 });
    }

    // Prüfen ob Organisation existiert
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Unternehmen nicht gefunden' }, { status: 404 });
    }

    // System-Admin kann zu jedes Unternehmens hinzufügen
    // Org-Admin nur zu seiner eigenen Organisation
    if (!isSystemAdmin && currentUser.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Keine Berechtigung für dieses Unternehmen' }, { status: 403 });
    }

    // Prüfen ob User existiert
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
        organizationMemberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 });
    }

    // Prüfen ob User bereits in der Ziel-Organisation ist (über OrganizationMember)
    const existingMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: userId,
          organizationId: organizationId,
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json({ error: 'User ist bereits in diesem Unternehmen' }, { status: 400 });
    }

    // User zum Unternehmen hinzufügen (Multi-Org: OHNE aus anderer Org zu entfernen)
    // 1. OrganizationMember-Eintrag erstellen
    await prisma.organizationMember.create({
      data: {
        userId: userId,
        organizationId: organizationId,
        orgRole: orgRole,
      },
    });

    // 2. Wenn User noch keine primäre Organisation hat, diese setzen
    if (!targetUser.organizationId) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          organizationId: organizationId,
          orgRole: orgRole,
        },
      });
    }

    // Aktualisierte User-Daten zurückgeben
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        orgRole: true,
        role: true,
        organizationMemberships: {
          include: {
            organization: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return NextResponse.json(updatedUser, { status: 201 });
  } catch (error) {
    console.error('Error adding member:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

// PUT: Rolle eines Mitglieds ändern
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser?.organizationId) {
      return NextResponse.json({ error: 'Kein Unternehmen gefunden' }, { status: 404 });
    }

    // Nur org_admin, Admin oder Admin Organisation können Rollen ändern
    if (currentUser.orgRole !== 'org_admin' && !canManageOrganizations(currentUser.role)) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const { userId, orgRole, role } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User-ID erforderlich' }, { status: 400 });
    }

    // Prüfen ob User in der gleichen Organisation ist
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser || targetUser.organizationId !== currentUser.organizationId) {
      return NextResponse.json({ error: 'User nicht in Ihrem Unternehmen' }, { status: 404 });
    }

    // Verhindern dass der letzte org_admin degradiert wird
    if (targetUser.orgRole === 'org_admin' && orgRole !== 'org_admin') {
      const orgAdminCount = await prisma.user.count({
        where: {
          organizationId: currentUser.organizationId,
          orgRole: 'org_admin',
        },
      });

      if (orgAdminCount <= 1) {
        return NextResponse.json({ 
          error: 'Es muss mindestens ein Unternehmens-Admin vorhanden sein' 
        }, { status: 400 });
      }
    }

    const validOrgRoles = ['member', 'koordinator', 'projektleiter', 'admin_organisation', 'org_admin'];
    const validRoles = ['member', 'Mitglied', 'koordinator', 'projektleiter', 'admin_organisation', 'admin'];

    const updateData: any = {};
    
    if (orgRole && validOrgRoles.includes(orgRole)) {
      updateData.orgRole = orgRole;
      // Wenn org_admin, auch System-Rolle auf admin setzen
      if (orgRole === 'org_admin') {
        updateData.role = 'admin';
      } else if (orgRole === 'admin_organisation') {
        updateData.role = 'admin_organisation';
      } else if (orgRole === 'projektleiter') {
        updateData.role = 'projektleiter';
      } else if (orgRole === 'koordinator') {
        updateData.role = 'koordinator';
      } else {
        updateData.role = 'Mitglied';
      }
    }
    
    if (role && validRoles.includes(role)) {
      updateData.role = role;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        orgRole: true,
        role: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating member:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

// DELETE: Mitglied aus Organisation entfernen
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 });
    }

    const isSystemAdmin = isAdmin(currentUser.role);
    const isOrgAdmin = currentUser.orgRole === 'org_admin';

    if (!isSystemAdmin && !isOrgAdmin) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const organizationId = searchParams.get('organizationId');

    if (!userId) {
      return NextResponse.json({ error: 'User-ID erforderlich' }, { status: 400 });
    }

    // Sich selbst kann man nicht entfernen
    if (userId === currentUser.id) {
      return NextResponse.json({ error: 'Sie können sich nicht selbst entfernen' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 });
    }

    // System-Admin kann aus jedes Unternehmens entfernen
    // Org-Admin nur aus seiner eigenen Organisation
    if (!isSystemAdmin) {
      if (!currentUser.organizationId || targetUser.organizationId !== currentUser.organizationId) {
        return NextResponse.json({ error: 'Keine Berechtigung für dieses Unternehmen' }, { status: 403 });
      }
    } else if (organizationId && targetUser.organizationId !== organizationId) {
      return NextResponse.json({ error: 'User nicht in diesem Unternehmen' }, { status: 404 });
    }

    // User aus Organisation entfernen (nicht löschen!)
    await prisma.user.update({
      where: { id: userId },
      data: {
        organizationId: null,
        orgRole: 'member',
        teamId: null, // Auch aus Teams entfernen
      },
    });

    // TeamMember-Einträge löschen
    await prisma.teamMember.deleteMany({
      where: { userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
