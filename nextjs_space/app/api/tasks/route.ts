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

    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId') || session.user.id;
    const filter = searchParams.get('filter') || 'all';

    // Get current user info
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, teamId: true },
    });

    // Check permissions - Projektleiter haben gleiche Rechte wie Koordinator
    const isAdmin = checkIsAdmin(currentUser?.role);
    const isKoordinator = isKoordinatorOrHigher(currentUser?.role);
    
    // If not admin/koordinator/projektleiter, can only view own tasks
    let userId = session.user.id;
    
    if (requestedUserId !== session.user.id) {
      if (isAdmin) {
        userId = requestedUserId;
      } else if (isKoordinator && currentUser?.teamId) {
        // Check if requested user is in same team
        const requestedUser = await prisma.user.findUnique({
          where: { id: requestedUserId },
          select: { teamId: true },
        });
        
        const isInTeam = requestedUser?.teamId === currentUser.teamId;
        
        // Also check TeamMember table
        const teamMembership = await prisma.teamMember.findFirst({
          where: {
            userId: requestedUserId,
            teamId: currentUser.teamId,
          },
        });
        
        if (isInTeam || teamMembership) {
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
