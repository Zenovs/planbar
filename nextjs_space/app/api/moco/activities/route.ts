import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fetchMocoProjectActivities } from '@/lib/moco-api';

// GET: Hole Ist-Stunden für ein Projekt aus MOCO
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket-ID erforderlich' }, { status: 400 });
    }

    // Hole Ticket mit MOCO Projekt-ID
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        mocoProjectId: true,
        estimatedHours: true,
        createdById: true,
        teamId: true
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 });
    }

    if (!ticket.mocoProjectId) {
      return NextResponse.json({ error: 'Keine MOCO Projekt-ID hinterlegt' }, { status: 400 });
    }

    // Hole MOCO Integration des Users (oder Admin/Team)
    const mocoIntegration = await prisma.mocoIntegration.findFirst({
      where: {
        OR: [
          { userId: session.user.id },
          // Falls der User keinen hat, prüfe ob der Ticket-Ersteller einen hat
          { userId: ticket.createdById }
        ]
      },
      orderBy: { updatedAt: 'desc' }
    });

    if (!mocoIntegration) {
      return NextResponse.json({ 
        error: 'Keine MOCO-Verbindung konfiguriert',
        details: 'Bitte richten Sie zuerst die MOCO-Integration in den Einstellungen ein.'
      }, { status: 400 });
    }

    // Hole Ist-Stunden von MOCO
    const result = await fetchMocoProjectActivities(
      mocoIntegration.apiKeyEncrypted,
      mocoIntegration.apiKeyIv,
      mocoIntegration.instanceDomain,
      ticket.mocoProjectId
    );

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Fehler beim Abrufen der MOCO Daten'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      totalHours: result.totalHours || 0,
      estimatedHours: ticket.estimatedHours || 0,
      byUser: result.byUser || [],
      activityCount: result.data?.length || 0
    });

  } catch (error) {
    console.error('MOCO Activities API Error:', error);
    return NextResponse.json(
      { error: 'Serverfehler beim Abrufen der Ist-Stunden' },
      { status: 500 }
    );
  }
}
