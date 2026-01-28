import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { decrypt } from '@/lib/encryption';
import { format, subDays, addMonths } from 'date-fns';

export async function GET() {
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
      return NextResponse.json({ error: 'Keine MOCO-Integration' }, { status: 404 });
    }

    const integration = user.mocoIntegration;
    const apiKey = decrypt(integration.apiKeyEncrypted, integration.apiKeyIv);
    const baseUrl = `https://${integration.instanceDomain}.mocoapp.com/api/v1`;

    const today = new Date();
    const fromDate = format(subDays(today, 60), 'yyyy-MM-dd');
    const toDate = format(addMonths(today, 6), 'yyyy-MM-dd');

    const results: Record<string, unknown> = {};

    // 1. Session/User info
    try {
      const sessionRes = await fetch(`${baseUrl}/session`, {
        headers: { 'Authorization': `Token token=${apiKey}` }
      });
      results.session = await sessionRes.json();
    } catch (e) {
      results.session = { error: String(e) };
    }

    // 2. Schedules (Abwesenheiten)
    try {
      const schedulesRes = await fetch(`${baseUrl}/schedules?from=${fromDate}&to=${toDate}`, {
        headers: { 'Authorization': `Token token=${apiKey}` }
      });
      const schedulesData = await schedulesRes.json();
      results.schedules = {
        status: schedulesRes.status,
        count: Array.isArray(schedulesData) ? schedulesData.length : 'not array',
        sample: Array.isArray(schedulesData) ? schedulesData.slice(0, 5) : schedulesData
      };
    } catch (e) {
      results.schedules = { error: String(e) };
    }

    // 3. User Holidays (Urlaubsübersicht)
    try {
      const year = new Date().getFullYear();
      const holidaysRes = await fetch(`${baseUrl}/users/holidays?year=${year}`, {
        headers: { 'Authorization': `Token token=${apiKey}` }
      });
      results.userHolidays = {
        status: holidaysRes.status,
        data: await holidaysRes.json()
      };
    } catch (e) {
      results.userHolidays = { error: String(e) };
    }

    // 4. User Employments (Arbeitszeiten)
    try {
      const employmentsRes = await fetch(`${baseUrl}/users/employments`, {
        headers: { 'Authorization': `Token token=${apiKey}` }
      });
      results.employments = {
        status: employmentsRes.status,
        data: await employmentsRes.json()
      };
    } catch (e) {
      results.employments = { error: String(e) };
    }

    // 5. Planning Entries (Alternative für Abwesenheiten)
    try {
      const planningRes = await fetch(`${baseUrl}/planning_entries?from=${fromDate}&to=${toDate}`, {
        headers: { 'Authorization': `Token token=${apiKey}` }
      });
      const planningData = await planningRes.json();
      results.planningEntries = {
        status: planningRes.status,
        count: Array.isArray(planningData) ? planningData.length : 'not array',
        sample: Array.isArray(planningData) ? planningData.slice(0, 5) : planningData
      };
    } catch (e) {
      results.planningEntries = { error: String(e) };
    }

    return NextResponse.json({
      integration: {
        domain: integration.instanceDomain,
        isActive: integration.isActive
      },
      dateRange: { from: fromDate, to: toDate },
      results
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
