import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST: Test-Organisation erstellen (nur für Admins)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Nur Admins können Test-Organisationen erstellen' }, { status: 403 });
    }

    // Test-Organisation erstellen (ohne User-Zuweisung)
    const org = await prisma.organization.create({
      data: {
        name: 'Test Organisation zum Löschen',
        slug: `test-org-${Date.now()}`,
        description: 'Diese Organisation dient nur zum Testen der Lösch-Funktion',
      },
    });

    return NextResponse.json({ 
      success: true, 
      organization: org,
      message: 'Test-Organisation erstellt'
    });
  } catch (error) {
    console.error('Error creating test organization:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 });
  }
}
