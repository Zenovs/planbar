import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdmin, canManageTeams } from '@/lib/auth-helpers';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// GET: Einzelnen Kunden abrufen
export async function GET(
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

    if (!currentUser) {
      return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 });
    }

    if (!canManageTeams(currentUser.role)) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        organization: { select: { id: true, name: true } },
        levels: {
          orderBy: { position: 'asc' },
          include: {
            projects: {
              orderBy: { position: 'asc' },
              include: {
                team: { select: { id: true, name: true, color: true } },
                ticket: {
                  select: {
                    id: true,
                    title: true,
                    status: true,
                    priority: true,
                  },
                },
                dependsOn: { select: { id: true, name: true } },
                dependents: { select: { id: true, name: true } },
              },
            },
          },
        },
        projects: {
          orderBy: { position: 'asc' },
          include: {
            team: { select: { id: true, name: true, color: true } },
            level: { select: { id: true, name: true, color: true } },
            ticket: {
              select: {
                id: true,
                title: true,
                status: true,
                priority: true,
              },
            },
            dependsOn: { select: { id: true, name: true } },
            dependents: { select: { id: true, name: true } },
          },
        },
      },
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

    return NextResponse.json({ customer });
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

// PUT: Kunden aktualisieren
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

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
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
    const { name, email, phone, address, description, contactPerson, color, isActive, shareEnabled } = body;

    // Generiere Share-Token wenn Sharing aktiviert wird
    let shareToken = customer.shareToken;
    if (shareEnabled && !shareToken) {
      shareToken = crypto.randomBytes(32).toString('hex');
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(description !== undefined && { description }),
        ...(contactPerson !== undefined && { contactPerson }),
        ...(color !== undefined && { color }),
        ...(isActive !== undefined && { isActive }),
        ...(shareEnabled !== undefined && { shareEnabled, shareToken }),
      },
      include: {
        organization: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ customer: updatedCustomer });
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

// DELETE: Kunden löschen
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

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
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

    await prisma.customer.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
