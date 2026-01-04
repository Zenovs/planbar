import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

// GET /api/templates - Fetch all templates
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await prisma.ticketTemplate.findMany({
      orderBy: { name: 'asc' },
      include: {
        category: true,
        subTasks: {
          orderBy: { position: 'asc' },
        },
      },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/templates - Create a new template (Admin only)
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
    const { name, description, title, content, status, priority, categoryId, subTasks } = body;

    if (!name || !title) {
      return NextResponse.json({ error: 'name and title are required' }, { status: 400 });
    }

    // Create template with sub-tasks
    const template = await prisma.ticketTemplate.create({
      data: {
        name,
        description,
        title,
        content,
        status: status || 'open',
        priority: priority || 'medium',
        categoryId,
        subTasks: {
          create: (subTasks || []).map((st: any, index: number) => ({
            title: st.title,
            position: st.position !== undefined ? st.position : index,
          })),
        },
      },
      include: {
        category: true,
        subTasks: {
          orderBy: { position: 'asc' },
        },
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/templates?id=xyz - Delete a template (Admin only)
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

    await prisma.ticketTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
