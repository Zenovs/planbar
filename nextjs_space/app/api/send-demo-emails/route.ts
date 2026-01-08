import { NextRequest, NextResponse } from 'next/server';
import { 
  sendTicketAssignedEmail, 
  sendSubTaskAssignedEmail,
  sendLoginNotificationEmail,
  sendTaskUpdateEmail,
} from '@/lib/email';

export const dynamic = 'force-dynamic';

/**
 * Demo-Route: Versendet alle drei E-Mail-Typen an eine Test-Adresse
 * 
 * GET /api/send-demo-emails?to=dario@schnyder-werbung.ch
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const recipientEmail = searchParams.get('to') || 'dario@schnyder-werbung.ch';
    const recipientName = 'Dario Schnyder';

    const results = {
      ticketNotification: false,
      subtaskNotification: false,
      loginNotification: false,
      updateEmail: false,
    };

    const errors: string[] = [];

    // 1. Ticket-Benachrichtigung (noreply@planbar.dev)
    console.log('\n=== Sende Ticket-Benachrichtigung ===');
    try {
      results.ticketNotification = await sendTicketAssignedEmail(
        recipientEmail,
        recipientName,
        'Demo-Projekt: Website Redesign',
        'demo-ticket-123',
        'Max Mustermann'
      );
      console.log('✅ Ticket-Benachrichtigung:', results.ticketNotification ? 'Erfolg' : 'Fehlgeschlagen');
    } catch (error: any) {
      errors.push(`Ticket-Benachrichtigung: ${error.message}`);
      console.error('❌ Ticket-Benachrichtigung Fehler:', error);
    }

    // 2. Subtask-Benachrichtigung (noreply@planbar.dev)
    console.log('\n=== Sende Subtask-Benachrichtigung ===');
    try {
      results.subtaskNotification = await sendSubTaskAssignedEmail(
        recipientEmail,
        recipientName,
        'Demo-Task: Logo-Design überarbeiten',
        'Demo-Projekt: Website Redesign',
        'demo-ticket-123',
        'Sarah Schmidt',
        new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // In 3 Tagen
        8 // 8 Stunden geschätzt
      );
      console.log('✅ Subtask-Benachrichtigung:', results.subtaskNotification ? 'Erfolg' : 'Fehlgeschlagen');
    } catch (error: any) {
      errors.push(`Subtask-Benachrichtigung: ${error.message}`);
      console.error('❌ Subtask-Benachrichtigung Fehler:', error);
    }

    // 3. Login-Benachrichtigung (noreply@planbar.dev via SMTP_LOGIN_*)
    console.log('\n=== Sende Login-Benachrichtigung ===');
    try {
      results.loginNotification = await sendLoginNotificationEmail(
        recipientEmail,
        recipientName,
        new Date(),
        '203.0.113.42', // Demo-IP
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' // Demo User-Agent
      );
      console.log('✅ Login-Benachrichtigung:', results.loginNotification ? 'Erfolg' : 'Fehlgeschlagen');
    } catch (error: any) {
      errors.push(`Login-Benachrichtigung: ${error.message}`);
      console.error('❌ Login-Benachrichtigung Fehler:', error);
    }

    // 4. Update-E-Mail (update@planbar.dev)
    console.log('\n=== Sende Tägliches Update ===');
    try {
      // Demo-Daten für Update-E-Mail
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const dayAfterTomorrow = new Date(today);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

      results.updateEmail = await sendTaskUpdateEmail(
        recipientEmail,
        recipientName,
        'daily',
        {
          newTickets: 3,
          newSubTasks: 7,
          completedSubTasks: 5,
          dueSoonSubTasks: [
            {
              title: 'Website-Mockups finalisieren',
              ticketTitle: 'Website Redesign',
              ticketId: 'demo-ticket-1',
              dueDate: tomorrow,
            },
            {
              title: 'Kundenfeedback einarbeiten',
              ticketTitle: 'Marketing Kampagne',
              ticketId: 'demo-ticket-2',
              dueDate: dayAfterTomorrow,
            },
          ],
          recentAssignments: [
            {
              type: 'ticket',
              title: 'Social Media Strategie 2026',
              ticketId: 'demo-ticket-3',
              assignedBy: 'Anna Meier',
            },
            {
              type: 'subtask',
              title: 'Instagram-Posts vorbereiten',
              ticketTitle: 'Social Media Strategie 2026',
              ticketId: 'demo-ticket-3',
              assignedBy: 'Anna Meier',
            },
            {
              type: 'subtask',
              title: 'SEO-Keywords recherchieren',
              ticketTitle: 'Website Redesign',
              ticketId: 'demo-ticket-1',
              assignedBy: 'Thomas Müller',
            },
          ],
        }
      );
      console.log('✅ Update-E-Mail:', results.updateEmail ? 'Erfolg' : 'Fehlgeschlagen');
    } catch (error: any) {
      errors.push(`Update-E-Mail: ${error.message}`);
      console.error('❌ Update-E-Mail Fehler:', error);
    }

    // Zusammenfassung
    const successCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;

    return NextResponse.json({
      success: successCount > 0,
      recipient: recipientEmail,
      results: {
        '1_ticketNotification': {
          sent: results.ticketNotification,
          from: 'noreply@planbar.dev (SMTP_HOST)',
          subject: 'Neues Projekt zugewiesen: Demo-Projekt: Website Redesign',
          description: 'Benachrichtigung über neu zugewiesenes Ticket',
        },
        '2_subtaskNotification': {
          sent: results.subtaskNotification,
          from: 'noreply@planbar.dev (SMTP_HOST)',
          subject: 'Neue Aufgabe: Demo-Task: Logo-Design überarbeiten',
          description: 'Benachrichtigung über neu zugewiesenen Subtask',
        },
        '3_loginNotification': {
          sent: results.loginNotification,
          from: 'noreply@planbar.dev (SMTP_LOGIN_HOST)',
          subject: 'Anmeldung bei planbar',
          description: 'Sicherheits-Benachrichtigung bei Login',
        },
        '4_updateEmail': {
          sent: results.updateEmail,
          from: 'update@planbar.dev (SMTP_UPDATE_HOST)',
          subject: 'planbar - Tägliches Update',
          description: 'Tägliche Zusammenfassung mit Statistiken',
        },
      },
      summary: {
        total: totalCount,
        successful: successCount,
        failed: totalCount - successCount,
      },
      errors: errors.length > 0 ? errors : undefined,
      message: successCount === totalCount 
        ? `✅ Alle ${totalCount} Demo-E-Mails erfolgreich an ${recipientEmail} versendet!`
        : `⚠️ ${successCount} von ${totalCount} E-Mails versendet. Prüfen Sie die Fehler.`,
    });
  } catch (error: any) {
    console.error('Fehler beim Versenden der Demo-E-Mails:', error);
    return NextResponse.json(
      { 
        error: 'Fehler beim Versenden der Demo-E-Mails', 
        details: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
