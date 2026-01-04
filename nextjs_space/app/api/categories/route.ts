import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

// GET /api/categories - Fetch all categories
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { tickets: true, templates: true },
        },
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/categories - Create a new category (Admin only)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, color, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: {
        name,
        color: color || '#3b82f6',
        description,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Category name already exists' }, { status: 400 });
    }
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/categories - Update a category (Admin only)
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, color, description } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (color !== undefined) updateData.color = color;
    if (description !== undefined) updateData.description = description;

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(category);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Category name already exists' }, { status: 400 });
    }
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/categories?id=xyz - Delete a category (Admin only)
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
