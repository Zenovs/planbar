import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET: Alle User mit Subscription-Infos abrufen (nur Admin)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    // Admin-Check
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (currentUser?.role !== 'admin') {
      return NextResponse.json({ error: 'Nur Admins erlaubt' }, { status: 403 });
    }

    // Alle User mit Subscription-Daten abrufen
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        subscriptionType: true,
        trialStartDate: true,
        trialEndDate: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        subscriptionStatus: true,
        dailyRate: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

// PUT: User-Subscription aktualisieren (nur Admin)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    // Admin-Check
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (currentUser?.role !== 'admin') {
      return NextResponse.json({ error: 'Nur Admins erlaubt' }, { status: 403 });
    }

    const { userId, subscriptionType, dailyRate } = await request.json();

    if (!userId || !subscriptionType) {
      return NextResponse.json({ error: 'userId und subscriptionType erforderlich' }, { status: 400 });
    }

    // Update-Daten vorbereiten
    const updateData: any = {
      subscriptionType,
      dailyRate: dailyRate || 0.15,
    };

    // Wenn auf "pay" gewechselt wird, Trial starten (falls nicht schon gestartet)
    if (subscriptionType === 'pay') {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      
      if (!user?.trialStartDate) {
        const now = new Date();
        const trialEnd = new Date(now);
        trialEnd.setDate(trialEnd.getDate() + 14); // 14-Tage Trial
        
        updateData.trialStartDate = now;
        updateData.trialEndDate = trialEnd;
        updateData.subscriptionStatus = 'trialing';
      }
    } else {
      // Wenn auf "free" gewechselt wird, Status auf aktiv setzen
      updateData.subscriptionStatus = 'active';
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        subscriptionType: true,
        trialStartDate: true,
        trialEndDate: true,
        subscriptionStatus: true,
        dailyRate: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
