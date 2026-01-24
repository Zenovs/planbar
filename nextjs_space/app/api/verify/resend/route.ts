import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { sendVerificationResendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// Generiert einen 6-stelligen Verifizierungscode
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'E-Mail ist erforderlich' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Aus Sicherheitsgründen keinen konkreten Fehler zurückgeben
      return NextResponse.json(
        { message: 'Falls ein Account mit dieser E-Mail existiert, wurde ein neuer Code gesendet.' },
        { status: 200 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { message: 'E-Mail bereits verifiziert', alreadyVerified: true },
        { status: 200 }
      );
    }

    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 Minuten

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCode,
        verificationExpires,
      },
    });

    // E-Mail senden
    const emailSent = await sendVerificationResendEmail(
      normalizedEmail,
      user.name || normalizedEmail.split('@')[0],
      verificationCode
    );

    if (!emailSent) {
      console.warn('Verifizierungs-E-Mail konnte nicht gesendet werden');
    }

    return NextResponse.json(
      {
        message: 'Neuer Verifizierungscode wurde gesendet',
        sent: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Senden des Codes' },
      { status: 500 }
    );
  }
}
