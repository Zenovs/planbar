import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { canManageOrganizations } from '@/lib/auth-helpers';
import crypto from 'crypto';

// POST: Mitglied zur Organisation einladen
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { organization: true },
    });

    if (!user?.organizationId || !user.organization) {
      return NextResponse.json({ error: 'Keine Organisation gefunden' }, { status: 404 });
    }

    // Nur org_admin, Admin oder Admin Unternehmen können einladen
    if (user.orgRole !== 'org_admin' && !canManageOrganizations(user.role)) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const { email, role } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Gültige E-Mail-Adresse erforderlich' }, { status: 400 });
    }

    const validRoles = ['member', 'koordinator', 'projektleiter', 'admin_organisation', 'org_admin'];
    const assignedRole = validRoles.includes(role) ? role : 'member';

    // Prüfen ob User bereits existiert und in dieser Org ist
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser?.organizationId === user.organizationId) {
      return NextResponse.json({ 
        error: 'Diese Person ist bereits Mitglied Ihrer Organisation' 
      }, { status: 400 });
    }

    // Prüfen ob bereits eine offene Einladung existiert
    const existingInvite = await prisma.orgInvite.findFirst({
      where: {
        email: email.toLowerCase(),
        organizationId: user.organizationId,
        accepted: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvite) {
      return NextResponse.json({ 
        error: 'Eine Einladung an diese E-Mail-Adresse ist bereits aktiv' 
      }, { status: 400 });
    }

    // Token generieren
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 Tage

    // Einladung erstellen
    const invite = await prisma.orgInvite.create({
      data: {
        email: email.toLowerCase(),
        token,
        role: assignedRole,
        expiresAt,
        organizationId: user.organizationId,
        invitedById: user.id,
      },
    });

    // E-Mail senden
    const baseUrl = process.env.NEXTAUTH_URL || 'https://planbar-one.vercel.app';
    const inviteUrl = `${baseUrl}/invite/${token}`;

    try {
      await sendEmail({
        to: email.toLowerCase(),
        subject: `Einladung zu ${user.organization.name} auf Planbar`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0;">Planbar</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 12px 12px;">
              <h2 style="color: #1f2937; margin-top: 0;">Sie wurden eingeladen!</h2>
              <p style="color: #4b5563; font-size: 16px;">
                ${user.name || user.email} hat Sie eingeladen, der Organisation 
                <strong>${user.organization.name}</strong> auf Planbar beizutreten.
              </p>
              <p style="color: #4b5563; font-size: 14px;">
                Ihre Rolle: <strong>${assignedRole === 'org_admin' ? 'Admin Unternehmen' : assignedRole === 'admin_organisation' ? 'Admin Unternehmen' : assignedRole === 'projektleiter' ? 'Projektleiter' : assignedRole === 'koordinator' ? 'Koordinator' : 'Mitglied'}</strong>
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                  Einladung annehmen
                </a>
              </div>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
                Diese Einladung ist 7 Tage gültig.<br>
                Falls Sie diese E-Mail nicht erwartet haben, können Sie sie ignorieren.
              </p>
            </div>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Email error:', emailError);
      // Einladung trotzdem speichern, Link kann manuell geteilt werden
    }

    return NextResponse.json({ 
      success: true, 
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
      },
      inviteUrl, // Für manuelles Teilen
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating invite:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

// GET: Alle offenen Einladungen der Organisation
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: 'Keine Organisation gefunden' }, { status: 404 });
    }

    // Nur org_admin, Admin oder Admin Unternehmen können Einladungen sehen
    if (user.orgRole !== 'org_admin' && !canManageOrganizations(user.role)) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const invites = await prisma.orgInvite.findMany({
      where: {
        organizationId: user.organizationId,
        accepted: false,
        expiresAt: { gt: new Date() },
      },
      include: {
        invitedBy: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(invites);
  } catch (error) {
    console.error('Error fetching invites:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

// DELETE: Einladung zurückziehen
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: 'Keine Organisation gefunden' }, { status: 404 });
    }

    if (user.orgRole !== 'org_admin' && !canManageOrganizations(user.role)) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const inviteId = searchParams.get('id');

    if (!inviteId) {
      return NextResponse.json({ error: 'Einladungs-ID erforderlich' }, { status: 400 });
    }

    await prisma.orgInvite.delete({
      where: { 
        id: inviteId,
        organizationId: user.organizationId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting invite:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
