import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

// GET - Alle Kategorien laden
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { tickets: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('GET /api/categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Neue Kategorie erstellen (nur Admin)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { name, color, description } = body;

    if (!name || !color) {
      return NextResponse.json({ error: 'name and color are required' }, { status: 400 });
    }

    // Prüfe ob Name bereits existiert
    const existing = await prisma.category.findUnique({
      where: { name }
    });

    if (existing) {
      return NextResponse.json({ error: 'Category with this name already exists' }, { status: 409 });
    }

    const category = await prisma.category.create({
      data: {
        name,
        color,
        description
      }
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('POST /api/categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Kategorie aktualisieren (nur Admin)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const body = await request.json();
    const { name, color, description } = body;

    // Prüfe ob Kategorie existiert
    const existing = await prisma.category.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Prüfe ob neuer Name bereits existiert (bei Name-Änderung)
    if (name && name !== existing.name) {
      const nameExists = await prisma.category.findUnique({
        where: { name }
      });
      if (nameExists) {
        return NextResponse.json({ error: 'Category with this name already exists' }, { status: 409 });
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(color !== undefined && { color }),
        ...(description !== undefined && { description })
      }
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error('PATCH /api/categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Kategorie löschen (nur Admin)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Prüfe ob Kategorie existiert
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { tickets: true }
        }
      }
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Verhindere Löschen wenn Tickets zugeordnet sind
    if (category._count.tickets > 0) {
      return NextResponse.json(
        { error: `Cannot delete category with ${category._count.tickets} assigned tickets` },
        { status: 409 }
      );
    }

    await prisma.category.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Category deleted' });
  } catch (error) {
    console.error('DELETE /api/categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
