import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET: Einnahmen-Übersicht abrufen (nur Admin)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (currentUser?.role !== 'admin') {
      return NextResponse.json({ error: 'Nur Admins erlaubt' }, { status: 403 });
    }

    // Alle User mit Subscription-Daten
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        subscriptionType: true,
        subscriptionStatus: true,
        dailyRate: true,
        stripeSubscriptionId: true,
        trialEndDate: true,
      },
    });

    // Berechne Einnahmen
    const payingUsers = users.filter(
      u => u.subscriptionType === 'pay' && 
           u.subscriptionStatus === 'active' && 
           u.stripeSubscriptionId
    );

    const trialUsers = users.filter(
      u => u.subscriptionType === 'pay' && 
           u.subscriptionStatus === 'trialing'
    );

    const freeUsers = users.filter(u => u.subscriptionType === 'free');

    // Monatliche Einnahmen berechnen (dailyRate * 30)
    const monthlyRevenue = payingUsers.reduce((sum, u) => sum + (u.dailyRate || 0.5) * 30, 0);
    const yearlyRevenue = monthlyRevenue * 12;

    // Potenzielle Einnahmen (Trial-User)
    const potentialMonthly = trialUsers.reduce((sum, u) => sum + (u.dailyRate || 0.5) * 30, 0);

    return NextResponse.json({
      totalUsers: users.length,
      freeUsers: freeUsers.length,
      payingUsers: payingUsers.length,
      trialUsers: trialUsers.length,
      monthlyRevenue,
      yearlyRevenue,
      potentialMonthly,
      averageDailyRate: payingUsers.length > 0 
        ? payingUsers.reduce((sum, u) => sum + (u.dailyRate || 0.5), 0) / payingUsers.length 
        : 0.5,
    });
  } catch (error) {
    console.error('Error fetching revenue:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
