import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { fetchMocoSchedules } from '@/lib/moco-api';
import { format, subMonths, addMonths } from 'date-fns';

// Mapping von MOCO Abwesenheitstypen zu Planbar-Typen
function mapMocoAbsenceType(mocoName: string): { type: string; color: string } {
  const name = mocoName.toLowerCase();
  if (name.includes('ferien') || name.includes('urlaub') || name.includes('vacation')) {
    return { type: 'vacation', color: '#22c55e' };
  }
  if (name.includes('feiertag') || name.includes('holiday')) {
    return { type: 'other', color: '#a855f7' };
  }
  if (name.includes('krank') || name.includes('sick')) {
    return { type: 'sick', color: '#ef4444' };
  }
  if (name.includes('schulung') || name.includes('workshop') || name.includes('weiterbildung')) {
    return { type: 'workshop', color: '#3b82f6' };
  }
  return { type: 'other', color: '#a855f7' };
}

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

    // Zeitraum: 12 Monate zurück bis 12 Monate in die Zukunft
    const today = new Date();
    const fromDate = format(subMonths(today, 12), 'yyyy-MM-dd');
    const toDate = format(addMonths(today, 12), 'yyyy-MM-dd');

    // Jede Integration einzeln synchronisieren
    for (const integration of integrations) {
      try {
        console.log(`Sync für User ${integration.user.email}...`);

        // Mit E-Mail-Filter für exakte User-Zuordnung
        const result = await fetchMocoSchedules(
          integration.apiKeyEncrypted,
          integration.apiKeyIv,
          integration.instanceDomain,
          fromDate,
          toDate,
          integration.mocoEmail || undefined
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

        // Alte MOCO-synchronisierte Abwesenheiten löschen
        await prisma.absence.deleteMany({
          where: { 
            userId: integration.userId,
            title: { startsWith: '[MOCO]' }
          }
        });

        // KEINE Gruppierung - jeder MOCO-Tag wird als einzelner Eintrag gespeichert
        const schedules = result.data;
        const absenceEntries = schedules
          .filter(schedule => schedule.assignment)
          .map(schedule => {
            const absenceName = schedule.assignment!.name;
            const date = new Date(schedule.date);
            const { type, color } = mapMocoAbsenceType(absenceName);
            
            return {
              title: `[MOCO] ${absenceName}`,
              type,
              startDate: date,
              endDate: date,
              allDay: true,
              description: schedule.comment,
              color: schedule.assignment!.color || color,
              userId: integration.userId
            };
          });

        if (absenceEntries.length > 0) {
          await prisma.absence.createMany({
            data: absenceEntries
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
          entries: absenceEntries.length
        });

        console.log(`Sync erfolgreich: ${absenceEntries.length} Abwesenheiten`);
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
