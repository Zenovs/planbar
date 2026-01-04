import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET - Get a single template by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Get user with team
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, teamId: true }
    });

    if (!user?.teamId) {
      return NextResponse.json({ error: 'User not assigned to a team' }, { status: 400 });
    }

    // Get template and verify it belongs to user's team
    const template = await prisma.template.findFirst({
      where: {
        id,
        teamId: user.teamId
      },
      include: {
        subTickets: {
          orderBy: { order: 'asc' }
        },
        team: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('GET /api/templates/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update a template
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Get user with team
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, teamId: true }
    });

    if (!user?.teamId) {
      return NextResponse.json({ error: 'User not assigned to a team' }, { status: 400 });
    }

    // Verify template exists and belongs to user's team
    const existing = await prisma.template.findFirst({
      where: {
        id,
        teamId: user.teamId
      }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, subTickets } = body;

    // Check if new name conflicts with another template in the team
    if (name && name !== existing.name) {
      const nameExists = await prisma.template.findFirst({
        where: {
          name,
          teamId: user.teamId,
          id: { not: id }
        }
      });
      if (nameExists) {
        return NextResponse.json({ error: 'Template with this name already exists for your team' }, { status: 409 });
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    // If sub-tickets are being updated, delete old ones and create new ones
    if (subTickets !== undefined) {
      await prisma.templateSubTicket.deleteMany({
        where: { templateId: id }
      });

      updateData.subTickets = {
        create: subTickets.map((st: { title: string; description?: string; order?: number }, index: number) => ({
          title: st.title,
          description: st.description || null,
          order: st.order !== undefined ? st.order : index
        }))
      };
    }

    // Update template
    const template = await prisma.template.update({
      where: { id },
      data: updateData,
      include: {
        subTickets: {
          orderBy: { order: 'asc' }
        },
        team: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error('PUT /api/templates/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a template
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Get user with team
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, teamId: true }
    });

    if (!user?.teamId) {
      return NextResponse.json({ error: 'User not assigned to a team' }, { status: 400 });
    }

    // Verify template exists and belongs to user's team
    const template = await prisma.template.findFirst({
      where: {
        id,
        teamId: user.teamId
      }
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Delete template (sub-tickets will be cascade deleted)
    await prisma.template.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/templates/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
