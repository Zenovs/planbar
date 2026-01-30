import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdmin, canManageTeams } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// GET: Alle Kunden abrufen
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        organizationMemberships: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 });
    }

    // Nur Admin, Admin Unternehmen und Projektleiter können Kunden sehen
    const userRole = currentUser.role?.toLowerCase() || '';
    const isSystemAdmin = isAdmin(currentUser.role);
    const canManage = canManageTeams(currentUser.role);
    
    if (!canManage) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const organizationId = searchParams.get('organizationId');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    // Sammle alle Organisations-IDs, auf die der User Zugriff hat
    const orgIds: string[] = [];
    if (currentUser.organizationId) {
      orgIds.push(currentUser.organizationId);
    }
    currentUser.organizationMemberships?.forEach((m: { organizationId: string }) => {
      if (!orgIds.includes(m.organizationId)) {
        orgIds.push(m.organizationId);
      }
    });

    // Build where clause
    const whereClause: any = {
      organizationId: organizationId ? organizationId : { in: orgIds },
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (activeOnly) {
      whereClause.isActive = true;
    }

    const customers = await prisma.customer.findMany({
      where: whereClause,
      include: {
        organization: {
          select: { id: true, name: true },
        },
        levels: {
          orderBy: { position: 'asc' },
        },
        projects: {
          include: {
            team: { select: { id: true, name: true, color: true } },
            level: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: {
            levels: true,
            projects: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ customers });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

// POST: Neuen Kunden erstellen
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        organizationMemberships: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 });
    }

    // Nur Admin, Admin Unternehmen und Projektleiter können Kunden erstellen
    if (!canManageTeams(currentUser.role)) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, phone, address, description, contactPerson, color, organizationId } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 });
    }

    // Bestimme die Organisation
    let targetOrgId = organizationId || currentUser.organizationId;
    
    if (!targetOrgId) {
      return NextResponse.json({ error: 'Keine Organisation verfügbar' }, { status: 400 });
    }

    // Prüfe Berechtigung für die Organisation
    const isSystemAdmin = isAdmin(currentUser.role);
    if (!isSystemAdmin) {
      const hasAccess = currentUser.organizationId === targetOrgId ||
        currentUser.organizationMemberships?.some((m: { organizationId: string }) => m.organizationId === targetOrgId);
      
      if (!hasAccess) {
        return NextResponse.json({ error: 'Keine Berechtigung für dieses Unternehmen' }, { status: 403 });
      }
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        phone,
        address,
        description,
        contactPerson,
        color: color || '#3b82f6',
        organizationId: targetOrgId,
      },
      include: {
        organization: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
