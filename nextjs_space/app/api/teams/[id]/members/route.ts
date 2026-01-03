import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// Add or remove members from a team
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Nur Administratoren können Teammitglieder verwalten' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { userId, action } = body;

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'userId und action sind erforderlich' },
        { status: 400 }
      );
    }

    if (action === 'add') {
      // Add user to team
      await prisma.user.update({
        where: { id: userId },
        data: {
          teamId: params.id,
        },
      });
    } else if (action === 'remove') {
      // Remove user from team
      await prisma.user.update({
        where: { id: userId },
        data: {
          teamId: null,
        },
      });
    } else {
      return NextResponse.json(
        { error: 'Ungültige Aktion. Erlaubt: add, remove' },
        { status: 400 }
      );
    }

    // Return updated team
    const team = await prisma.team.findUnique({
      where: { id: params.id },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        _count: {
          select: {
            tickets: true,
          },
        },
      },
    });

    return NextResponse.json({ team });
  } catch (error) {
    console.error('Error managing team members:', error);
    return NextResponse.json(
      { error: 'Fehler beim Verwalten der Teammitglieder' },
      { status: 500 }
    );
  }
}
