import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { validatePassword, validateEmail } from '@/lib/auth-helpers';
import { sendVerificationEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// Generiert einen 6-stelligen Verifizierungscode
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-Mail und Passwort sind erforderlich' },
        { status: 400 }
      );
    }

    // E-Mail-Validierung
    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Ungültige E-Mail-Adresse' },
        { status: 400 }
      );
    }

    // Passwort-Validierung
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      // Wenn der Benutzer existiert aber nicht verifiziert ist, 
      // neuen Code senden
      if (!existingUser.emailVerified) {
        const verificationCode = generateVerificationCode();
        const verificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 Minuten

        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            verificationCode,
            verificationExpires,
          },
        });

        // E-Mail senden
        await sendVerificationEmail(
          normalizedEmail,
          existingUser.name || normalizedEmail.split('@')[0],
          verificationCode
        );

        return NextResponse.json(
          {
            message: 'Neuer Verifizierungscode wurde gesendet',
            requiresVerification: true,
            email: normalizedEmail,
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        { error: 'Benutzer existiert bereits' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 Minuten

    const userName = name?.trim() || normalizedEmail.split('@')[0];
    
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: userName,
        role: 'member',
        emailVerified: false,
        verificationCode,
        verificationExpires,
      },
    });

    // Verifizierungs-E-Mail senden
    const emailSent = await sendVerificationEmail(
      normalizedEmail,
      userName,
      verificationCode
    );

    if (!emailSent) {
      console.warn('Verifizierungs-E-Mail konnte nicht gesendet werden');
    }

    return NextResponse.json(
      {
        message: 'Registrierung erfolgreich. Bitte überprüfen Sie Ihre E-Mails.',
        requiresVerification: true,
        email: user.email,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Registrierung' },
      { status: 500 }
    );
  }
}
