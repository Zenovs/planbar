import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { token, name, password } = await request.json();

    if (!token || !name || !password) {
      return NextResponse.json({ error: 'Alle Felder erforderlich' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Passwort muss mindestens 6 Zeichen haben' }, { status: 400 });
    }

    // Einladung finden
    const invite = await prisma.orgInvite.findUnique({
      where: { token },
      include: { organization: true },
    });

    if (!invite) {
      return NextResponse.json({ error: 'Einladung nicht gefunden' }, { status: 404 });
    }

    if (invite.accepted) {
      return NextResponse.json({ error: 'Einladung bereits angenommen' }, { status: 400 });
    }

    if (new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Einladung abgelaufen' }, { status: 400 });
    }

    // Prüfen ob User schon existiert
    const existingUser = await prisma.user.findUnique({
      where: { email: invite.email },
      include: {
        organizationMemberships: true,
      },
    });

    const hashedPassword = await bcrypt.hash(password, 12);

    // Rolle für System-Rolle mappen
    const systemRole = invite.role === 'org_admin' ? 'admin' 
                     : invite.role === 'admin_organisation' ? 'admin_organisation'
                     : invite.role === 'projektleiter' ? 'projektleiter'
                     : invite.role === 'koordinator' ? 'koordinator'
                     : 'Mitglied';

    if (existingUser) {
      // User existiert - prüfen ob bereits in dieser Org
      const existingMembership = existingUser.organizationMemberships?.find(
        m => m.organizationId === invite.organizationId
      );
      
      if (existingMembership || existingUser.organizationId === invite.organizationId) {
        return NextResponse.json({ 
          error: 'Sie sind bereits Mitglied dieses Unternehmens' 
        }, { status: 400 });
      }

      // User hat bereits eine Organisation - über OrganizationMember hinzufügen
      if (existingUser.organizationId) {
        // Als zusätzliche Mitgliedschaft hinzufügen
        await prisma.organizationMember.create({
          data: {
            userId: existingUser.id,
            organizationId: invite.organizationId,
            orgRole: invite.role,
          },
        });
      } else {
        // Keine primäre Organisation - diese als primäre setzen
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            organizationId: invite.organizationId,
            orgRole: invite.role,
            role: systemRole,
            name: name.trim(),
            password: hashedPassword,
          },
        });
        
        // Auch OrganizationMember erstellen
        await prisma.organizationMember.create({
          data: {
            userId: existingUser.id,
            organizationId: invite.organizationId,
            orgRole: invite.role,
          },
        });
      }
    } else {
      // Neuen User erstellen
      const newUser = await prisma.user.create({
        data: {
          email: invite.email,
          name: name.trim(),
          password: hashedPassword,
          role: systemRole,
          orgRole: invite.role,
          organizationId: invite.organizationId,
          emailVerified: true, // Da per Einladung, ist E-Mail verifiziert
        },
      });
      
      // Auch OrganizationMember erstellen
      await prisma.organizationMember.create({
        data: {
          userId: newUser.id,
          organizationId: invite.organizationId,
          orgRole: invite.role,
        },
      });
    }

    // Einladung als angenommen markieren
    await prisma.orgInvite.update({
      where: { id: invite.id },
      data: { accepted: true },
    });

    return NextResponse.json({ 
      success: true,
      message: `Willkommen bei ${invite.organization.name}!`,
    });
  } catch (error) {
    console.error('Error accepting invite:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
