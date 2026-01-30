import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { isAdmin, canManageTeams } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// GET: Hole die Kundenzuweisung für ein Ticket
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const customerProject = await prisma.customerProject.findUnique({
      where: { ticketId: params.id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        level: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json({ customerProject });
  } catch (error) {
    console.error('Error fetching customer assignment:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Kundenzuweisung' },
      { status: 500 }
    );
  }
}

// POST: Weise ein Ticket einem Kunden zu (erstellt CustomerProject)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    // Nur Admin, Admin Unternehmen oder Projektleiter dürfen zuweisen
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { organizationMemberships: true },
    });

    const userRole = user?.role?.toLowerCase() || '';
    const canAssign = isAdmin(userRole) || canManageTeams(userRole);

    if (!canAssign) {
      return NextResponse.json(
        { error: 'Keine Berechtigung für Kundenzuweisung' },
        { status: 403 }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json(
        { error: 'Ungültiges Request-Format' },
        { status: 400 }
      );
    }
    
    const { customerId, levelId, startDate, endDate } = body;
    console.log('Customer assignment request:', { customerId, levelId, startDate, endDate });

    if (!customerId) {
      return NextResponse.json(
        { error: 'Kunde ist erforderlich' },
        { status: 400 }
      );
    }

    // Prüfe ob das Ticket existiert
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      select: { id: true, title: true, teamId: true },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket nicht gefunden' },
        { status: 404 }
      );
    }

    // Prüfe ob bereits eine Zuweisung existiert
    const existingAssignment = await prisma.customerProject.findUnique({
      where: { ticketId: params.id },
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Ticket ist bereits einem Kunden zugewiesen. Bitte entfernen Sie zuerst die bestehende Zuweisung.' },
        { status: 400 }
      );
    }

    // Prüfe ob der Kunde existiert
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, color: true },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Kunde nicht gefunden' },
        { status: 404 }
      );
    }

    // Erstelle CustomerProject
    const customerProject = await prisma.customerProject.create({
      data: {
        name: ticket.title,
        customerId,
        levelId: levelId || null,
        ticketId: params.id,
        teamId: ticket.teamId,
        color: customer.color,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isExternal: false,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        level: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json({ customerProject }, { status: 201 });
  } catch (error) {
    console.error('Error creating customer assignment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { error: `Fehler beim Erstellen der Kundenzuweisung: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// PATCH: Aktualisiere die Kundenzuweisung (z.B. Level ändern)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    const userRole = user?.role?.toLowerCase() || '';
    const canUpdate = isAdmin(userRole) || canManageTeams(userRole);

    if (!canUpdate) {
      return NextResponse.json(
        { error: 'Keine Berechtigung für Kundenzuweisung' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { levelId, startDate, endDate } = body;

    // Finde die bestehende Zuweisung
    const existingAssignment = await prisma.customerProject.findUnique({
      where: { ticketId: params.id },
    });

    if (!existingAssignment) {
      return NextResponse.json(
        { error: 'Keine Kundenzuweisung gefunden' },
        { status: 404 }
      );
    }

    // Aktualisiere
    const updateData: Record<string, unknown> = {};
    if (levelId !== undefined) updateData.levelId = levelId || null;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;

    const customerProject = await prisma.customerProject.update({
      where: { ticketId: params.id },
      data: updateData,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        level: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json({ customerProject });
  } catch (error) {
    console.error('Error updating customer assignment:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren der Kundenzuweisung' },
      { status: 500 }
    );
  }
}

// DELETE: Entferne die Kundenzuweisung
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    const userRole = user?.role?.toLowerCase() || '';
    const canDelete = isAdmin(userRole) || canManageTeams(userRole);

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Keine Berechtigung zum Entfernen der Kundenzuweisung' },
        { status: 403 }
      );
    }

    // Prüfe ob Zuweisung existiert
    const existingAssignment = await prisma.customerProject.findUnique({
      where: { ticketId: params.id },
    });

    if (!existingAssignment) {
      return NextResponse.json(
        { error: 'Keine Kundenzuweisung gefunden' },
        { status: 404 }
      );
    }

    await prisma.customerProject.delete({
      where: { ticketId: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting customer assignment:', error);
    return NextResponse.json(
      { error: 'Fehler beim Entfernen der Kundenzuweisung' },
      { status: 500 }
    );
  }
}
