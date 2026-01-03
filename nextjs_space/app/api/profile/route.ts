import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { deleteFile } from '@/lib/s3';

export const dynamic = 'force-dynamic';

// GET: Get current user profile
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        imagePublic: true,
        role: true,
        emailNotifications: true,
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
        borderRadius: true,
        backgroundImage: true,
        backgroundImagePublic: true,
        layout: true,
        designTemplate: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden des Profils' },
      { status: 500 }
    );
  }
}

// PATCH: Update user profile
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      email,
      currentPassword,
      newPassword,
      image,
      imagePublic,
      emailNotifications,
      primaryColor,
      secondaryColor,
      accentColor,
      borderRadius,
      backgroundImage,
      backgroundImagePublic,
      layout,
      designTemplate,
    } = body;

    // Get current user data
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    // If changing email, check if it's already taken
    if (email && email !== currentUser.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        return NextResponse.json(
          { error: 'Diese E-Mail-Adresse wird bereits verwendet' },
          { status: 400 }
        );
      }
    }

    // If changing password, verify current password
    let hashedNewPassword;
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Aktuelles Passwort erforderlich' },
          { status: 400 }
        );
      }

      if (!currentUser.password) {
        return NextResponse.json(
          { error: 'Benutzer hat kein Passwort gesetzt' },
          { status: 400 }
        );
      }

      const isValid = await bcrypt.compare(currentPassword, currentUser.password);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Aktuelles Passwort ist falsch' },
          { status: 400 }
        );
      }

      hashedNewPassword = await bcrypt.hash(newPassword, 10);
    }

    // Delete old image if new image is provided
    if (image && currentUser.image && currentUser.image !== image) {
      try {
        await deleteFile(currentUser.image);
      } catch (error) {
        console.error('Error deleting old image:', error);
        // Continue anyway
      }
    }

    // Delete old background image if new one is provided
    if (backgroundImage && currentUser.backgroundImage && currentUser.backgroundImage !== backgroundImage) {
      try {
        await deleteFile(currentUser.backgroundImage);
      } catch (error) {
        console.error('Error deleting old background image:', error);
        // Continue anyway
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(hashedNewPassword && { password: hashedNewPassword }),
        ...(image !== undefined && { image }),
        ...(imagePublic !== undefined && { imagePublic }),
        ...(emailNotifications !== undefined && { emailNotifications }),
        ...(primaryColor !== undefined && { primaryColor }),
        ...(secondaryColor !== undefined && { secondaryColor }),
        ...(accentColor !== undefined && { accentColor }),
        ...(borderRadius !== undefined && { borderRadius }),
        ...(backgroundImage !== undefined && { backgroundImage }),
        ...(backgroundImagePublic !== undefined && { backgroundImagePublic }),
        ...(layout !== undefined && { layout }),
        ...(designTemplate !== undefined && { designTemplate }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        imagePublic: true,
        role: true,
        emailNotifications: true,
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
        borderRadius: true,
        backgroundImage: true,
        backgroundImagePublic: true,
        layout: true,
        designTemplate: true,
      },
    });

    return NextResponse.json(
      { message: 'Profil erfolgreich aktualisiert', user: updatedUser },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Profils' },
      { status: 500 }
    );
  }
}
