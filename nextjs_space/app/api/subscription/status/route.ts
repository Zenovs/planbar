import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isTrialExpired, getRemainingTrialDays } from '@/lib/stripe';

// GET: Aktuellen Subscription-Status abrufen
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        subscriptionType: true,
        trialStartDate: true,
        trialEndDate: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        subscriptionStatus: true,
        dailyRate: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 });
    }

    // Berechne aktuellen Status
    let currentStatus = user.subscriptionStatus;
    let requiresPayment = false;
    let remainingTrialDays = 0;

    if (user.subscriptionType === 'pay') {
      remainingTrialDays = getRemainingTrialDays(user.trialEndDate);
      
      // Prüfe ob Trial abgelaufen und kein aktives Abo
      if (isTrialExpired(user.trialEndDate) && !user.stripeSubscriptionId) {
        currentStatus = 'expired';
        requiresPayment = true;
        
        // Status in DB aktualisieren
        await prisma.user.update({
          where: { id: user.id },
          data: { subscriptionStatus: 'expired' },
        });
      }
    }

    return NextResponse.json({
      subscriptionType: user.subscriptionType,
      status: currentStatus,
      trialStartDate: user.trialStartDate,
      trialEndDate: user.trialEndDate,
      remainingTrialDays,
      hasActiveSubscription: !!user.stripeSubscriptionId,
      requiresPayment,
      dailyRate: user.dailyRate, // Note: This is now actually the monthly rate
      monthlyRate: user.dailyRate || 0.15,
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
