const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'test@planbar.com' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      teamId: true
    }
  });
  
  const ticket = await prisma.ticket.findUnique({
    where: { id: 'cmjziq1se0001l404p98z8v7s' },
    select: {
      id: true,
      title: true,
      createdById: true,
      assignedToId: true,
      teamId: true
    }
  });
  
  console.log('User:', JSON.stringify(user, null, 2));
  console.log('\nTicket:', JSON.stringify(ticket, null, 2));
  console.log('\nAuthorization checks:');
  console.log('- isAdmin:', user?.role === 'Administrator');
  console.log('- isCreator:', ticket?.createdById === user?.id);
  console.log('- isAssigned:', ticket?.assignedToId === user?.id);
  console.log('- isTeamMember:', ticket?.teamId && ticket?.teamId === user?.teamId);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
