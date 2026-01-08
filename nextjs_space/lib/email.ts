import nodemailer from 'nodemailer';
import prisma from './db';

// Get SMTP configuration from environment variables
async function getEmailConfig(type: 'default' | 'login' | 'update' = 'default') {
  let host, port, user, password, from;

  switch (type) {
    case 'login':
      host = process.env.SMTP_LOGIN_HOST;
      port = process.env.SMTP_LOGIN_PORT;
      user = process.env.SMTP_LOGIN_USER;
      password = process.env.SMTP_LOGIN_PASSWORD;
      from = process.env.SMTP_LOGIN_FROM;
      break;
    case 'update':
      host = process.env.SMTP_UPDATE_HOST;
      port = process.env.SMTP_UPDATE_PORT;
      user = process.env.SMTP_UPDATE_USER;
      password = process.env.SMTP_UPDATE_PASSWORD;
      from = process.env.SMTP_UPDATE_FROM;
      break;
    default:
      host = process.env.SMTP_HOST;
      port = process.env.SMTP_PORT;
      user = process.env.SMTP_USER;
      password = process.env.SMTP_PASSWORD;
      from = process.env.SMTP_FROM;
  }

  if (!host || !user || !password) {
    console.warn(`Email configuration for ${type} not set up`);
    return null;
  }

  return {
    host,
    port: parseInt(port || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user,
      pass: password,
    },
    from: from || user,
  };
}

// Create transporter
async function createTransporter(type: 'default' | 'login' | 'update' = 'default') {
  const config = await getEmailConfig(type);
  if (!config) return null;

  const { from, ...smtpConfig } = config;
  return nodemailer.createTransport(smtpConfig);
}

// Send email
export async function sendEmail({
  to,
  subject,
  html,
  text,
  type = 'default',
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  type?: 'default' | 'login' | 'update';
}) {
  try {
    const transporter = await createTransporter(type);
    if (!transporter) {
      console.warn(`Email transporter (${type}) not configured`);
      return false;
    }

    const config = await getEmailConfig(type);
    if (!config) return false;

    await transporter.sendMail({
      from: config.from,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version
    });

    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

// Email templates
export async function sendTicketAssignedEmail(
  assigneeEmail: string,
  assigneeName: string,
  ticketTitle: string,
  ticketId: string,
  assignedBy: string
) {
  
  const companyName = process.env.COMPANY_NAME || 'planbar';
  const primaryColor = process.env.PRIMARY_COLOR || '#3b82f6';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(to right, ${primaryColor}, #8b5cf6); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">${companyName}</h1>
      </div>
      <div style="padding: 30px; background-color: #f9fafb;">
        <h2 style="color: #1f2937;">Neues Ticket zugewiesen</h2>
        <p style="color: #4b5563; font-size: 16px;">
          Hallo ${assigneeName},
        </p>
        <p style="color: #4b5563; font-size: 16px;">
          Ihnen wurde ein neues Ticket zugewiesen:
        </p>
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${primaryColor};">
          <h3 style="margin: 0 0 10px 0; color: #1f2937;">${ticketTitle}</h3>
          <p style="color: #6b7280; margin: 0;">Zugewiesen von: ${assignedBy}</p>
        </div>
        <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/tickets/${ticketId}" 
           style="display: inline-block; background: linear-gradient(to right, ${primaryColor}, #8b5cf6); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Ticket anzeigen
        </a>
      </div>
      <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 14px;">
        <p>${companyName} - Ticket Management System</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: assigneeEmail,
    subject: `Neues Ticket zugewiesen: ${ticketTitle}`,
    html,
  });
}

export async function sendTicketStatusChangedEmail(
  userEmail: string,
  userName: string,
  ticketTitle: string,
  ticketId: string,
  oldStatus: string,
  newStatus: string,
  changedBy: string
) {
  
  const companyName = process.env.COMPANY_NAME || 'planbar';
  const primaryColor = process.env.PRIMARY_COLOR || '#3b82f6';

  const statusColors: Record<string, string> = {
    open: '#3b82f6',
    in_progress: '#f59e0b',
    done: '#10b981',
    closed: '#6b7280',
  };

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(to right, ${primaryColor}, #8b5cf6); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">${companyName}</h1>
      </div>
      <div style="padding: 30px; background-color: #f9fafb;">
        <h2 style="color: #1f2937;">Ticket-Status geändert</h2>
        <p style="color: #4b5563; font-size: 16px;">
          Hallo ${userName},
        </p>
        <p style="color: #4b5563; font-size: 16px;">
          Der Status eines Tickets wurde geändert:
        </p>
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${primaryColor};">
          <h3 style="margin: 0 0 10px 0; color: #1f2937;">${ticketTitle}</h3>
          <div style="margin: 15px 0;">
            <span style="background-color: ${statusColors[oldStatus] || '#6b7280'}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 14px;">
              ${oldStatus}
            </span>
            <span style="margin: 0 10px; color: #6b7280;">→</span>
            <span style="background-color: ${statusColors[newStatus] || '#6b7280'}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 14px;">
              ${newStatus}
            </span>
          </div>
          <p style="color: #6b7280; margin: 10px 0 0 0;">Geändert von: ${changedBy}</p>
        </div>
        <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/tickets/${ticketId}" 
           style="display: inline-block; background: linear-gradient(to right, ${primaryColor}, #8b5cf6); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Ticket anzeigen
        </a>
      </div>
      <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 14px;">
        <p>${companyName} - Ticket Management System</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: userEmail,
    subject: `Ticket-Status geändert: ${ticketTitle}`,
    html,
  });
}

export async function sendTicketCreatedEmail(
  assigneeEmail: string,
  assigneeName: string,
  ticketTitle: string,
  ticketId: string,
  createdBy: string
) {
  
  const companyName = process.env.COMPANY_NAME || 'planbar';
  const primaryColor = process.env.PRIMARY_COLOR || '#3b82f6';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(to right, ${primaryColor}, #8b5cf6); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">${companyName}</h1>
      </div>
      <div style="padding: 30px; background-color: #f9fafb;">
        <h2 style="color: #1f2937;">Neues Ticket erstellt</h2>
        <p style="color: #4b5563; font-size: 16px;">
          Hallo ${assigneeName},
        </p>
        <p style="color: #4b5563; font-size: 16px;">
          Ein neues Ticket wurde für Sie erstellt:
        </p>
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${primaryColor};">
          <h3 style="margin: 0 0 10px 0; color: #1f2937;">${ticketTitle}</h3>
          <p style="color: #6b7280; margin: 0;">Erstellt von: ${createdBy}</p>
        </div>
        <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/tickets/${ticketId}" 
           style="display: inline-block; background: linear-gradient(to right, ${primaryColor}, #8b5cf6); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Ticket anzeigen
        </a>
      </div>
      <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 14px;">
        <p>${companyName} - Ticket Management System</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: assigneeEmail,
    subject: `Neues Ticket erstellt: ${ticketTitle}`,
    html,
  });
}

// Subtask E-Mail-Benachrichtigungen
export async function sendSubTaskAssignedEmail(
  assigneeEmail: string,
  assigneeName: string,
  subTaskTitle: string,
  ticketTitle: string,
  ticketId: string,
  assignedBy: string,
  dueDate?: Date
) {
  
  const companyName = process.env.COMPANY_NAME || 'planbar';
  const primaryColor = process.env.PRIMARY_COLOR || '#3b82f6';

  const dueDateText = dueDate 
    ? `<p style="color: #6b7280; margin: 5px 0 0 0;">Fällig: ${new Date(dueDate).toLocaleString('de-DE', { 
        dateStyle: 'short', 
        timeStyle: 'short' 
      })}</p>`
    : '';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(to right, ${primaryColor}, #8b5cf6); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">${companyName}</h1>
      </div>
      <div style="padding: 30px; background-color: #f9fafb;">
        <h2 style="color: #1f2937;">Neuer Subtask zugewiesen</h2>
        <p style="color: #4b5563; font-size: 16px;">
          Hallo ${assigneeName},
        </p>
        <p style="color: #4b5563; font-size: 16px;">
          Ihnen wurde ein neuer Subtask zugewiesen:
        </p>
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${primaryColor};">
          <h3 style="margin: 0 0 10px 0; color: #1f2937;">${subTaskTitle}</h3>
          <p style="color: #6b7280; margin: 5px 0 0 0;">Projekt: ${ticketTitle}</p>
          <p style="color: #6b7280; margin: 5px 0 0 0;">Zugewiesen von: ${assignedBy}</p>
          ${dueDateText}
        </div>
        <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/tickets/${ticketId}" 
           style="display: inline-block; background: linear-gradient(to right, ${primaryColor}, #8b5cf6); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Projekt anzeigen
        </a>
      </div>
      <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 14px;">
        <p>${companyName} - Ticket Management System</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: assigneeEmail,
    subject: `Neuer Subtask: ${subTaskTitle}`,
    html,
  });
}

export async function sendSubTaskCompletedEmail(
  userEmail: string,
  userName: string,
  subTaskTitle: string,
  ticketTitle: string,
  ticketId: string,
  completedBy: string
) {
  
  const companyName = process.env.COMPANY_NAME || 'planbar';
  const primaryColor = process.env.PRIMARY_COLOR || '#3b82f6';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(to right, ${primaryColor}, #8b5cf6); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">${companyName}</h1>
      </div>
      <div style="padding: 30px; background-color: #f9fafb;">
        <h2 style="color: #1f2937;">✅ Subtask erledigt</h2>
        <p style="color: #4b5563; font-size: 16px;">
          Hallo ${userName},
        </p>
        <p style="color: #4b5563; font-size: 16px;">
          Ein Subtask wurde als erledigt markiert:
        </p>
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <h3 style="margin: 0 0 10px 0; color: #1f2937;">${subTaskTitle}</h3>
          <p style="color: #6b7280; margin: 5px 0 0 0;">Projekt: ${ticketTitle}</p>
          <p style="color: #6b7280; margin: 5px 0 0 0;">Erledigt von: ${completedBy}</p>
        </div>
        <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/tickets/${ticketId}" 
           style="display: inline-block; background: linear-gradient(to right, ${primaryColor}, #8b5cf6); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Projekt anzeigen
        </a>
      </div>
      <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 14px;">
        <p>${companyName} - Ticket Management System</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: userEmail,
    subject: `Subtask erledigt: ${subTaskTitle}`,
    html,
  });
}

// Login-Benachrichtigung (noreply@planbar.dev)
export async function sendLoginNotificationEmail(
  userEmail: string,
  userName: string,
  loginTime: Date,
  ipAddress?: string,
  userAgent?: string
) {
  const companyName = process.env.COMPANY_NAME || 'planbar';
  const primaryColor = process.env.PRIMARY_COLOR || '#3b82f6';

  const locationInfo = ipAddress ? `<p style="color: #6b7280; margin: 5px 0 0 0;"><strong>IP-Adresse:</strong> ${ipAddress}</p>` : '';
  const deviceInfo = userAgent ? `<p style="color: #6b7280; margin: 5px 0 0 0;"><strong>Gerät:</strong> ${userAgent.substring(0, 100)}</p>` : '';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(to right, ${primaryColor}, #8b5cf6); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">${companyName}</h1>
      </div>
      <div style="padding: 30px; background-color: #f9fafb;">
        <h2 style="color: #1f2937;">✅ Erfolgreiche Anmeldung</h2>
        <p style="color: #4b5563; font-size: 16px;">
          Hallo ${userName},
        </p>
        <p style="color: #4b5563; font-size: 16px;">
          Sie haben sich soeben erfolgreich bei ${companyName} angemeldet.
        </p>
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <h3 style="margin: 0 0 10px 0; color: #1f2937;">Anmeldedetails</h3>
          <p style="color: #6b7280; margin: 5px 0 0 0;"><strong>Zeitpunkt:</strong> ${loginTime.toLocaleString('de-DE', { 
            dateStyle: 'full', 
            timeStyle: 'short' 
          })}</p>
          ${locationInfo}
          ${deviceInfo}
        </div>
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="color: #92400e; margin: 0; font-size: 14px;">
            <strong>⚠️ War das nicht Sie?</strong><br>
            Falls Sie sich nicht angemeldet haben, ändern Sie bitte sofort Ihr Passwort und kontaktieren Sie den Administrator.
          </p>
        </div>
        <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/profile" 
           style="display: inline-block; background: linear-gradient(to right, ${primaryColor}, #8b5cf6); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Profil anzeigen
        </a>
      </div>
      <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 14px;">
        <p>${companyName} - Sicherheitsbenachrichtigung</p>
        <p style="margin-top: 10px; font-size: 12px;">Diese E-Mail wurde automatisch versendet. Bitte antworten Sie nicht darauf.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: userEmail,
    subject: `Anmeldung bei ${companyName}`,
    html,
    type: 'login',
  });
}

// Tägliche/Wöchentliche Update-E-Mail (update@planbar.dev)
export async function sendTaskUpdateEmail(
  userEmail: string,
  userName: string,
  frequency: 'daily' | 'weekly',
  data: {
    newTickets: number;
    newSubTasks: number;
    completedSubTasks: number;
    dueSoonSubTasks: Array<{
      title: string;
      ticketTitle: string;
      ticketId: string;
      dueDate: Date;
    }>;
    recentAssignments: Array<{
      type: 'ticket' | 'subtask';
      title: string;
      ticketTitle?: string;
      ticketId: string;
      assignedBy: string;
    }>;
  }
) {
  const companyName = process.env.COMPANY_NAME || 'planbar';
  const primaryColor = process.env.PRIMARY_COLOR || '#3b82f6';

  const periodText = frequency === 'daily' ? 'heute' : 'diese Woche';
  const titleText = frequency === 'daily' ? 'Tägliches Update' : 'Wöchentliches Update';

  // Fällige Subtasks
  const dueSoonHtml = data.dueSoonSubTasks.length > 0 ? `
    <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <h3 style="margin: 0 0 15px 0; color: #1f2937;">⏰ Bald fällige Tasks (nächste 7 Tage)</h3>
      ${data.dueSoonSubTasks.map(task => `
        <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #1f2937; font-weight: bold;">${task.title}</p>
          <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Projekt: ${task.ticketTitle}</p>
          <p style="margin: 5px 0 0 0; color: #f59e0b; font-size: 14px;">
            Fällig: ${new Date(task.dueDate).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
          <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/tickets/${task.ticketId}" 
             style="color: ${primaryColor}; text-decoration: none; font-size: 14px;">→ Zum Projekt</a>
        </div>
      `).join('')}
    </div>
  ` : '';

  // Neue Zuweisungen
  const assignmentsHtml = data.recentAssignments.length > 0 ? `
    <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${primaryColor};">
      <h3 style="margin: 0 0 15px 0; color: #1f2937;">📋 Neue Zuweisungen</h3>
      ${data.recentAssignments.map(item => `
        <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #1f2937; font-weight: bold;">${item.title}</p>
          ${item.ticketTitle ? `<p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Projekt: ${item.ticketTitle}</p>` : ''}
          <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Zugewiesen von: ${item.assignedBy}</p>
          <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/tickets/${item.ticketId}" 
             style="color: ${primaryColor}; text-decoration: none; font-size: 14px;">→ Zum Projekt</a>
        </div>
      `).join('')}
    </div>
  ` : '';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(to right, ${primaryColor}, #8b5cf6); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">${companyName}</h1>
        <p style="color: white; margin: 10px 0 0 0; font-size: 18px;">${titleText}</p>
      </div>
      <div style="padding: 30px; background-color: #f9fafb;">
        <h2 style="color: #1f2937;">Hallo ${userName}! 👋</h2>
        <p style="color: #4b5563; font-size: 16px;">
          Hier ist Ihre Zusammenfassung für ${periodText}:
        </p>

        <!-- Statistiken -->
        <div style="display: flex; gap: 10px; margin: 20px 0; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 150px; background: linear-gradient(to right, ${primaryColor}, #8b5cf6); padding: 15px; border-radius: 8px; text-align: center;">
            <p style="color: white; margin: 0; font-size: 32px; font-weight: bold;">${data.newTickets}</p>
            <p style="color: white; margin: 5px 0 0 0; font-size: 14px;">Neue Projekte</p>
          </div>
          <div style="flex: 1; min-width: 150px; background: linear-gradient(to right, #f59e0b, #f97316); padding: 15px; border-radius: 8px; text-align: center;">
            <p style="color: white; margin: 0; font-size: 32px; font-weight: bold;">${data.newSubTasks}</p>
            <p style="color: white; margin: 5px 0 0 0; font-size: 14px;">Neue Tasks</p>
          </div>
          <div style="flex: 1; min-width: 150px; background: linear-gradient(to right, #10b981, #059669); padding: 15px; border-radius: 8px; text-align: center;">
            <p style="color: white; margin: 0; font-size: 32px; font-weight: bold;">${data.completedSubTasks}</p>
            <p style="color: white; margin: 5px 0 0 0; font-size: 14px;">Erledigt</p>
          </div>
        </div>

        ${dueSoonHtml}
        ${assignmentsHtml}

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard" 
             style="display: inline-block; background: linear-gradient(to right, ${primaryColor}, #8b5cf6); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Dashboard öffnen
          </a>
        </div>
      </div>
      <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 14px;">
        <p>${companyName} - ${titleText}</p>
        <p style="margin-top: 10px; font-size: 12px;">
          Diese E-Mail wurde automatisch versendet. Sie können die Häufigkeit in Ihren 
          <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/profile" style="color: ${primaryColor};">Profileinstellungen</a> ändern.
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: userEmail,
    subject: `${companyName} - ${titleText}`,
    html,
    type: 'update',
  });
}
