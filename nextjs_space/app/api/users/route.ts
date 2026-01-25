import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { isAdmin, canManageUsers, validateEmail, validatePassword } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filterOrgId = searchParams.get('organizationId');
    const unassigned = searchParams.get('unassigned') === 'true';
    const excludeAdmins = searchParams.get('excludeAdmins') === 'true';

    // Hole den aktuellen User mit Team-Info
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, teamId: true, organizationId: true },
    });

    const userIsAdmin = isAdmin(currentUser?.role);

    // Admins und Projektleiter sehen alle User
    // User ohne Team sehen nur sich selbst
    // User mit Team sehen nur Teammitglieder
    let whereClause: any = {};
    
    // Admin kann nicht zugeordnete Benutzer anzeigen
    if (userIsAdmin && unassigned) {
      // Benutzer ohne direkte Org-Zuordnung UND ohne Team-Mitgliedschaften in Orgs
      whereClause.AND = [
        { organizationId: null },
        {
          teamMemberships: {
            none: {
              team: {
                organizationId: { not: null }
              }
            }
          }
        }
      ];
    }
    // Admin kann nach beliebiger Organisation filtern
    else if (userIsAdmin && filterOrgId) {
      // Benutzer mit direkter Org-Zuordnung ODER Team-Mitgliedschaft in dieser Org
      whereClause.OR = [
        { organizationId: filterOrgId },
        {
          teamMemberships: {
            some: {
              team: {
                organizationId: filterOrgId
              }
            }
          }
        }
      ];
    } else if (!canManageUsers(currentUser?.role)) {
      if (!currentUser?.teamId) {
        // User ohne Team sieht nur sich selbst
        whereClause = { id: session.user.id };
      } else {
        // User mit Team sieht nur Teammitglieder
        whereClause = { teamId: currentUser.teamId };
      }
    } else if (currentUser?.organizationId) {
      // Nicht-Admin Projektleiter sieht nur seine Organisation
      whereClause.organizationId = currentUser.organizationId;
    }

    // Admins aus Dropdown-Listen ausschließen wenn angefordert
    if (excludeAdmins) {
      const adminRoles = ['admin', 'administrator'];
      if (whereClause.AND) {
        whereClause.AND.push({ role: { notIn: adminRoles } });
      } else if (whereClause.OR) {
        whereClause = {
          AND: [
            { OR: whereClause.OR },
            { role: { notIn: adminRoles } }
          ]
        };
        delete whereClause.OR;
      } else {
        whereClause.role = { notIn: adminRoles };
      }
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        teamId: true,
        organizationId: true,
        weeklyHours: true,
        workloadPercent: true,
        team: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        teamMemberships: {
          select: {
            id: true,
            teamId: true,
            weeklyHours: true,
            workloadPercent: true,
            team: {
              select: {
                id: true,
                name: true,
                color: true,
                organizationId: true,
                organization: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            assignedTickets: {
              where: {
                status: {
                  in: ['open', 'in_progress'],
                },
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Benutzer' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !canManageUsers(session.user.role)) {
      return NextResponse.json(
        { error: 'Keine Berechtigung zum Löschen von Benutzern' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Benutzer-ID ist erforderlich' },
        { status: 400 }
      );
    }

    // Verhindere Selbstlöschung
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'Sie können sich nicht selbst löschen' },
        { status: 400 }
      );
    }

    // Lösche TeamMember-Einträge zuerst
    await prisma.teamMember.deleteMany({
      where: { userId },
    });

    // Lösche den Benutzer
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Benutzers' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !canManageUsers(session.user.role)) {
      return NextResponse.json(
        { error: 'Keine Berechtigung zum Bearbeiten von Benutzern' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Benutzer-ID ist erforderlich' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { role, teamId, name, weeklyHours, workloadPercent } = body;

    // Validate role if provided
    const validRoles = ['member', 'koordinator', 'projektleiter', 'admin'];
    if (role && !validRoles.includes(role.toLowerCase())) {
      return NextResponse.json(
        { error: 'Ungültige Rolle. Erlaubt: member, koordinator, projektleiter, admin' },
        { status: 400 }
      );
    }
    
    // Projektleiter dürfen keine Admins erstellen
    if (role?.toLowerCase() === 'admin' && !isAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Nur Administratoren können Admin-Rollen vergeben' },
        { status: 403 }
      );
    }

    // Build update data
    const updateData: any = {};
    if (role !== undefined) updateData.role = role.toLowerCase();
    if (teamId !== undefined) updateData.teamId = teamId || null;
    if (name !== undefined) updateData.name = name;
    if (weeklyHours !== undefined) updateData.weeklyHours = parseFloat(weeklyHours);
    if (workloadPercent !== undefined) updateData.workloadPercent = parseInt(workloadPercent);

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        teamId: true,
        weeklyHours: true,
        workloadPercent: true,
        team: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Benutzers' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !canManageUsers(session.user.role)) {
      return NextResponse.json(
        { error: 'Keine Berechtigung zum Erstellen von Benutzern' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { email, name, password, role } = body;
    
    // Projektleiter dürfen keine Admins erstellen
    if (role?.toLowerCase() === 'admin' && !isAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Nur Administratoren können Admin-Benutzer erstellen' },
        { status: 403 }
      );
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-Mail und Passwort sind erforderlich' },
        { status: 400 }
      );
    }

    // E-Mail-Validierung
    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Ungültige E-Mail-Adresse' },
        { status: 400 }
      );
    }

    // Passwort-Validierung
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Benutzer existiert bereits' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: name?.trim() || normalizedEmail.split('@')[0],
        role: role?.toLowerCase() || 'member',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Benutzers' },
      { status: 500 }
    );
  }
}
