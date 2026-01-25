import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { isAdmin as checkIsAdmin, isKoordinatorOrHigher } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// GET - Fetch tasks for a user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user info including team memberships
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        role: true, 
        teamId: true,
        teamMemberships: { select: { teamId: true } }
      },
    });

    // Aus Datenschutzgründen sehen Admins keine Projekt-/Task-Details
    if (checkIsAdmin(currentUser?.role)) {
      return NextResponse.json({ tasks: [], message: 'Admins haben aus Datenschutzgründen keinen Zugriff auf Task-Details' });
    }

    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId') || session.user.id;
    const filter = searchParams.get('filter') || 'all';

    // Check permissions - Projektleiter haben gleiche Rechte wie Koordinator (Admin bereits ausgeschlossen)
    const isKoordinator = isKoordinatorOrHigher(currentUser?.role);
    
    // Collect all team IDs the current user belongs to
    const currentUserTeamIds: string[] = [];
    if (currentUser?.teamId) currentUserTeamIds.push(currentUser.teamId);
    currentUser?.teamMemberships?.forEach(tm => {
      if (!currentUserTeamIds.includes(tm.teamId)) currentUserTeamIds.push(tm.teamId);
    });
    
    // If not koordinator/projektleiter, can only view own tasks
    let userId = session.user.id;
    
    if (requestedUserId !== session.user.id) {
      if (isKoordinator && currentUserTeamIds.length > 0) {
        // Get requested user's teams
        const requestedUser = await prisma.user.findUnique({
          where: { id: requestedUserId },
          select: { 
            teamId: true,
            teamMemberships: { select: { teamId: true } }
          },
        });
        
        // Collect all team IDs the requested user belongs to
        const requestedUserTeamIds: string[] = [];
        if (requestedUser?.teamId) requestedUserTeamIds.push(requestedUser.teamId);
        requestedUser?.teamMemberships?.forEach(tm => {
          if (!requestedUserTeamIds.includes(tm.teamId)) requestedUserTeamIds.push(tm.teamId);
        });
        
        // Check if they share at least one team
        const sharedTeam = currentUserTeamIds.some(teamId => requestedUserTeamIds.includes(teamId));
        
        if (sharedTeam) {
          userId = requestedUserId;
        }
      }
    }

    // Build where clause
    const whereClause: any = {
      assigneeId: userId,
    };

    if (filter === 'open') {
      whereClause.completed = false;
    } else if (filter === 'done') {
      whereClause.completed = true;
    }

    const tasks = await prisma.subTask.findMany({
      where: whereClause,
      include: {
        ticket: true,
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [
        { completed: 'asc' },
        { dueDate: 'asc' },
      ],
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('GET /api/tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
