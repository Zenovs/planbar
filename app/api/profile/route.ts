import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { deleteFile, getFileUrl } from '@/lib/s3';

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
        designPrimaryColor: true,
        designSecondaryColor: true,
        designAccentColor: true,
        designBorderRadius: true,
        designLayoutDensity: true,
        designBackgroundImage: true,
        designBackgroundPublic: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    // Generate full URLs for images stored in S3
    let imageUrl = user.image;
    let backgroundImageUrl = user.designBackgroundImage;

    if (user.image) {
      try {
        imageUrl = await getFileUrl(user.image, user.imagePublic);
      } catch (error) {
        console.error('Error generating image URL:', error);
      }
    }

    if (user.designBackgroundImage) {
      try {
        backgroundImageUrl = await getFileUrl(user.designBackgroundImage, user.designBackgroundPublic);
      } catch (error) {
        console.error('Error generating background image URL:', error);
      }
    }

    return NextResponse.json({ 
      user: {
        ...user,
        image: imageUrl,
        designBackgroundImage: backgroundImageUrl,
      }
    }, { status: 200 });
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
      designPrimaryColor,
      designSecondaryColor,
      designAccentColor,
      designBorderRadius,
      designLayoutDensity,
      designBackgroundImage,
      designBackgroundPublic,
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

    // Delete old image if new image is provided and different
    if (image && currentUser.image && currentUser.image !== image) {
      try {
        await deleteFile(currentUser.image);
      } catch (error) {
        console.error('Error deleting old image:', error);
        // Continue anyway
      }
    }

    // Delete old background image if new one is provided and different
    if (designBackgroundImage && currentUser.designBackgroundImage && currentUser.designBackgroundImage !== designBackgroundImage) {
      try {
        await deleteFile(currentUser.designBackgroundImage);
      } catch (error) {
        console.error('Error deleting old background image:', error);
        // Continue anyway
      }
    }

    // Build update data object
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (hashedNewPassword) updateData.password = hashedNewPassword;
    if (image !== undefined) updateData.image = image;
    if (imagePublic !== undefined) updateData.imagePublic = imagePublic;
    if (emailNotifications !== undefined) updateData.emailNotifications = emailNotifications;
    if (designPrimaryColor !== undefined) updateData.designPrimaryColor = designPrimaryColor;
    if (designSecondaryColor !== undefined) updateData.designSecondaryColor = designSecondaryColor;
    if (designAccentColor !== undefined) updateData.designAccentColor = designAccentColor;
    if (designBorderRadius !== undefined) updateData.designBorderRadius = designBorderRadius;
    if (designLayoutDensity !== undefined) updateData.designLayoutDensity = designLayoutDensity;
    if (designBackgroundImage !== undefined) updateData.designBackgroundImage = designBackgroundImage;
    if (designBackgroundPublic !== undefined) updateData.designBackgroundPublic = designBackgroundPublic;

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        imagePublic: true,
        role: true,
        emailNotifications: true,
        designPrimaryColor: true,
        designSecondaryColor: true,
        designAccentColor: true,
        designBorderRadius: true,
        designLayoutDensity: true,
        designBackgroundImage: true,
        designBackgroundPublic: true,
      },
    });

    return NextResponse.json(
      { 
        message: 'Profil erfolgreich aktualisiert', 
        user: updatedUser,
        success: true
      },
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
