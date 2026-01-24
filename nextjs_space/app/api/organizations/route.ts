import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Helper: Slug aus Namen erstellen
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

// GET: Organisation des aktuellen Users abrufen
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        organization: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                email: true,
                orgRole: true,
                role: true,
                image: true,
              },
            },
            teams: {
              select: {
                id: true,
                name: true,
                color: true,
                _count: { select: { members: true } },
              },
            },
            invites: {
              where: { accepted: false, expiresAt: { gt: new Date() } },
              select: {
                id: true,
                email: true,
                role: true,
                expiresAt: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json({
      organization: user.organization,
      orgRole: user.orgRole,
      isOrgAdmin: user.orgRole === 'org_admin' || user.role === 'admin',
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

// POST: Neue Organisation erstellen
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 });
    }

    // Prüfen ob User bereits in einer Organisation ist
    if (user.organizationId) {
      return NextResponse.json({ 
        error: 'Sie sind bereits Mitglied einer Organisation' 
      }, { status: 400 });
    }

    const { name, description } = await request.json();

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: 'Organisationsname erforderlich (min. 2 Zeichen)' }, { status: 400 });
    }

    // Slug erstellen und eindeutig machen
    let slug = createSlug(name);
    let slugExists = await prisma.organization.findUnique({ where: { slug } });
    let counter = 1;
    while (slugExists) {
      slug = `${createSlug(name)}-${counter}`;
      slugExists = await prisma.organization.findUnique({ where: { slug } });
      counter++;
    }

    // Organisation erstellen und User als org_admin setzen
    const organization = await prisma.organization.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        users: {
          connect: { id: user.id },
        },
      },
    });

    // User als org_admin markieren
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        orgRole: 'org_admin',
        // Wenn der User vorher nur "member" war, bekommt er admin-Rechte
        role: user.role === 'member' ? 'admin' : user.role,
      },
    });

    return NextResponse.json(organization, { status: 201 });
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

// PUT: Organisation aktualisieren
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: 'Keine Organisation gefunden' }, { status: 404 });
    }

    // Nur org_admin oder System-Admin können bearbeiten
    if (user.orgRole !== 'org_admin' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const { name, description, logo } = await request.json();

    const organization = await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(logo !== undefined && { logo }),
      },
    });

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Error updating organization:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
