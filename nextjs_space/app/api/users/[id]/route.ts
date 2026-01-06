import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Keine Berechtigung' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, role, password, weeklyHours, workloadPercent } = body;

    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (weeklyHours !== undefined) updateData.weeklyHours = weeklyHours;
    if (workloadPercent !== undefined) updateData.workloadPercent = workloadPercent;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        weeklyHours: true,
        workloadPercent: true,
        teamId: true,
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Keine Berechtigung' },
        { status: 403 }
      );
    }

    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: 'Sie können sich nicht selbst löschen' },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id: params.id },
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
