import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { canManageOrganizations, isAdmin } from '@/lib/auth-helpers';

// GET: Alle Benutzer ohne Organisation abrufen (für Admin)
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

    // Alle User laden, optional gefiltert
    const { searchParams } = new URL(request.url);
    const withoutOrg = searchParams.get('withoutOrg') === 'true';
    const orgId = searchParams.get('orgId');

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

// POST: User zu einer Organisation hinzufügen
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

    const { userId, organizationId, orgRole = 'member' } = await request.json();

    if (!userId || !organizationId) {
      return NextResponse.json({ error: 'User-ID und Organisations-ID erforderlich' }, { status: 400 });
    }

    // Prüfen ob Organisation existiert
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organisation nicht gefunden' }, { status: 404 });
    }

    // System-Admin kann zu jeder Organisation hinzufügen
    // Org-Admin nur zu seiner eigenen Organisation
    if (!isSystemAdmin && currentUser.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Keine Berechtigung für diese Organisation' }, { status: 403 });
    }

    // Prüfen ob User existiert
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 });
    }

    // Prüfen ob User bereits in einer Organisation ist
    if (targetUser.organizationId) {
      return NextResponse.json({ error: 'User ist bereits in einer Organisation' }, { status: 400 });
    }

    // User zur Organisation hinzufügen
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        organizationId: organizationId,
        orgRole: orgRole,
      },
      select: {
        id: true,
        name: true,
        email: true,
        orgRole: true,
        role: true,
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
      return NextResponse.json({ error: 'Keine Organisation gefunden' }, { status: 404 });
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
      return NextResponse.json({ error: 'User nicht in Ihrer Organisation' }, { status: 404 });
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
          error: 'Es muss mindestens ein Organisations-Admin vorhanden sein' 
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

    // System-Admin kann aus jeder Organisation entfernen
    // Org-Admin nur aus seiner eigenen Organisation
    if (!isSystemAdmin) {
      if (!currentUser.organizationId || targetUser.organizationId !== currentUser.organizationId) {
        return NextResponse.json({ error: 'Keine Berechtigung für diese Organisation' }, { status: 403 });
      }
    } else if (organizationId && targetUser.organizationId !== organizationId) {
      return NextResponse.json({ error: 'User nicht in dieser Organisation' }, { status: 404 });
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
