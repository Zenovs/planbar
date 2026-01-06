import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

// GET - Alle Team-Mitgliedschaften eines Users oder alle eines Teams
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const teamId = searchParams.get('teamId');

    if (userId) {
      // Alle Team-Mitgliedschaften eines Users
      const memberships = await prisma.teamMember.findMany({
        where: { userId },
        include: {
          team: true,
        },
      });
      return NextResponse.json(memberships);
    }

    if (teamId) {
      // Alle Mitglieder eines Teams
      const members = await prisma.teamMember.findMany({
        where: { teamId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
            },
          },
        },
      });
      return NextResponse.json(members);
    }

    // Alle Team-Mitgliedschaften
    const allMemberships = await prisma.teamMember.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        team: true,
      },
    });
    return NextResponse.json(allMemberships);
  } catch (error) {
    console.error('Fehler beim Laden der Team-Mitgliedschaften:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// POST - Neue Team-Mitgliedschaft erstellen
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, teamId, weeklyHours = 42, workloadPercent = 100 } = body;

    if (!userId || !teamId) {
      return NextResponse.json({ error: 'userId und teamId sind erforderlich' }, { status: 400 });
    }

    // Prüfen ob bereits existiert
    const existing = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: { userId, teamId },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Benutzer ist bereits Mitglied dieses Teams' }, { status: 400 });
    }

    const membership = await prisma.teamMember.create({
      data: {
        userId,
        teamId,
        weeklyHours,
        workloadPercent,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        team: true,
      },
    });

    return NextResponse.json(membership, { status: 201 });
  } catch (error) {
    console.error('Fehler beim Erstellen der Team-Mitgliedschaft:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// PATCH - Team-Mitgliedschaft aktualisieren (Pensum ändern)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const body = await request.json();
    const { id, userId, teamId, weeklyHours, workloadPercent } = body;

    // Entweder ID oder userId+teamId müssen angegeben werden
    let whereClause;
    if (id) {
      whereClause = { id };
    } else if (userId && teamId) {
      whereClause = { userId_teamId: { userId, teamId } };
    } else {
      return NextResponse.json({ error: 'id oder userId+teamId sind erforderlich' }, { status: 400 });
    }

    const membership = await prisma.teamMember.update({
      where: whereClause,
      data: {
        ...(weeklyHours !== undefined && { weeklyHours }),
        ...(workloadPercent !== undefined && { workloadPercent }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        team: true,
      },
    });

    return NextResponse.json(membership);
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Team-Mitgliedschaft:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}

// DELETE - Team-Mitgliedschaft entfernen
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');
    const teamId = searchParams.get('teamId');

    let whereClause;
    if (id) {
      whereClause = { id };
    } else if (userId && teamId) {
      whereClause = { userId_teamId: { userId, teamId } };
    } else {
      return NextResponse.json({ error: 'id oder userId+teamId sind erforderlich' }, { status: 400 });
    }

    await prisma.teamMember.delete({
      where: whereClause,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Löschen der Team-Mitgliedschaft:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
