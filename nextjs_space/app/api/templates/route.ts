import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

// GET /api/templates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
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
    console.error('Fehler beim Laden der Templates:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Templates' }, { status: 500 });
  }
}

// POST /api/templates (Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const body = await request.json();
    const { name, title, content, status, priority, categoryId, subTasks } = body;

    if (!name || !title) {
      return NextResponse.json({ error: 'Name und Titel erforderlich' }, { status: 400 });
    }

    const template = await prisma.ticketTemplate.create({
      data: {
        name,
        title,
        content: content || '',
        status: status || 'OFFEN',
        priority: priority || 'MITTEL',
        categoryId: categoryId || null,
        subTasks: subTasks
          ? {
              create: subTasks.map((st: any, index: number) => ({
                title: st.title,
                position: index,
              })),
            }
          : undefined,
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
    console.error('Fehler beim Erstellen des Templates:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen des Templates' }, { status: 500 });
  }
}

// PATCH /api/templates?id=123 (Admin only)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Template-ID erforderlich' }, { status: 400 });
    }

    const body = await request.json();
    const { name, title, content, status, priority, categoryId, subTasks } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (categoryId !== undefined) updateData.categoryId = categoryId;

    // If subTasks are provided, delete old ones and create new ones
    if (subTasks !== undefined) {
      await prisma.templateSubTask.deleteMany({
        where: { templateId: id },
      });

      updateData.subTasks = {
        create: subTasks.map((st: any, index: number) => ({
          title: st.title,
          position: index,
        })),
      };
    }

    const template = await prisma.ticketTemplate.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        subTasks: {
          orderBy: { position: 'asc' },
        },
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Templates:', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Templates' }, { status: 500 });
  }
}

// DELETE /api/templates?id=123 (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Template-ID erforderlich' }, { status: 400 });
    }

    // Delete template and its subtasks (cascade)
    await prisma.ticketTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Löschen des Templates:', error);
    return NextResponse.json({ error: 'Fehler beim Löschen des Templates' }, { status: 500 });
  }
}