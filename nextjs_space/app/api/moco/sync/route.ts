import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { fetchMocoSchedules } from '@/lib/moco-api';
import { format, subDays, addDays, addMonths } from 'date-fns';

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

    // Zeitraum: 30 Tage zurück bis 6 Monate in die Zukunft (für geplante Ferien)
    const today = new Date();
    const fromDate = format(subDays(today, 30), 'yyyy-MM-dd');
    const toDate = format(addMonths(today, 6), 'yyyy-MM-dd');

    // Abwesenheiten von MOCO abrufen
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

      return NextResponse.json(
        { error: result.error || 'Sync fehlgeschlagen' },
        { status: 500 }
      );
    }

    // Alte MOCO-synchronisierte Abwesenheiten löschen (erkennbar am "[MOCO]" Prefix)
    await prisma.absence.deleteMany({
      where: { 
        userId: user.id,
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

    console.log('Verarbeite', schedules.length, 'Schedules...');

    for (const schedule of schedules) {
      // assignment enthält die Abwesenheitsinfo (nicht absence!)
      if (!schedule.assignment) continue;
      
      const absenceName = schedule.assignment.name;
      const absenceKey = `${absenceName}-${schedule.assignment.id}`;
      const date = new Date(schedule.date);
      const { type, color } = mapMocoAbsenceType(absenceName);
      
      console.log(`Schedule: ${schedule.date} - ${absenceName} (${schedule.assignment.type})`);
      
      if (groupedAbsences.has(absenceKey)) {
        const existing = groupedAbsences.get(absenceKey)!;
        // Erweitere den Datumsbereich
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
      userId: user.id
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

    return NextResponse.json({
      success: true,
      message: `${absenceEntries.length} Abwesenheiten synchronisiert`,
      entriesCount: absenceEntries.length,
      debug: {
        rawSchedulesCount: result.data?.length || 0,
        groupedCount: groupedAbsences.size,
        sample: result.raw
      }
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
