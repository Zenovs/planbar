import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { encrypt, isValidApiKey } from '@/lib/encryption';
import { testMocoConnection } from '@/lib/moco-api';

// Hilfsfunktion zum Maskieren der E-Mail
function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return '***@***';
  
  const maskedLocal = localPart.length <= 2 
    ? '*'.repeat(localPart.length) 
    : localPart[0] + '*'.repeat(Math.min(localPart.length - 2, 5)) + localPart[localPart.length - 1];
  
  const domainParts = domain.split('.');
  const maskedDomain = domainParts[0].length <= 2 
    ? '*'.repeat(domainParts[0].length) 
    : domainParts[0][0] + '*'.repeat(Math.min(domainParts[0].length - 2, 4)) + domainParts[0][domainParts[0].length - 1];
  
  return `${maskedLocal}@${maskedDomain}.${domainParts.slice(1).join('.')}`;
}

// Hilfsfunktion zum Maskieren der Domain
function maskDomain(domain: string): string {
  if (domain.length <= 3) return '*'.repeat(domain.length);
  return domain[0] + '*'.repeat(Math.min(domain.length - 2, 6)) + domain[domain.length - 1];
}

// GET: Holt den aktuellen MOCO-Integrationsstatus für den User
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    const integration = await prisma.mocoIntegration.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        instanceDomain: true,
        mocoEmail: true,
        lastSyncAt: true,
        lastSyncStatus: true,
        lastSyncError: true,
        isActive: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      hasIntegration: !!integration,
      integration: integration ? {
        // Sensible Daten maskiert zurückgeben
        instanceDomain: maskDomain(integration.instanceDomain),
        mocoEmail: integration.mocoEmail ? maskEmail(integration.mocoEmail) : null,
        lastSyncAt: integration.lastSyncAt,
        lastSyncStatus: integration.lastSyncStatus,
        lastSyncError: integration.lastSyncError,
        isActive: integration.isActive,
        createdAt: integration.createdAt
      } : null
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der MOCO-Integration:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

// POST: Speichert oder aktualisiert die MOCO-Integration
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    const body = await request.json();
    const { apiKey, instanceDomain, mocoEmail } = body;

    // Validierung
    if (!apiKey || !instanceDomain || !mocoEmail) {
      return NextResponse.json(
        { error: 'API-Key, Instance-Domain und MOCO E-Mail sind erforderlich' },
        { status: 400 }
      );
    }

    // E-Mail-Format validieren
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(mocoEmail)) {
      return NextResponse.json(
        { error: 'Ungültiges E-Mail-Format' },
        { status: 400 }
      );
    }

    if (!isValidApiKey(apiKey)) {
      return NextResponse.json(
        { error: 'Ungültiges API-Key Format' },
        { status: 400 }
      );
    }

    // Instance-Domain bereinigen (nur den Subdomain-Teil)
    const cleanDomain = instanceDomain
      .toLowerCase()
      .replace(/\.mocoapp\.com.*$/, '')
      .replace(/^https?:\/\//, '')
      .trim();

    if (!cleanDomain || cleanDomain.length < 2) {
      return NextResponse.json(
        { error: 'Ungültige Instance-Domain' },
        { status: 400 }
      );
    }

    // API-Key verschlüsseln
    const { encrypted, iv } = encrypt(apiKey);

    // Verbindung testen UND E-Mail validieren
    const testResult = await testMocoConnection(encrypted, iv, cleanDomain, mocoEmail.trim());
    if (!testResult.success) {
      return NextResponse.json(
        { error: `Verbindungstest fehlgeschlagen: ${testResult.error}` },
        { status: 400 }
      );
    }

    // Integration speichern oder aktualisieren
    const integration = await prisma.mocoIntegration.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        apiKeyEncrypted: encrypted,
        apiKeyIv: iv,
        instanceDomain: cleanDomain,
        mocoEmail: mocoEmail.trim().toLowerCase(),
        isActive: true
      },
      update: {
        apiKeyEncrypted: encrypted,
        apiKeyIv: iv,
        instanceDomain: cleanDomain,
        mocoEmail: mocoEmail.trim().toLowerCase(),
        isActive: true,
        lastSyncError: null
      }
    });

    return NextResponse.json({
      success: true,
      message: `Verbindung erfolgreich hergestellt für ${testResult.userName}`,
      integration: {
        // Maskierte Daten zurückgeben
        instanceDomain: maskDomain(integration.instanceDomain),
        mocoEmail: integration.mocoEmail ? maskEmail(integration.mocoEmail) : null,
        isActive: integration.isActive
      }
    });
  } catch (error) {
    console.error('Fehler beim Speichern der MOCO-Integration:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

// DELETE: Entfernt die MOCO-Integration
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    await prisma.mocoIntegration.deleteMany({
      where: { userId: user.id }
    });

    return NextResponse.json({ success: true, message: 'Integration entfernt' });
  } catch (error) {
    console.error('Fehler beim Entfernen der MOCO-Integration:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
