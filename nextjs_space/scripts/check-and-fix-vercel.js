const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Get Dario user
  const dario = await prisma.user.findUnique({
    where: { email: 'dario@schnyder-werbung.ch' }
  });
  
  console.log('Dario User:', dario);
  
  if (!dario) {
    console.log('Dario not found!');
    return;
  }
  
  // Ensure Dario is admin
  if (dario.role !== 'admin') {
    console.log('Making Dario admin...');
    await prisma.user.update({
      where: { id: dario.id },
      data: { role: 'admin' }
    });
    console.log('Dario is now admin');
  }
  
  // Check all tickets
  const tickets = await prisma.ticket.findMany();
  console.log('Total tickets:', tickets.length);
  
  // Assign all tickets to Dario
  const updated = await prisma.ticket.updateMany({
    data: { assignedToId: dario.id }
  });
  console.log('Tickets assigned to Dario:', updated.count);
  
  // Verify
  const verify = await prisma.ticket.findMany({
    where: { assignedToId: dario.id }
  });
  console.log('Verified tickets for Dario:', verify.length);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
