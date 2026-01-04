import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

// GET /api/categories
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { tickets: true },
        },
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Fehler beim Laden der Kategorien:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Kategorien' }, { status: 500 });
  }
}

// POST /api/categories (Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const body = await request.json();
    const { name, color, description } = body;

    if (!name || !color) {
      return NextResponse.json({ error: 'Name und Farbe erforderlich' }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: {
        name,
        color,
        description: description || null,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Fehler beim Erstellen der Kategorie:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen der Kategorie' }, { status: 500 });
  }
}

// PATCH /api/categories?id=123 (Admin only)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Kategorie-ID erforderlich' }, { status: 400 });
    }

    const body = await request.json();
    const { name, color, description } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (color !== undefined) updateData.color = color;
    if (description !== undefined) updateData.description = description;

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Kategorie:', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren der Kategorie' }, { status: 500 });
  }
}

// DELETE /api/categories?id=123 (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Kategorie-ID erforderlich' }, { status: 400 });
    }

    // Check if category has tickets
    const ticketCount = await prisma.ticket.count({
      where: { categoryId: id },
    });

    if (ticketCount > 0) {
      return NextResponse.json(
        { error: `Kategorie kann nicht gelöscht werden. ${ticketCount} Tickets verwenden diese Kategorie.` },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Löschen der Kategorie:', error);
    return NextResponse.json({ error: 'Fehler beim Löschen der Kategorie' }, { status: 500 });
  }
}