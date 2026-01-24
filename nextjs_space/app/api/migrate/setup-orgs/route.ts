import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Einmalige Migration - NACH DER AUSFÜHRUNG LÖSCHEN!
export async function GET(request: NextRequest) {
  try {
    // Sicherheitstoken prüfen
    const token = request.nextUrl.searchParams.get('token');
    if (token !== 'setup-wireon-schnyder-2024') {
      return NextResponse.json({ error: 'Ungültiges Token' }, { status: 401 });
    }
    
    // Prüfen ob schon Organisationen existieren
    const existingOrgs = await prisma.organization.count();
    if (existingOrgs > 0) {
      // Bestehende Orgs und Teams zurückgeben
      const orgs = await prisma.organization.findMany({
        include: {
          teams: true,
          _count: { select: { users: true } }
        }
      });
      return NextResponse.json({
        message: 'Organisationen existieren bereits',
        organizations: orgs
      });
    }
    
    // 1. Organisation "wireon" erstellen
    const wireonOrg = await prisma.organization.create({
      data: {
        name: 'wireon',
        slug: 'wireon',
        description: 'wireon Organisation'
      }
    });
    
    // 2. Organisation "Schnyder Werbung" erstellen
    const schnyderOrg = await prisma.organization.create({
      data: {
        name: 'Schnyder Werbung',
        slug: 'schnyder-werbung',
        description: 'Schnyder Werbung Organisation'
      }
    });
    
    // 3. Alle Teams abrufen
    const allTeams = await prisma.team.findMany();
    
    // 4. Team "wireon" finden und zuordnen
    const wireonTeam = allTeams.find(t => 
      t.name.toLowerCase().includes('wireon')
    );
    
    let wireonTeamAssigned = null;
    if (wireonTeam) {
      await prisma.team.update({
        where: { id: wireonTeam.id },
        data: { organizationId: wireonOrg.id }
      });
      
      await prisma.user.updateMany({
        where: { teamId: wireonTeam.id },
        data: { organizationId: wireonOrg.id }
      });
      
      wireonTeamAssigned = wireonTeam.name;
    }
    
    // 5. Alle anderen Teams zu "Schnyder Werbung" zuordnen
    const otherTeams = allTeams.filter(t => t.id !== wireonTeam?.id);
    const schnyderTeamsAssigned: string[] = [];
    
    for (const team of otherTeams) {
      await prisma.team.update({
        where: { id: team.id },
        data: { organizationId: schnyderOrg.id }
      });
      
      await prisma.user.updateMany({
        where: { teamId: team.id },
        data: { organizationId: schnyderOrg.id }
      });
      
      schnyderTeamsAssigned.push(team.name);
    }
    
    // 6. User ohne Team zur Schnyder Werbung zuordnen
    const usersWithoutOrg = await prisma.user.updateMany({
      where: {
        organizationId: null
      },
      data: { organizationId: schnyderOrg.id }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Organisationen erfolgreich erstellt und Teams zugeordnet',
      result: {
        wireonOrg: {
          id: wireonOrg.id,
          name: wireonOrg.name,
          teamAssigned: wireonTeamAssigned
        },
        schnyderOrg: {
          id: schnyderOrg.id,
          name: schnyderOrg.name,
          teamsAssigned: schnyderTeamsAssigned
        },
        usersWithoutTeamAssigned: usersWithoutOrg.count
      }
    });
    
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Migration', details: String(error) },
      { status: 500 }
    );
  }
}
