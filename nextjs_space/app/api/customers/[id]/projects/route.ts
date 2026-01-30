import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdmin, canManageTeams } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// POST: Neues Projekt erstellen
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
      include: { projects: true },
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
    const { name, description, levelId, teamId, isExternal, startDate, endDate, color, dependsOnId } = body;

    if (!name || !levelId) {
      return NextResponse.json({ error: 'Name und Level sind erforderlich' }, { status: 400 });
    }

    // Prüfe ob Level existiert
    const level = await prisma.customerLevel.findUnique({
      where: { id: levelId },
    });

    if (!level || level.customerId !== params.id) {
      return NextResponse.json({ error: 'Level nicht gefunden' }, { status: 404 });
    }

    // Position automatisch setzen
    const levelProjects = customer.projects.filter(p => p.levelId === levelId);
    const maxPosition = levelProjects.length > 0
      ? Math.max(...levelProjects.map(p => p.position))
      : -1;

    // Erstelle das Projekt
    const project = await prisma.customerProject.create({
      data: {
        name,
        description,
        levelId,
        customerId: params.id,
        teamId: isExternal ? null : teamId,
        isExternal: isExternal || false,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        color: color || '#10b981',
        position: maxPosition + 1,
        dependsOnId,
      },
      include: {
        team: { select: { id: true, name: true, color: true } },
        level: { select: { id: true, name: true, color: true } },
        dependsOn: { select: { id: true, name: true } },
      },
    });

    // Wenn nicht extern und ein Team zugewiesen ist, erstelle auch ein Ticket
    if (!isExternal && teamId) {
      const ticket = await prisma.ticket.create({
        data: {
          title: name,
          description: description || `Kundenprojekt: ${customer.name} - ${level.name}`,
          status: 'open',
          priority: 'medium',
          createdById: currentUser.id,
          teamId: teamId,
        },
      });

      // Verknüpfe Ticket mit CustomerProject
      await prisma.customerProject.update({
        where: { id: project.id },
        data: { ticketId: ticket.id },
      });
    }

    // Lade das aktualisierte Projekt
    const updatedProject = await prisma.customerProject.findUnique({
      where: { id: project.id },
      include: {
        team: { select: { id: true, name: true, color: true } },
        level: { select: { id: true, name: true, color: true } },
        ticket: { select: { id: true, title: true, status: true } },
        dependsOn: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ project: updatedProject }, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

// PUT: Projekt aktualisieren
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
    const { projectId, name, description, levelId, teamId, isExternal, startDate, endDate, status, color, position, dependsOnId } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Projekt-ID erforderlich' }, { status: 400 });
    }

    const project = await prisma.customerProject.findUnique({
      where: { id: projectId },
      include: { customer: true, ticket: true },
    });

    if (!project || project.customerId !== params.id) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 });
    }

    // Prüfe Zugriffsberechtigung
    const isSystemAdmin = isAdmin(currentUser.role);
    if (!isSystemAdmin) {
      const hasAccess = currentUser.organizationId === project.customer.organizationId ||
        currentUser.organizationMemberships?.some((m: { organizationId: string }) => m.organizationId === project.customer.organizationId);
      
      if (!hasAccess) {
        return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
      }
    }

    // Aktualisiere das Projekt
    const updatedProject = await prisma.customerProject.update({
      where: { id: projectId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(levelId !== undefined && { levelId }),
        ...(isExternal !== undefined && { isExternal, teamId: isExternal ? null : teamId }),
        ...(teamId !== undefined && !isExternal && { teamId }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(status !== undefined && { status }),
        ...(color !== undefined && { color }),
        ...(position !== undefined && { position }),
        ...(dependsOnId !== undefined && { dependsOnId }),
      },
      include: {
        team: { select: { id: true, name: true, color: true } },
        level: { select: { id: true, name: true, color: true } },
        ticket: { select: { id: true, title: true, status: true } },
        dependsOn: { select: { id: true, name: true } },
        dependents: { select: { id: true, name: true } },
      },
    });

    // Aktualisiere auch das verknüpfte Ticket wenn vorhanden
    if (project.ticket && (name !== undefined || description !== undefined || teamId !== undefined)) {
      await prisma.ticket.update({
        where: { id: project.ticket.id },
        data: {
          ...(name !== undefined && { title: name }),
          ...(description !== undefined && { description }),
          ...(teamId !== undefined && !isExternal && { teamId }),
        },
      });
    }

    // Wenn Enddate geändert wurde und es abhängige Projekte gibt, verschiebe diese
    if (endDate !== undefined && updatedProject.dependents.length > 0) {
      const newEndDate = new Date(endDate);
      for (const dependent of updatedProject.dependents) {
        const depProject = await prisma.customerProject.findUnique({
          where: { id: dependent.id },
        });
        if (depProject?.startDate && depProject.startDate < newEndDate) {
          const duration = depProject.endDate && depProject.startDate
            ? depProject.endDate.getTime() - depProject.startDate.getTime()
            : 7 * 24 * 60 * 60 * 1000; // Default 7 Tage
          
          await prisma.customerProject.update({
            where: { id: dependent.id },
            data: {
              startDate: newEndDate,
              endDate: new Date(newEndDate.getTime() + duration),
            },
          });
        }
      }
    }

    return NextResponse.json({ project: updatedProject });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

// DELETE: Projekt löschen
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
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Projekt-ID erforderlich' }, { status: 400 });
    }

    const project = await prisma.customerProject.findUnique({
      where: { id: projectId },
      include: { customer: true },
    });

    if (!project || project.customerId !== params.id) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 });
    }

    // Prüfe Zugriffsberechtigung
    const isSystemAdmin = isAdmin(currentUser.role);
    if (!isSystemAdmin) {
      const hasAccess = currentUser.organizationId === project.customer.organizationId ||
        currentUser.organizationMemberships?.some((m: { organizationId: string }) => m.organizationId === project.customer.organizationId);
      
      if (!hasAccess) {
        return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
      }
    }

    // Lösche zuerst Abhängigkeiten
    await prisma.customerProject.updateMany({
      where: { dependsOnId: projectId },
      data: { dependsOnId: null },
    });

    await prisma.customerProject.delete({
      where: { id: projectId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
