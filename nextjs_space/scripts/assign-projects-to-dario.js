const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

async function main() {
  try {
    // Find Dario's user
    const dario = await prisma.user.findUnique({
      where: { email: 'dario@schnyder-werbung.ch' }
    });
    
    if (!dario) {
      console.log('❌ Dario nicht gefunden');
      return;
    }
    
    console.log('✅ Dario gefunden:', dario.id, '-', dario.name);
    
    // Get all tickets (Projekte)
    const allTickets = await prisma.ticket.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        createdBy: {
          select: { name: true, email: true }
        }
      }
    });
    
    console.log('\n📋 Alle Tickets/Projekte vor der Aktualisierung:');
    allTickets.forEach(t => {
      console.log('  -', t.title, `(${t.status})`, '| Erstellt von:', t.createdBy.name || t.createdBy.email);
    });
    
    // Update all tickets to be created by Dario
    const updated = await prisma.ticket.updateMany({
      where: {},
      data: {
        createdById: dario.id
      }
    });
    
    console.log('\n✅ Aktualisiert:', updated.count, 'Tickets/Projekte');
    
    // Verify
    const updatedTickets = await prisma.ticket.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        createdBy: {
          select: { name: true, email: true }
        }
      }
    });
    
    console.log('\n📋 Alle Tickets/Projekte nach der Aktualisierung:');
    updatedTickets.forEach(t => {
      console.log('  -', t.title, `(${t.status})`, '| Erstellt von:', t.createdBy.name || t.createdBy.email);
    });
  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();