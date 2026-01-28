import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { fetchMocoSchedules } from '@/lib/moco-api';
import { format, subDays, addMonths } from 'date-fns';

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

    // Zeitraum: 30 Tage zurück bis 6 Monate in die Zukunft
    const today = new Date();
    const fromDate = format(subDays(today, 30), 'yyyy-MM-dd');
    const toDate = format(addMonths(today, 6), 'yyyy-MM-dd');

    // Jede Integration einzeln synchronisieren
    for (const integration of integrations) {
      try {
        console.log(`Sync für User ${integration.user.email}...`);

        const result = await fetchMocoSchedules(
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

        // Alte MOCO-synchronisierte Abwesenheiten löschen
        await prisma.absence.deleteMany({
          where: { 
            userId: integration.userId,
            title: { startsWith: '[MOCO]' }
          }
        });

        // Abwesenheiten gruppieren (zusammenhängende Tage zu einem Eintrag)
        const schedules = result.data;
        const groupedAbsences: Map<string, { 
          title: string; 
          type: string; 
          color: string; 
          startDate: Date; 
          endDate: Date;
          description: string | null;
        }> = new Map();

        for (const schedule of schedules) {
          // assignment enthält die Abwesenheitsinfo (nicht absence!)
          if (!schedule.assignment) continue;
          
          const absenceName = schedule.assignment.name;
          const absenceKey = `${absenceName}-${schedule.assignment.id}`;
          const date = new Date(schedule.date);
          const { type, color } = mapMocoAbsenceType(absenceName);
          
          if (groupedAbsences.has(absenceKey)) {
            const existing = groupedAbsences.get(absenceKey)!;
            if (date < existing.startDate) existing.startDate = date;
            if (date > existing.endDate) existing.endDate = date;
          } else {
            groupedAbsences.set(absenceKey, {
              title: `[MOCO] ${absenceName}`,
              type,
              color: schedule.assignment.color || color,
              startDate: date,
              endDate: date,
              description: schedule.comment
            });
          }
        }

        // Abwesenheiten als Planbar Absences speichern
        const absenceEntries = Array.from(groupedAbsences.values()).map(absence => ({
          title: absence.title,
          type: absence.type,
          startDate: absence.startDate,
          endDate: absence.endDate,
          allDay: true,
          description: absence.description,
          color: absence.color,
          userId: integration.userId
        }));

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
