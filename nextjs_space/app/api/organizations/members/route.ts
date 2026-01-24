import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

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

    // Nur org_admin oder System-Admin können Rollen ändern
    if (currentUser.orgRole !== 'org_admin' && currentUser.role !== 'admin') {
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

    const validOrgRoles = ['member', 'koordinator', 'projektleiter', 'org_admin'];
    const validRoles = ['member', 'Mitglied', 'koordinator', 'projektleiter', 'admin'];

    const updateData: any = {};
    
    if (orgRole && validOrgRoles.includes(orgRole)) {
      updateData.orgRole = orgRole;
      // Wenn org_admin, auch System-Rolle auf admin setzen
      if (orgRole === 'org_admin') {
        updateData.role = 'admin';
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

    if (!currentUser?.organizationId) {
      return NextResponse.json({ error: 'Keine Organisation gefunden' }, { status: 404 });
    }

    if (currentUser.orgRole !== 'org_admin' && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

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

    if (!targetUser || targetUser.organizationId !== currentUser.organizationId) {
      return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 });
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
