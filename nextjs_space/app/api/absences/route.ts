import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

// GET - Abwesenheiten abrufen (rollenbasiert)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        role: true, 
        teamId: true,
        teamMemberships: {
          select: { teamId: true }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userId = searchParams.get('userId');

    const isAdmin = ['admin', 'Administrator', 'ADMIN'].includes(user.role || '');
    const isKoordinator = user.role?.toLowerCase() === 'koordinator';

    // Team IDs sammeln
    const teamIds: string[] = [];
    if (user.teamId) teamIds.push(user.teamId);
    user.teamMemberships?.forEach(tm => {
      if (!teamIds.includes(tm.teamId)) teamIds.push(tm.teamId);
    });

    // Filter basierend auf Rolle
    let userFilter: any = { userId: user.id }; // Standard: nur eigene

    if (isAdmin) {
      // Admin sieht alle
      userFilter = userId ? { userId } : {};
    } else if (isKoordinator && teamIds.length > 0) {
      // Koordinator sieht Team-Mitglieder
      const teamMembers = await prisma.user.findMany({
        where: {
          OR: [
            { teamId: { in: teamIds } },
            { teamMemberships: { some: { teamId: { in: teamIds } } } }
          ]
        },
        select: { id: true }
      });
      const memberIds = teamMembers.map(m => m.id);
      userFilter = userId && memberIds.includes(userId) 
        ? { userId } 
        : { userId: { in: memberIds } };
    }

    const whereClause: any = { ...userFilter };

    if (startDate && endDate) {
      whereClause.OR = [
        {
          startDate: { gte: new Date(startDate), lte: new Date(endDate) }
        },
        {
          endDate: { gte: new Date(startDate), lte: new Date(endDate) }
        },
        {
          AND: [
            { startDate: { lte: new Date(startDate) } },
            { endDate: { gte: new Date(endDate) } }
          ]
        }
      ];
    }

    const absences = await prisma.absence.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { startDate: 'asc' }
    });

    return NextResponse.json(absences);
  } catch (error) {
    console.error('GET /api/absences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Neue Abwesenheit erstellen
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        role: true, 
        teamId: true,
        teamMemberships: { select: { teamId: true } }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { title, type, startDate, endDate, description, color, userId: targetUserId } = body;

    if (!title || !type || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const isAdmin = ['admin', 'Administrator', 'ADMIN'].includes(user.role || '');
    const isKoordinator = user.role?.toLowerCase() === 'koordinator';

    // Bestimme für wen die Abwesenheit ist
    let forUserId = user.id;
    
    if (targetUserId && targetUserId !== user.id) {
      if (isAdmin) {
        forUserId = targetUserId;
      } else if (isKoordinator) {
        // Prüfe ob Zielbenutzer im selben Team ist
        const teamIds: string[] = [];
        if (user.teamId) teamIds.push(user.teamId);
        user.teamMemberships?.forEach(tm => {
          if (!teamIds.includes(tm.teamId)) teamIds.push(tm.teamId);
        });

        const targetUser = await prisma.user.findFirst({
          where: {
            id: targetUserId,
            OR: [
              { teamId: { in: teamIds } },
              { teamMemberships: { some: { teamId: { in: teamIds } } } }
            ]
          }
        });

        if (targetUser) {
          forUserId = targetUserId;
        }
      }
    }

    const absence = await prisma.absence.create({
      data: {
        title,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        description: description || null,
        color: color || getDefaultColor(type),
        userId: forUserId
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return NextResponse.json(absence, { status: 201 });
  } catch (error) {
    console.error('POST /api/absences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Abwesenheit löschen
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const absence = await prisma.absence.findUnique({
      where: { id }
    });

    if (!absence) {
      return NextResponse.json({ error: 'Absence not found' }, { status: 404 });
    }

    const isAdmin = ['admin', 'Administrator', 'ADMIN'].includes(user.role || '');
    const isOwner = absence.userId === user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    await prisma.absence.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/absences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getDefaultColor(type: string): string {
  switch (type) {
    case 'vacation': return '#22c55e';  // Grün für Ferien
    case 'workshop': return '#3b82f6';  // Blau für Workshop
    case 'sick': return '#ef4444';      // Rot für Krank
    case 'other': return '#a855f7';     // Lila für Sonstiges
    default: return '#6b7280';
  }
}
