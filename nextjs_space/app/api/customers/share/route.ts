import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: Kunden-Timeline über Share-Token abrufen (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token erforderlich' }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({
      where: { shareToken: token },
      include: {
        organization: { select: { name: true } },
        levels: {
          orderBy: { position: 'asc' },
          include: {
            projects: {
              orderBy: { position: 'asc' },
              // Alle Projekte anzeigen (intern und extern)
              include: {
                team: { select: { name: true, color: true } },
                dependsOn: { select: { id: true, name: true } },
              },
            },
          },
        },
        projects: {
          orderBy: [{ level: { position: 'asc' } }, { position: 'asc' }],
          include: {
            level: { select: { id: true, name: true, color: true } },
            team: { select: { name: true, color: true } },
            dependsOn: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!customer || !customer.shareEnabled) {
      return NextResponse.json({ error: 'Nicht gefunden oder Sharing deaktiviert' }, { status: 404 });
    }

    // Entferne sensitive Daten
    const safeCustomer = {
      name: customer.name,
      description: customer.description,
      color: customer.color,
      organizationName: customer.organization.name,
      levels: customer.levels.map(level => ({
        id: level.id,
        name: level.name,
        color: level.color,
        position: level.position,
        projects: level.projects.map(project => ({
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          startDate: project.startDate,
          endDate: project.endDate,
          color: project.color,
          position: project.position,
          team: project.team,
          dependsOnId: project.dependsOnId,
          dependsOnName: project.dependsOn?.name,
        })),
      })),
      projects: customer.projects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        color: project.color,
        position: project.position,
        levelId: project.levelId,
        levelName: project.level.name,
        levelColor: project.level.color,
        team: project.team,
        dependsOnId: project.dependsOnId,
        dependsOnName: project.dependsOn?.name,
      })),
    };

    return NextResponse.json({ customer: safeCustomer });
  } catch (error) {
    console.error('Error fetching shared customer:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
