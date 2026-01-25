import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { RessourcenClient } from './ressourcen-client';

export const dynamic = 'force-dynamic';

export default async function RessourcenPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  // Alle User mit ihren zugewiesenen SubTasks laden
  // Wichtig: TeamMember-Zuordnungen enthalten die tatsächlichen Arbeitsstunden
  // Admins werden ausgeschlossen
  const usersRaw = await prisma.user.findMany({
    where: {
      // Admins aus der Ressourcen-Übersicht ausschließen
      role: { notIn: ['admin', 'administrator'] }
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      weeklyHours: true,
      workloadPercent: true,
      // TeamMember-Zuordnung für die tatsächlichen Arbeitsstunden
      teamMemberships: {
        select: {
          weeklyHours: true,
          workloadPercent: true,
          team: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      },
      assignedSubTasks: {
        where: {
          completed: false
        },
        select: {
          id: true,
          title: true,
          estimatedHours: true,
          dueDate: true,
          completed: true,
          ticket: {
            select: {
              id: true,
              title: true,
              status: true
            }
          }
        },
        orderBy: {
          dueDate: 'asc'
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  });

  // Verwende TeamMember-Stunden wenn vorhanden, sonst User-Defaults
  // Bei mehreren Team-Mitgliedschaften: SUMMIERE die verfügbaren Stunden
  const users = usersRaw.map(user => {
    let weeklyHours = user.weeklyHours;
    let workloadPercent = user.workloadPercent;
    
    // Wenn User TeamMember-Zuordnungen hat, verwende diese Werte
    if (user.teamMemberships && user.teamMemberships.length > 0) {
      // Berechne die tatsächlich verfügbaren Stunden pro Team und summiere
      // Formel: weeklyHours * workloadPercent / 100 = verfügbare Stunden
      const totalAvailableHours = user.teamMemberships.reduce((sum, tm) => {
        return sum + (tm.weeklyHours * tm.workloadPercent / 100);
      }, 0);
      
      // Setze weeklyHours auf die Gesamtsumme und workloadPercent auf 100
      // damit die Client-Berechnung (weeklyHours * workloadPercent / 100) korrekt ist
      weeklyHours = totalAvailableHours;
      workloadPercent = 100;
    }
    
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      weeklyHours,
      workloadPercent,
      assignedSubTasks: user.assignedSubTasks,
    };
  });

  // Alle Projekte mit SubTasks für Timeline
  const projects = await prisma.ticket.findMany({
    where: {
      status: {
        in: ['open', 'in_progress']
      }
    },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      subTasks: {
        where: {
          completed: false,
          dueDate: { not: null }
        },
        select: {
          id: true,
          title: true,
          estimatedHours: true,
          dueDate: true,
          assigneeId: true,
          assignee: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          dueDate: 'asc'
        }
      }
    },
    orderBy: {
      title: 'asc'
    }
  });

  return <RessourcenClient users={users} projects={projects} />;
}
