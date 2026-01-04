import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

// GET - Alle Templates laden
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await prisma.ticketTemplate.findMany({
      include: {
        category: true,
        subTasks: {
          orderBy: { position: 'asc' }
        },
        _count: {
          select: { subTasks: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('GET /api/templates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Neues Template erstellen (nur Admin)
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
    const { name, title, description, status, priority, categoryId, subTasks = [] } = body;

    if (!name || !title) {
      return NextResponse.json({ error: 'name and title are required' }, { status: 400 });
    }

    // Prüfe ob Name bereits existiert
    const existing = await prisma.ticketTemplate.findUnique({
      where: { name }
    });

    if (existing) {
      return NextResponse.json({ error: 'Template with this name already exists' }, { status: 409 });
    }

    // Erstelle Template mit SubTasks
    const template = await prisma.ticketTemplate.create({
      data: {
        name,
        title,
        description,
        status: status || 'open',
        priority: priority || 'medium',
        categoryId,
        subTasks: {
          create: subTasks.map((st: { title: string; position: number }, index: number) => ({
            title: st.title,
            position: st.position !== undefined ? st.position : index
          }))
        }
      },
      include: {
        category: true,
        subTasks: {
          orderBy: { position: 'asc' }
        }
      }
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('POST /api/templates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Template aktualisieren (nur Admin)
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
    const { name, title, description, status, priority, categoryId, subTasks } = body;

    // Prüfe ob Template existiert
    const existing = await prisma.ticketTemplate.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Prüfe ob neuer Name bereits existiert (bei Name-Änderung)
    if (name && name !== existing.name) {
      const nameExists = await prisma.ticketTemplate.findUnique({
        where: { name }
      });
      if (nameExists) {
        return NextResponse.json({ error: 'Template with this name already exists' }, { status: 409 });
      }
    }

    // Update Template
    const updateData: any = {
      ...(name !== undefined && { name }),
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status }),
      ...(priority !== undefined && { priority }),
      ...(categoryId !== undefined && { categoryId })
    };

    // Wenn SubTasks aktualisiert werden sollen
    if (subTasks !== undefined) {
      // Lösche alte SubTasks und erstelle neue
      await prisma.templateSubTask.deleteMany({
        where: { templateId: id }
      });

      updateData.subTasks = {
        create: subTasks.map((st: { title: string; position: number }, index: number) => ({
          title: st.title,
          position: st.position !== undefined ? st.position : index
        }))
      };
    }

    const template = await prisma.ticketTemplate.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        subTasks: {
          orderBy: { position: 'asc' }
        }
      }
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error('PATCH /api/templates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Template löschen (nur Admin)
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

    // Prüfe ob Template existiert
    const template = await prisma.ticketTemplate.findUnique({
      where: { id }
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Lösche Template (SubTasks werden durch Cascade automatisch gelöscht)
    await prisma.ticketTemplate.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Template deleted' });
  } catch (error) {
    console.error('DELETE /api/templates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
