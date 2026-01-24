import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET: Alle Ausgaben abrufen (nur Admin)
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

    const expenses = await prisma.expense.findMany({
      orderBy: { startDate: 'desc' },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

// POST: Neue Ausgabe erstellen (nur Admin)
export async function POST(request: NextRequest) {
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

    const { title, amount, type, recurring, interval, startDate, endDate, notes } = await request.json();

    if (!title || amount === undefined || !type) {
      return NextResponse.json({ error: 'title, amount und type erforderlich' }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        title,
        amount: parseFloat(amount),
        type,
        recurring: recurring || false,
        interval: interval || null,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        notes: notes || null,
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

// PUT: Ausgabe aktualisieren (nur Admin)
export async function PUT(request: NextRequest) {
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

    const { id, title, amount, type, recurring, interval, startDate, endDate, notes } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'id erforderlich' }, { status: 400 });
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(type && { type }),
        ...(recurring !== undefined && { recurring }),
        ...(interval !== undefined && { interval }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

// DELETE: Ausgabe löschen (nur Admin)
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id erforderlich' }, { status: 400 });
    }

    await prisma.expense.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
