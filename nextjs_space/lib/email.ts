import nodemailer from 'nodemailer';
import prisma from './db';

// Get SMTP configuration from environment variables
async function getEmailConfig() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.warn('Email configuration not set up');
    return null;
  }

  return {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
  };
}

// Create transporter
async function createTransporter() {
  const config = await getEmailConfig();
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
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  try {
    const transporter = await createTransporter();
    if (!transporter) {
      console.warn('Email transporter not configured');
      return false;
    }

    const config = await getEmailConfig();
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
