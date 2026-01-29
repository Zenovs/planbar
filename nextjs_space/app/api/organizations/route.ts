import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { canManageOrganizations, isAdmin } from '@/lib/auth-helpers';

// Helper: Slug aus Namen erstellen
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

// GET: Organisation des aktuellen Users abrufen (oder alle für Admins)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const fetchAll = searchParams.get('all') === 'true';

    // Admin kann alle Organisationen abrufen
    if (fetchAll && user.role === 'admin') {
      const organizations = await prisma.organization.findMany({
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              orgRole: true,
              role: true,
              image: true,
              teamId: true,
              weeklyHours: true,
              workloadPercent: true,
              team: {
                select: {
                  id: true,
                  name: true,
                },
              },
              teamMemberships: {
                select: {
                  team: {
                    select: {
                      id: true,
                      name: true,
                      color: true,
                    },
                  },
                },
              },
              organizationMemberships: {
                select: {
                  organizationId: true,
                  orgRole: true,
                  organization: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
              _count: {
                select: {
                  assignedTickets: true,
                },
              },
            },
          },
          members: {
            select: {
              id: true,
              userId: true,
              orgRole: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                  image: true,
                  weeklyHours: true,
                  workloadPercent: true,
                  teamMemberships: {
                    select: {
                      team: {
                        select: {
                          id: true,
                          name: true,
                          color: true,
                        },
                      },
                    },
                  },
                  organizationMemberships: {
                    select: {
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
            },
          },
          teams: {
            select: {
              id: true,
              name: true,
              color: true,
              _count: { select: { teamMembers: true } },
              teamMembers: {
                select: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      role: true,
                      orgRole: true,
                      image: true,
                      organizationId: true,
                      weeklyHours: true,
                      workloadPercent: true,
                      teamMemberships: {
                        select: {
                          team: {
                            select: {
                              id: true,
                              name: true,
                              color: true,
                              organizationId: true,
                            },
                          },
                        },
                      },
                      organizationMemberships: {
                        select: {
                          organizationId: true,
                          orgRole: true,
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
                },
              },
            },
          },
          _count: {
            select: {
              users: true,
              teams: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      // User ohne Organisation laden (weder in users noch in members)
      const usersWithoutOrg = await prisma.user.findMany({
        where: {
          AND: [
            { organizationId: null },
            { organizationMemberships: { none: {} } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          teamId: true,
          weeklyHours: true,
          workloadPercent: true,
          team: {
            select: {
              id: true,
              name: true,
            },
          },
          teamMemberships: {
            select: {
              team: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          },
          _count: {
            select: {
              assignedTickets: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      return NextResponse.json({
        organizations,
        usersWithoutOrg,
        isAdmin: true,
      });
    }

    // Alle Organisationen des Users laden (über OrganizationMember UND primäre organizationId)
    const userWithOrg = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        organization: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                email: true,
                orgRole: true,
                role: true,
                image: true,
                teamId: true,
                weeklyHours: true,
                workloadPercent: true,
                team: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                teamMemberships: {
                  select: {
                    team: {
                      select: {
                        id: true,
                        name: true,
                        color: true,
                      },
                    },
                  },
                },
                organizationMemberships: {
                  select: {
                    organizationId: true,
                    orgRole: true,
                    organization: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
                _count: {
                  select: {
                    assignedTickets: true,
                  },
                },
              },
            },
            members: {
              select: {
                id: true,
                userId: true,
                orgRole: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    image: true,
                    teamMemberships: {
                      select: {
                        team: {
                          select: {
                            id: true,
                            name: true,
                            color: true,
                          },
                        },
                      },
                    },
                    organizationMemberships: {
                      select: {
                        organizationId: true,
                        orgRole: true,
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
              },
            },
            teams: {
              select: {
                id: true,
                name: true,
                color: true,
                _count: { select: { teamMembers: true } },
              },
            },
            invites: {
              where: { accepted: false, expiresAt: { gt: new Date() } },
              select: {
                id: true,
                email: true,
                role: true,
                expiresAt: true,
                createdAt: true,
              },
            },
          },
        },
        organizationMemberships: {
          include: {
            organization: {
              include: {
                users: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    orgRole: true,
                    role: true,
                    image: true,
                    teamMemberships: {
                      select: {
                        team: {
                          select: {
                            id: true,
                            name: true,
                            color: true,
                          },
                        },
                      },
                    },
                    organizationMemberships: {
                      select: {
                        organizationId: true,
                        orgRole: true,
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
                members: {
                  select: {
                    id: true,
                    userId: true,
                    orgRole: true,
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        image: true,
                        teamMemberships: {
                          select: {
                            team: {
                              select: {
                                id: true,
                                name: true,
                                color: true,
                              },
                            },
                          },
                        },
                        organizationMemberships: {
                          select: {
                            organizationId: true,
                            orgRole: true,
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
                  },
                },
                teams: {
                  select: {
                    id: true,
                    name: true,
                    color: true,
                    _count: { select: { teamMembers: true } },
                  },
                },
                invites: {
                  where: { accepted: false, expiresAt: { gt: new Date() } },
                  select: {
                    id: true,
                    email: true,
                    role: true,
                    expiresAt: true,
                    createdAt: true,
                  },
                },
                _count: {
                  select: {
                    users: true,
                    teams: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Alle Organisationen sammeln (primäre + memberships)
    const userOrganizations: any[] = [];
    const addedOrgIds = new Set<string>();

    // Primäre Organisation hinzufügen
    if (userWithOrg?.organization) {
      userOrganizations.push({
        ...userWithOrg.organization,
        userOrgRole: userWithOrg.orgRole || 'member',
        isPrimary: true,
      });
      addedOrgIds.add(userWithOrg.organization.id);
    }

    // Organisationen aus Memberships hinzufügen
    if (userWithOrg?.organizationMemberships) {
      for (const membership of userWithOrg.organizationMemberships) {
        if (!addedOrgIds.has(membership.organization.id)) {
          userOrganizations.push({
            ...membership.organization,
            userOrgRole: membership.orgRole || 'member',
            isPrimary: false,
          });
          addedOrgIds.add(membership.organization.id);
        }
      }
    }

    return NextResponse.json({
      organization: userWithOrg?.organization,
      userOrganizations, // Alle Organisationen des Users
      orgRole: userWithOrg?.orgRole,
      userRole: userWithOrg?.role,
      isOrgAdmin: userWithOrg?.orgRole === 'org_admin' || userWithOrg?.orgRole === 'admin_organisation' || userWithOrg?.role === 'admin',
      canCreateOrganization: true, // Jeder User kann jetzt ein Unternehmen erstellen
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

// POST: Neue Organisation erstellen (jeder eingeloggte User kann erstellen)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 });
    }

    const { name, description } = await request.json();

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: 'Unternehmensname erforderlich (min. 2 Zeichen)' }, { status: 400 });
    }

    // Slug erstellen und eindeutig machen
    let slug = createSlug(name);
    let slugExists = await prisma.organization.findUnique({ where: { slug } });
    let counter = 1;
    while (slugExists) {
      slug = `${createSlug(name)}-${counter}`;
      slugExists = await prisma.organization.findUnique({ where: { slug } });
      counter++;
    }

    // Organisation erstellen
    const organization = await prisma.organization.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
      },
    });

    // Ersteller als Admin Unternehmen in OrganizationMember eintragen
    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        orgRole: 'admin_organisation',
      },
    });

    // Wenn User noch keine primäre Organisation hat, diese setzen
    if (!user.organizationId) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          organizationId: organization.id,
          orgRole: 'admin_organisation',
        },
      });
    }

    return NextResponse.json(organization, { status: 201 });
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

// PUT: Organisation aktualisieren
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: 'Kein Unternehmen gefunden' }, { status: 404 });
    }

    // Nur org_admin, Admin oder Admin Unternehmen können bearbeiten
    if (user.orgRole !== 'org_admin' && !canManageOrganizations(user.role)) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const { name, description, logo } = await request.json();

    const organization = await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(logo !== undefined && { logo }),
      },
    });

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Error updating organization:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

// DELETE: Organisation löschen (System-Admins oder Admin Unternehmen der jeweiligen Org)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        organizationMemberships: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('id');

    if (!orgId) {
      return NextResponse.json({ error: 'Unternehmens-ID erforderlich' }, { status: 400 });
    }

    // Berechtigung prüfen: System-Admin ODER Admin Unternehmen in dieser Org
    const isSystemAdmin = user.role === 'admin';
    const isPrimaryOrgAdmin = user.organizationId === orgId && 
      (user.orgRole === 'org_admin' || user.orgRole === 'admin_organisation');
    const membership = user.organizationMemberships?.find(m => m.organizationId === orgId);
    const isMembershipAdmin = membership && 
      (membership.orgRole === 'org_admin' || membership.orgRole === 'admin_organisation');

    if (!isSystemAdmin && !isPrimaryOrgAdmin && !isMembershipAdmin) {
      return NextResponse.json({ error: 'Keine Berechtigung - nur Admin Unternehmen können dieses Unternehmen löschen' }, { status: 403 });
    }

    // Prüfen ob Organisation existiert
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: { select: { users: true, teams: true } },
      },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Unternehmen nicht gefunden' }, { status: 404 });
    }

    // Transaktion: Alle zugehörigen Daten bereinigen und Organisation löschen
    await prisma.$transaction(async (tx) => {
      // 1. Alle Einladungen des Unternehmens löschen
      await tx.orgInvite.deleteMany({
        where: { organizationId: orgId },
      });

      // 2. Alle TeamMember-Einträge der Teams in diesem Unternehmen löschen
      const teamIds = await tx.team.findMany({
        where: { organizationId: orgId },
        select: { id: true },
      });
      
      if (teamIds.length > 0) {
        await tx.teamMember.deleteMany({
          where: { teamId: { in: teamIds.map(t => t.id) } },
        });
      }

      // 3. Alle Subtasks von Tickets diesem Unternehmen löschen
      const ticketIds = await tx.ticket.findMany({
        where: { teamId: { in: teamIds.map(t => t.id) } },
        select: { id: true },
      });

      if (ticketIds.length > 0) {
        await tx.subTask.deleteMany({
          where: { ticketId: { in: ticketIds.map(t => t.id) } },
        });
      }

      // 4. Alle Tickets der Teams löschen
      if (teamIds.length > 0) {
        await tx.ticket.deleteMany({
          where: { teamId: { in: teamIds.map(t => t.id) } },
        });
      }

      // 5. Alle Teams des Unternehmens löschen
      await tx.team.deleteMany({
        where: { organizationId: orgId },
      });

      // 6. OrganizationMember-Einträge für dieses Unternehmen löschen
      await tx.organizationMember.deleteMany({
        where: { organizationId: orgId },
      });

      // 7. User aus primärer Zuweisung entfernen und ggf. auf anderes Unternehmen setzen
      const usersInOrg = await tx.user.findMany({
        where: { organizationId: orgId },
        select: { 
          id: true,
          organizationMemberships: {
            where: { organizationId: { not: orgId } },
            select: { organizationId: true },
            take: 1,
          },
        },
      });

      for (const user of usersInOrg) {
        if (user.organizationMemberships.length > 0) {
          // User ist noch in einem anderen Unternehmen - dorthin setzen
          await tx.user.update({
            where: { id: user.id },
            data: { 
              organizationId: user.organizationMemberships[0].organizationId,
            },
          });
        } else {
          // User ist in keinem anderen Unternehmen - auf null setzen
          await tx.user.update({
            where: { id: user.id },
            data: { 
              organizationId: null,
              orgRole: 'member',
            },
          });
        }
      }

      // 8. Unternehmen löschen
      await tx.organization.delete({
        where: { id: orgId },
      });
    });

    return NextResponse.json({ 
      success: true, 
      message: `Unternehmen "${organization.name}" wurde gelöscht` 
    });
  } catch (error) {
    console.error('Error deleting organization:', error);
    return NextResponse.json({ error: 'Fehler beim Löschen des Unternehmens' }, { status: 500 });
  }
}
