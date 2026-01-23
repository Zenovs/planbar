import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { canManageUsers, isAdmin } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !canManageUsers(session.user.role)) {
      return NextResponse.json(
        { error: 'Keine Berechtigung' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, role, password, weeklyHours, workloadPercent } = body;
    
    // Projektleiter dürfen keine Admins erstellen/bearbeiten
    if (role?.toLowerCase() === 'admin' && !isAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Nur Administratoren können Admin-Rollen vergeben' },
        { status: 403 }
      );
    }

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
    if (!session?.user || !canManageUsers(session.user.role)) {
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

    // Prüfen ob User Tickets erstellt hat
    const userWithTickets = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { createdTickets: true }
        }
      }
    });

    if (!userWithTickets) {
      return NextResponse.json(
        { error: 'Benutzer nicht gefunden' },
        { status: 404 }
      );
    }

    // Vor dem Löschen: Zuweisungen entfernen
    await prisma.$transaction([
      // Ticket-Zuweisungen entfernen
      prisma.ticket.updateMany({
        where: { assignedToId: params.id },
        data: { assignedToId: null }
      }),
      // SubTask-Zuweisungen entfernen
      prisma.subTask.updateMany({
        where: { assigneeId: params.id },
        data: { assigneeId: null }
      }),
      // Team-Zuweisungen werden durch onDelete: Cascade automatisch entfernt
    ]);

    // Wenn User Tickets erstellt hat, diese einem anderen Admin zuweisen
    if (userWithTickets._count.createdTickets > 0) {
      // Finde einen anderen Admin
      const otherAdmin = await prisma.user.findFirst({
        where: {
          id: { not: params.id },
          role: { in: ['admin', 'Admin', 'administrator', 'Administrator'] }
        }
      });

      if (otherAdmin) {
        await prisma.ticket.updateMany({
          where: { createdById: params.id },
          data: { createdById: otherAdmin.id }
        });
      } else {
        return NextResponse.json(
          { error: 'Benutzer hat Projekte erstellt. Es muss mindestens ein anderer Admin existieren, um diese zu übernehmen.' },
          { status: 400 }
        );
      }
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
