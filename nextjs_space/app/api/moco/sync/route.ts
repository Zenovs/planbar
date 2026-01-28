import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { fetchMocoActivities } from '@/lib/moco-api';
import { format, subDays, addDays } from 'date-fns';

// POST: Führt einen manuellen Sync für den aktuellen User durch
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { mocoIntegration: true }
    });

    if (!user || !user.mocoIntegration) {
      return NextResponse.json(
        { error: 'Keine MOCO-Integration gefunden' },
        { status: 404 }
      );
    }

    const integration = user.mocoIntegration;

    if (!integration.isActive) {
      return NextResponse.json(
        { error: 'MOCO-Integration ist deaktiviert' },
        { status: 400 }
      );
    }

    // Zeitraum: Letzte 30 Tage bis heute
    const today = new Date();
    const fromDate = format(subDays(today, 30), 'yyyy-MM-dd');
    const toDate = format(today, 'yyyy-MM-dd');

    // Aktivitäten von MOCO abrufen
    const result = await fetchMocoActivities(
      integration.apiKeyEncrypted,
      integration.apiKeyIv,
      integration.instanceDomain,
      fromDate,
      toDate
    );

    if (!result.success || !result.data) {
      // Fehler speichern
      await prisma.mocoIntegration.update({
        where: { id: integration.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: 'error',
          lastSyncError: result.error
        }
      });

      return NextResponse.json(
        { error: result.error || 'Sync fehlgeschlagen' },
        { status: 500 }
      );
    }

    // Alte Einträge löschen und neue einfügen
    await prisma.mocoCalendarEntry.deleteMany({
      where: { integrationId: integration.id }
    });

    // Neue Einträge einfügen
    const entries = result.data.map(activity => ({
      mocoId: String(activity.id),
      date: new Date(activity.date),
      hours: activity.hours,
      description: activity.description || null,
      projectName: activity.project?.name || null,
      taskName: activity.task?.name || null,
      billable: activity.billable,
      integrationId: integration.id
    }));

    if (entries.length > 0) {
      await prisma.mocoCalendarEntry.createMany({
        data: entries
      });
    }

    // Erfolg speichern
    await prisma.mocoIntegration.update({
      where: { id: integration.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: 'success',
        lastSyncError: null
      }
    });

    return NextResponse.json({
      success: true,
      message: `${entries.length} Einträge synchronisiert`,
      entriesCount: entries.length
    });
  } catch (error) {
    console.error('MOCO Sync Fehler:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

// GET: Holt die synchronisierten Kalendereinträge
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { mocoIntegration: true }
    });

    if (!user || !user.mocoIntegration) {
      return NextResponse.json({ entries: [] });
    }

    const whereClause: Record<string, unknown> = {
      integrationId: user.mocoIntegration.id
    };

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const entries = await prisma.mocoCalendarEntry.findMany({
      where: whereClause,
      orderBy: { date: 'desc' }
    });

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Fehler beim Abrufen der MOCO-Einträge:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
