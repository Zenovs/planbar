import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

// GET - Get all templates for the user's team
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with team
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, teamId: true }
    });

    if (!user?.teamId) {
      return NextResponse.json({ error: 'User not assigned to a team' }, { status: 400 });
    }

    // Get templates for the user's team
    const templates = await prisma.template.findMany({
      where: { teamId: user.teamId },
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
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('GET /api/templates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with team
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, teamId: true }
    });

    if (!user?.teamId) {
      return NextResponse.json({ error: 'User not assigned to a team' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, subTickets = [] } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    // Check if template with same name already exists for this team
    const existing = await prisma.template.findFirst({
      where: { 
        name,
        teamId: user.teamId
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'Template with this name already exists for your team' }, { status: 409 });
    }

    // Create template with sub-tickets
    const template = await prisma.template.create({
      data: {
        name,
        description,
        teamId: user.teamId,
        subTickets: {
          create: subTickets.map((st: { title: string; description?: string; order?: number }, index: number) => ({
            title: st.title,
            description: st.description || null,
            order: st.order !== undefined ? st.order : index
          }))
        }
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

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('POST /api/templates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
