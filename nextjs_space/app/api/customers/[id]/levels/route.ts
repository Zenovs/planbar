import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdmin, canManageTeams } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// POST: Neues Level erstellen
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { organizationMemberships: true },
    });

    if (!currentUser || !canManageTeams(currentUser.role)) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: { levels: true },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Kunde nicht gefunden' }, { status: 404 });
    }

    // Prüfe Zugriffsberechtigung
    const isSystemAdmin = isAdmin(currentUser.role);
    if (!isSystemAdmin) {
      const hasAccess = currentUser.organizationId === customer.organizationId ||
        currentUser.organizationMemberships?.some((m: { organizationId: string }) => m.organizationId === customer.organizationId);
      
      if (!hasAccess) {
        return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
      }
    }

    const body = await request.json();
    const { name, description, color } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 });
    }

    // Position automatisch setzen
    const maxPosition = customer.levels.length > 0
      ? Math.max(...customer.levels.map(l => l.position))
      : -1;

    const level = await prisma.customerLevel.create({
      data: {
        name,
        description,
        color: color || '#6366f1',
        position: maxPosition + 1,
        customerId: params.id,
      },
    });

    return NextResponse.json({ level }, { status: 201 });
  } catch (error) {
    console.error('Error creating level:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

// PUT: Level aktualisieren
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { organizationMemberships: true },
    });

    if (!currentUser || !canManageTeams(currentUser.role)) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const body = await request.json();
    const { levelId, name, description, color, position } = body;

    if (!levelId) {
      return NextResponse.json({ error: 'Level-ID erforderlich' }, { status: 400 });
    }

    const level = await prisma.customerLevel.findUnique({
      where: { id: levelId },
      include: { customer: true },
    });

    if (!level || level.customerId !== params.id) {
      return NextResponse.json({ error: 'Level nicht gefunden' }, { status: 404 });
    }

    // Prüfe Zugriffsberechtigung
    const isSystemAdmin = isAdmin(currentUser.role);
    if (!isSystemAdmin) {
      const hasAccess = currentUser.organizationId === level.customer.organizationId ||
        currentUser.organizationMemberships?.some((m: { organizationId: string }) => m.organizationId === level.customer.organizationId);
      
      if (!hasAccess) {
        return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
      }
    }

    const updatedLevel = await prisma.customerLevel.update({
      where: { id: levelId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(color !== undefined && { color }),
        ...(position !== undefined && { position }),
      },
    });

    return NextResponse.json({ level: updatedLevel });
  } catch (error) {
    console.error('Error updating level:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

// DELETE: Level löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { organizationMemberships: true },
    });

    if (!currentUser || !canManageTeams(currentUser.role)) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const levelId = searchParams.get('levelId');

    if (!levelId) {
      return NextResponse.json({ error: 'Level-ID erforderlich' }, { status: 400 });
    }

    const level = await prisma.customerLevel.findUnique({
      where: { id: levelId },
      include: { customer: true },
    });

    if (!level || level.customerId !== params.id) {
      return NextResponse.json({ error: 'Level nicht gefunden' }, { status: 404 });
    }

    // Prüfe Zugriffsberechtigung
    const isSystemAdmin = isAdmin(currentUser.role);
    if (!isSystemAdmin) {
      const hasAccess = currentUser.organizationId === level.customer.organizationId ||
        currentUser.organizationMemberships?.some((m: { organizationId: string }) => m.organizationId === level.customer.organizationId);
      
      if (!hasAccess) {
        return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
      }
    }

    await prisma.customerLevel.delete({
      where: { id: levelId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting level:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
