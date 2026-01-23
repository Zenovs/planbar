import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { sendEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'E-Mail ist erforderlich' }, { status: 400 });
    }

    // Prüfe ob User existiert
    const user = await prisma.user.findUnique({
      where: { email }
    });

    // Aus Sicherheitsgründen immer success zurückgeben
    if (!user) {
      return NextResponse.json({ 
        success: true, 
        message: 'Wenn diese E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet.' 
      });
    }

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

    // Sende E-Mail
    const resetUrl = `${process.env.NEXTAUTH_URL || 'https://planbar-one.vercel.app'}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    
    await sendEmail({
      to: email,
      subject: 'Passwort zurücksetzen - planbar',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Passwort zurücksetzen</h2>
          <p>Hallo ${user.name || 'Benutzer'},</p>
          <p>Du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt.</p>
          <p>Klicke auf den folgenden Link, um dein Passwort zurückzusetzen:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(to right, #3b82f6, #8b5cf6); color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">Passwort zurücksetzen</a>
          <p>Dieser Link ist 1 Stunde gültig.</p>
          <p>Falls du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">planbar - Modernes Ticket-Management für kleine Teams</p>
        </div>
      `
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Wenn diese E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet.' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
