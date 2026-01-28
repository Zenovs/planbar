import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { fetchMocoActivities } from '@/lib/moco-api';
import { format, subDays } from 'date-fns';

// Cron-Job für täglichen MOCO-Sync um 04:00 Uhr
// Dieser Endpoint wird von einem externen Cron-Service aufgerufen
// z.B. Vercel Cron Jobs oder ein externer Scheduler

export async function GET(request: NextRequest) {
  try {
    // Sicherheitscheck: Nur mit gültigem Cron-Secret erlauben
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // In Production: Cron-Secret prüfen
    if (process.env.NODE_ENV === 'production' && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.log('Ungültiges Cron-Secret');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log('Starte täglichen MOCO-Sync...');

    // Alle aktiven MOCO-Integrationen laden
    const integrations = await prisma.mocoIntegration.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: { id: true, email: true, name: true }
        }
      }
    });

    console.log(`${integrations.length} aktive Integrationen gefunden`);

    const results: { userId: string; success: boolean; entries?: number; error?: string }[] = [];

    // Zeitraum: Letzte 30 Tage
    const today = new Date();
    const fromDate = format(subDays(today, 30), 'yyyy-MM-dd');
    const toDate = format(today, 'yyyy-MM-dd');

    // Jede Integration einzeln synchronisieren
    for (const integration of integrations) {
      try {
        console.log(`Sync für User ${integration.user.email}...`);

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

          results.push({
            userId: integration.userId,
            success: false,
            error: result.error
          });
          continue;
        }

        // Alte Einträge löschen
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

        results.push({
          userId: integration.userId,
          success: true,
          entries: entries.length
        });

        console.log(`Sync erfolgreich: ${entries.length} Einträge`);
      } catch (error) {
        console.error(`Fehler bei Sync für ${integration.userId}:`, error);
        results.push({
          userId: integration.userId,
          success: false,
          error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`MOCO-Sync abgeschlossen: ${successCount}/${integrations.length} erfolgreich`);

    return NextResponse.json({
      success: true,
      message: `Sync abgeschlossen: ${successCount}/${integrations.length} erfolgreich`,
      results
    });
  } catch (error) {
    console.error('Cron MOCO-Sync Fehler:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
