import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { sendSubTaskReminderEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { subTaskId } = await request.json();

    if (!subTaskId) {
      return NextResponse.json({ error: 'SubTask ID erforderlich' }, { status: 400 });
    }

    // SubTask mit Assignee und Ticket holen
    const subTask = await prisma.subTask.findUnique({
      where: { id: subTaskId },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ticket: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!subTask) {
      return NextResponse.json({ error: 'SubTask nicht gefunden' }, { status: 404 });
    }

    if (!subTask.assignee) {
      return NextResponse.json({ error: 'Kein Benutzer zugewiesen' }, { status: 400 });
    }

    // E-Mail senden
    const emailSent = await sendSubTaskReminderEmail(
      subTask.assignee.email,
      subTask.assignee.name || subTask.assignee.email,
      subTask.title,
      subTask.ticket.title,
      subTask.ticket.id,
      session.user.name || session.user.email || 'Jemand',
      subTask.dueDate || undefined
    );

    if (!emailSent) {
      return NextResponse.json({ error: 'E-Mail konnte nicht gesendet werden' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Erinnerung an ${subTask.assignee.name || subTask.assignee.email} gesendet` 
    });
  } catch (error) {
    console.error('Error sending reminder:', error);
    return NextResponse.json({ error: 'Fehler beim Senden der Erinnerung' }, { status: 500 });
  }
}
