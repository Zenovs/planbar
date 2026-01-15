import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { RessourcenClient } from './ressourcen-client';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function RessourcenPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  // Alle User mit ihren zugewiesenen SubTasks laden
  // Wichtig: TeamMember-Zuordnungen enthalten die tatsächlichen Arbeitsstunden
  const usersRaw = await prisma.user.findMany({
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
  // Bei mehreren Team-Mitgliedschaften: Summiere die Stunden
  const users = usersRaw.map(user => {
    let weeklyHours = user.weeklyHours;
    let workloadPercent = user.workloadPercent;
    
    // Wenn User TeamMember-Zuordnungen hat, verwende diese Werte
    if (user.teamMemberships && user.teamMemberships.length > 0) {
      // Bei einer Team-Mitgliedschaft: verwende diese Werte direkt
      if (user.teamMemberships.length === 1) {
        weeklyHours = user.teamMemberships[0].weeklyHours;
        workloadPercent = user.teamMemberships[0].workloadPercent;
      } else {
        // Bei mehreren Teams: Durchschnitt der Werte (oder Summe je nach Logik)
        // Hier verwenden wir den Durchschnitt
        const totalWeeklyHours = user.teamMemberships.reduce(
          (sum, tm) => sum + tm.weeklyHours, 0
        );
        const avgWorkload = user.teamMemberships.reduce(
          (sum, tm) => sum + tm.workloadPercent, 0
        ) / user.teamMemberships.length;
        
        weeklyHours = totalWeeklyHours / user.teamMemberships.length;
        workloadPercent = Math.round(avgWorkload);
      }
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
