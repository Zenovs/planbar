import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { error: 'E-Mail und Code sind erforderlich' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Benutzer nicht gefunden' },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { message: 'E-Mail bereits verifiziert', alreadyVerified: true },
        { status: 200 }
      );
    }

    // Prüfen ob Code abgelaufen ist
    if (!user.verificationExpires || new Date() > user.verificationExpires) {
      return NextResponse.json(
        { error: 'Verifizierungscode abgelaufen. Bitte fordern Sie einen neuen an.' },
        { status: 400 }
      );
    }

    // Code prüfen
    if (user.verificationCode !== code) {
      return NextResponse.json(
        { error: 'Ungültiger Verifizierungscode' },
        { status: 400 }
      );
    }

    // Benutzer verifizieren
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationCode: null,
        verificationExpires: null,
      },
    });

    return NextResponse.json(
      {
        message: 'E-Mail erfolgreich verifiziert',
        verified: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Verifizierung' },
      { status: 500 }
    );
  }
}
