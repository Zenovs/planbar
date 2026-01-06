import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, token, password } = await request.json();

    if (!email || !token || !password) {
      return NextResponse.json({ error: 'Alle Felder sind erforderlich' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Passwort muss mindestens 6 Zeichen lang sein' }, { status: 400 });
    }

    // Prüfe Token
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: email
      }
    });

    if (!verificationToken || verificationToken.token !== token) {
      return NextResponse.json({ error: 'Ungültiger oder abgelaufener Token' }, { status: 400 });
    }

    if (verificationToken.expires < new Date()) {
      await prisma.verificationToken.deleteMany({
        where: { identifier: email }
      });
      return NextResponse.json({ error: 'Token ist abgelaufen' }, { status: 400 });
    }

    // Hashe neues Passwort
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update User Passwort
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    });

    // Lösche verwendeten Token
    await prisma.verificationToken.deleteMany({
      where: { identifier: email }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Passwort erfolgreich zurückgesetzt' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
