import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

// POST: Organisationen erstellen und Teams zuordnen
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Nur Admin darf das ausführen
    if (!session?.user || session.user.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }
    
    const { action } = await request.json();
    
    if (action !== 'setup') {
      return NextResponse.json({ error: 'Ungültige Aktion' }, { status: 400 });
    }
    
    // 1. Organisation "wireon" erstellen
    let wireonOrg = await prisma.organization.findFirst({
      where: { name: 'wireon' }
    });
    
    if (!wireonOrg) {
      wireonOrg = await prisma.organization.create({
        data: {
          name: 'wireon',
          slug: 'wireon',
          description: 'wireon Organisation'
        }
      });
    }
    
    // 2. Organisation "Schnyder Werbung" erstellen
    let schnyderOrg = await prisma.organization.findFirst({
      where: { name: 'Schnyder Werbung' }
    });
    
    if (!schnyderOrg) {
      schnyderOrg = await prisma.organization.create({
        data: {
          name: 'Schnyder Werbung',
          slug: 'schnyder-werbung',
          description: 'Schnyder Werbung Organisation'
        }
      });
    }
    
    // 3. Team "wireon" finden und zur wireon-Organisation zuordnen
    const wireonTeam = await prisma.team.findFirst({
      where: { 
        name: { contains: 'wireon', mode: 'insensitive' }
      }
    });
    
    let wireonTeamUpdated = false;
    if (wireonTeam) {
      await prisma.team.update({
        where: { id: wireonTeam.id },
        data: { organizationId: wireonOrg.id }
      });
      wireonTeamUpdated = true;
      
      // User des Teams auch zur Organisation zuordnen
      await prisma.user.updateMany({
        where: { teamId: wireonTeam.id },
        data: { organizationId: wireonOrg.id }
      });
    }
    
    // 4. Alle anderen Teams zu "Schnyder Werbung" zuordnen
    const otherTeams = await prisma.team.findMany({
      where: {
        AND: [
          { id: { not: wireonTeam?.id || 'none' } },
          {
            OR: [
              { organizationId: null },
              { organizationId: { not: wireonOrg.id } }
            ]
          }
        ]
      }
    });
    
    for (const team of otherTeams) {
      await prisma.team.update({
        where: { id: team.id },
        data: { organizationId: schnyderOrg.id }
      });
      
      // User des Teams auch zur Organisation zuordnen
      await prisma.user.updateMany({
        where: { teamId: team.id },
        data: { organizationId: schnyderOrg.id }
      });
    }
    
    // 5. User ohne Team zur Schnyder Werbung zuordnen (falls vorhanden)
    await prisma.user.updateMany({
      where: {
        AND: [
          { organizationId: null },
          { teamId: null }
        ]
      },
      data: { organizationId: schnyderOrg.id }
    });
    
    // Ergebnis zusammenfassen
    const result = {
      wireonOrg: {
        id: wireonOrg.id,
        name: wireonOrg.name,
        teamAssigned: wireonTeamUpdated ? wireonTeam?.name : null
      },
      schnyderOrg: {
        id: schnyderOrg.id,
        name: schnyderOrg.name,
        teamsAssigned: otherTeams.map(t => t.name)
      }
    };
    
    return NextResponse.json({
      success: true,
      message: 'Organisationen erfolgreich erstellt und Teams zugeordnet',
      result
    });
    
  } catch (error) {
    console.error('Setup organizations error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen der Organisationen' },
      { status: 500 }
    );
  }
}

// GET: Status der Organisationen abrufen
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }
    
    const organizations = await prisma.organization.findMany({
      include: {
        teams: {
          include: {
            _count: { select: { members: true, tickets: true } }
          }
        },
        _count: { select: { users: true } }
      }
    });
    
    const teams = await prisma.team.findMany({
      include: {
        organization: true,
        _count: { select: { members: true, tickets: true } }
      }
    });
    
    return NextResponse.json({
      organizations,
      teams,
      teamsWithoutOrg: teams.filter(t => !t.organizationId)
    });
    
  } catch (error) {
    console.error('Get organizations error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Organisationen' },
      { status: 500 }
    );
  }
}
