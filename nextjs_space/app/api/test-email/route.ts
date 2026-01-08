import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

/**
 * Test-Route für E-Mail-Benachrichtigungen
 * 
 * Verwendung:
 * GET /api/test-email?to=test@example.com
 * 
 * Nur für Admins verfügbar!
 */
export async function GET(req: Request) {
  try {
    // Authentifizierung prüfen
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    // Admin-Rechte prüfen
    const userEmail = session.user.email;
    if (!userEmail) {
      return NextResponse.json(
        { error: 'Keine E-Mail-Adresse gefunden' },
        { status: 400 }
      );
    }

    // E-Mail-Adresse aus Query-Parameter
    const { searchParams } = new URL(req.url);
    const toEmail = searchParams.get('to') || userEmail;

    // Test-E-Mail senden
    const companyName = process.env.COMPANY_NAME || 'planbar';
    const primaryColor = process.env.PRIMARY_COLOR || '#3b82f6';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(to right, ${primaryColor}, #8b5cf6); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 32px;">✅ ${companyName}</h1>
        </div>
        <div style="padding: 40px; background-color: #f9fafb;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">E-Mail-Test erfolgreich!</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Glückwunsch! Ihre SMTP-Konfiguration funktioniert einwandfrei.
          </p>
          <div style="background-color: white; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #10b981;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937;">🚀 Konfigurationsdetails:</h3>
            <table style="width: 100%; color: #6b7280; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0;"><strong>SMTP Host:</strong></td>
                <td style="padding: 8px 0;">${process.env.SMTP_HOST || 'Nicht konfiguriert'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>SMTP Port:</strong></td>
                <td style="padding: 8px 0;">${process.env.SMTP_PORT || 'Nicht konfiguriert'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>SMTP User:</strong></td>
                <td style="padding: 8px 0;">${process.env.SMTP_USER || 'Nicht konfiguriert'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Von-Adresse:</strong></td>
                <td style="padding: 8px 0;">${process.env.SMTP_FROM || process.env.SMTP_USER || 'Nicht konfiguriert'}</td>
              </tr>
            </table>
          </div>
          <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h4 style="margin: 0 0 10px 0; color: #1e40af;">💡 Was als nächstes?</h4>
            <ul style="color: #4b5563; margin: 10px 0; padding-left: 20px;">
              <li style="margin: 8px 0;">Erstellen Sie ein Ticket und weisen Sie es zu</li>
              <li style="margin: 8px 0;">Fügen Sie einen Subtask hinzu und weisen Sie ihn zu</li>
              <li style="margin: 8px 0;">Ändern Sie den Status eines Tickets</li>
              <li style="margin: 8px 0;">Markieren Sie einen Subtask als erledigt</li>
            </ul>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            <strong>Hinweis:</strong> Benutzer können E-Mail-Benachrichtigungen in ihrem Profil aktivieren/deaktivieren.
          </p>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 14px; background-color: #f3f4f6;">
          <p style="margin: 5px 0;">${companyName} - Ticket Management System</p>
          <p style="margin: 5px 0;">Gesendet: ${new Date().toLocaleString('de-DE')}</p>
        </div>
      </div>
    `;

    const result = await sendEmail({
      to: toEmail,
      subject: `✅ Test E-Mail von ${companyName}`,
      html,
    });

    if (result) {
      return NextResponse.json({
        success: true,
        message: 'Test-E-Mail erfolgreich versendet!',
        recipient: toEmail,
        smtpConfig: {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          user: process.env.SMTP_USER,
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'E-Mail konnte nicht versendet werden. Prüfen Sie die SMTP-Konfiguration.',
          smtpConfigured: {
            host: !!process.env.SMTP_HOST,
            port: !!process.env.SMTP_PORT,
            user: !!process.env.SMTP_USER,
            password: !!process.env.SMTP_PASSWORD,
          },
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Test-E-Mail Fehler:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Versenden der Test-E-Mail',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
