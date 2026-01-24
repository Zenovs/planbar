/**
 * Automatisches Setup-Script für Organisationen
 * Wird einmalig beim Build ausgeführt, wenn noch keine Organisationen existieren
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🏢 Prüfe Organisations-Setup...');
  
  // Prüfen ob schon Organisationen existieren
  const existingOrgs = await prisma.organization.count();
  if (existingOrgs > 0) {
    console.log('✅ Organisationen existieren bereits, überspringe Setup');
    return;
  }
  
  console.log('🔧 Erstelle Organisationen...');
  
  // 1. Organisation "wireon" erstellen
  const wireonOrg = await prisma.organization.create({
    data: {
      name: 'wireon',
      slug: 'wireon',
      description: 'wireon Organisation'
    }
  });
  console.log(`✅ Organisation erstellt: ${wireonOrg.name}`);
  
  // 2. Organisation "Schnyder Werbung" erstellen
  const schnyderOrg = await prisma.organization.create({
    data: {
      name: 'Schnyder Werbung',
      slug: 'schnyder-werbung',
      description: 'Schnyder Werbung Organisation'
    }
  });
  console.log(`✅ Organisation erstellt: ${schnyderOrg.name}`);
  
  // 3. Alle Teams abrufen
  const allTeams = await prisma.team.findMany();
  console.log(`📋 Gefundene Teams: ${allTeams.length}`);
  
  // 4. Team "wireon" finden und zuordnen
  const wireonTeam = allTeams.find(t => 
    t.name.toLowerCase().includes('wireon')
  );
  
  if (wireonTeam) {
    await prisma.team.update({
      where: { id: wireonTeam.id },
      data: { organizationId: wireonOrg.id }
    });
    
    // User des Teams zur Organisation zuordnen
    await prisma.user.updateMany({
      where: { teamId: wireonTeam.id },
      data: { organizationId: wireonOrg.id }
    });
    
    console.log(`✅ Team "${wireonTeam.name}" → wireon Organisation`);
  } else {
    console.log('⚠️ Kein Team mit "wireon" im Namen gefunden');
  }
  
  // 5. Alle anderen Teams zu "Schnyder Werbung" zuordnen
  const otherTeams = allTeams.filter(t => t.id !== (wireonTeam ? wireonTeam.id : null));
  
  for (const team of otherTeams) {
    await prisma.team.update({
      where: { id: team.id },
      data: { organizationId: schnyderOrg.id }
    });
    
    // User des Teams zur Organisation zuordnen
    await prisma.user.updateMany({
      where: { teamId: team.id },
      data: { organizationId: schnyderOrg.id }
    });
    
    console.log(`✅ Team "${team.name}" → Schnyder Werbung Organisation`);
  }
  
  // 6. User ohne Team zur Schnyder Werbung zuordnen
  const usersWithoutOrg = await prisma.user.updateMany({
    where: {
      organizationId: null
    },
    data: { organizationId: schnyderOrg.id }
  });
  
  if (usersWithoutOrg.count > 0) {
    console.log(`✅ ${usersWithoutOrg.count} Benutzer ohne Team → Schnyder Werbung`);
  }
  
  // Zusammenfassung
  console.log('\n📊 Setup abgeschlossen:');
  console.log(`   - wireon Organisation: ${wireonTeam ? '1 Team' : '0 Teams'}`);
  console.log(`   - Schnyder Werbung: ${otherTeams.length} Teams`);
}

main()
  .catch((error) => {
    console.error('❌ Fehler beim Setup:', error);
    // Fehler nicht werfen, damit Build nicht fehlschlägt
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
