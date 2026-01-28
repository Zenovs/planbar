import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    console.log('[Forgot Password] Request for email:', email);

    if (!email) {
      return NextResponse.json({ error: 'E-Mail ist erforderlich' }, { status: 400 });
    }

    // Prüfe ob User existiert
    const user = await prisma.user.findUnique({
      where: { email }
    });

    // Aus Sicherheitsgründen immer success zurückgeben (verhindert Email-Enumeration)
    if (!user) {
      console.log('[Forgot Password] User not found:', email);
      return NextResponse.json({ 
        success: true, 
        message: 'Wenn diese E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet.' 
      });
    }

    console.log('[Forgot Password] User found:', user.id, user.name);

    // Generiere Reset-Token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 Stunde

    // Lösche alte Tokens für diese E-Mail
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: email
      }
    });

    // Erstelle neuen Token
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: resetToken,
        expires: resetTokenExpiry
      }
    });

    console.log('[Forgot Password] Token created, expires:', resetTokenExpiry);

    // Sende E-Mail mit dedizierter Funktion
    const emailSent = await sendPasswordResetEmail(
      email,
      user.name || 'Benutzer',
      resetToken
    );

    if (!emailSent) {
      console.error('[Forgot Password] Failed to send email to:', email);
      // Trotzdem success zurückgeben aus Sicherheitsgründen
    } else {
      console.log('[Forgot Password] Email sent successfully to:', email);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Wenn diese E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet.' 
    });
  } catch (error) {
    console.error('[Forgot Password] Error:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
