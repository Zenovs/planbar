const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const subtasks = await prisma.subTask.findMany({
    where: {
      ticketId: 'cmjziq1se0001l404p98z8v7s'
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      completed: true
    }
  });
  
  console.log('Sub-Tasks for ticket cmjziq1se0001l404p98z8v7s:');
  console.log(JSON.stringify(subtasks, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
