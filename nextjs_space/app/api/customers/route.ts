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
        organizationMemberships: {
          include: {
            organization: { select: { id: true } },
          },
        },
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

    // Rollen die Kundenverwaltung erlauben
    const allowedRoles = ['admin', 'admin_organisation', 'org_admin', 'projektleiter'];

    // Sammle nur Organisations-IDs, bei denen der User eine ausreichende Rolle hat
    const orgIds: string[] = [];
    
    // Primäre Organisation: Prüfe orgRole
    if (currentUser.organizationId) {
      const primaryOrgRole = currentUser.orgRole?.toLowerCase() || '';
      if (isSystemAdmin || allowedRoles.includes(primaryOrgRole)) {
        orgIds.push(currentUser.organizationId);
      }
    }
    
    // Membership-Organisationen: Prüfe jeweilige orgRole
    currentUser.organizationMemberships?.forEach((m: { organizationId: string; orgRole: string | null }) => {
      const membershipRole = m.orgRole?.toLowerCase() || '';
      if (allowedRoles.includes(membershipRole) && !orgIds.includes(m.organizationId)) {
        orgIds.push(m.organizationId);
      }
    });

    // Sicherheitsprüfung: Wenn organizationId Filter übergeben wurde, 
    // muss der User auch Zugriff auf diese Organisation haben
    if (organizationId && !orgIds.includes(organizationId)) {
      return NextResponse.json({ error: 'Keine Berechtigung für diese Organisation' }, { status: 403 });
    }

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
    const { name, email, phone, address, description, contactPerson, color, organizationId, levels, projectAssignments } = body;

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

    // Erstelle Kunden mit Levels und Projektzuordnungen in einer Transaktion
    const customer = await prisma.$transaction(async (tx) => {
      // Erstelle den Kunden
      const newCustomer = await tx.customer.create({
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
      });

      // Erstelle Levels falls vorhanden
      interface LevelInput {
        name: string;
        description?: string;
        color?: string;
        position?: number;
        tempId?: string;
      }
      
      const levelMap = new Map<string, string>(); // tempId -> realId
      
      if (levels && Array.isArray(levels) && levels.length > 0) {
        for (let i = 0; i < levels.length; i++) {
          const level: LevelInput = levels[i];
          const createdLevel = await tx.customerLevel.create({
            data: {
              name: level.name,
              description: level.description || null,
              color: level.color || '#6366f1',
              position: level.position ?? i,
              customerId: newCustomer.id,
            },
          });
          if (level.tempId) {
            levelMap.set(level.tempId, createdLevel.id);
          }
        }
      }

      // Erstelle Projektzuordnungen falls vorhanden
      interface ProjectAssignment {
        ticketId: string;
        levelTempId: string;
        name?: string;
        startDate?: string;
        endDate?: string;
        status?: string;
        color?: string;
      }
      
      if (projectAssignments && Array.isArray(projectAssignments) && projectAssignments.length > 0) {
        for (const assignment of projectAssignments as ProjectAssignment[]) {
          const realLevelId = levelMap.get(assignment.levelTempId);
          if (realLevelId && assignment.ticketId) {
            // Hole Ticket-Informationen für den Namen
            const ticket = await tx.ticket.findUnique({
              where: { id: assignment.ticketId },
              select: { title: true, teamId: true },
            });
            
            if (ticket) {
              await tx.customerProject.create({
                data: {
                  name: assignment.name || ticket.title,
                  customerId: newCustomer.id,
                  levelId: realLevelId,
                  ticketId: assignment.ticketId,
                  teamId: ticket.teamId,
                  startDate: assignment.startDate ? new Date(assignment.startDate) : null,
                  endDate: assignment.endDate ? new Date(assignment.endDate) : null,
                  status: assignment.status || 'planned',
                  color: assignment.color || '#10b981',
                },
              });
            }
          }
        }
      }

      // Lade den kompletten Kunden mit allen Relationen
      return tx.customer.findUnique({
        where: { id: newCustomer.id },
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
              ticket: { select: { id: true, title: true } },
            },
          },
          _count: {
            select: { levels: true, projects: true },
          },
        },
      });
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
