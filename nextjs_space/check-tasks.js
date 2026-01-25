require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get Dario and Stefanie
  const dario = await prisma.user.findFirst({
    where: { email: { contains: 'dario' } },
    select: { id: true, name: true, email: true, teamId: true }
  });
  
  const stefanie = await prisma.user.findFirst({
    where: { email: { contains: 'stefanie' } },
    select: { id: true, name: true, email: true, teamId: true }
  });
  
  console.log('=== Users ===');
  console.log('Dario:', dario);
  console.log('Stefanie:', stefanie);
  
  // Get all subtasks with assignee info
  const allTasks = await prisma.subTask.findMany({
    where: {
      assigneeId: { in: [dario?.id, stefanie?.id].filter(Boolean) }
    },
    select: {
      id: true,
      title: true,
      completed: true,
      assigneeId: true,
      assignee: { select: { name: true, email: true } }
    }
  });
  
  console.log('\n=== All Tasks for Dario & Stefanie ===');
  console.log('Total tasks:', allTasks.length);
  
  const darioTasks = allTasks.filter(t => t.assigneeId === dario?.id);
  const stefanieTasks = allTasks.filter(t => t.assigneeId === stefanie?.id);
  
  console.log('\n--- Dario Tasks ---');
  console.log('Count:', darioTasks.length);
  darioTasks.forEach(t => console.log(`  - ${t.title} (${t.completed ? 'done' : 'open'})`));
  
  console.log('\n--- Stefanie Tasks ---');
  console.log('Count:', stefanieTasks.length);
  stefanieTasks.forEach(t => console.log(`  - ${t.title} (${t.completed ? 'done' : 'open'})`));
  
  // Check TeamMember relationships
  const darioTeamMemberships = await prisma.teamMember.findMany({
    where: { userId: dario?.id },
    include: { team: { select: { id: true, name: true } } }
  });
  
  const stefanieTeamMemberships = await prisma.teamMember.findMany({
    where: { userId: stefanie?.id },
    include: { team: { select: { id: true, name: true } } }
  });
  
  console.log('\n=== Team Memberships ===');
  console.log('Dario teams:', darioTeamMemberships.map(tm => tm.team.name));
  console.log('Stefanie teams:', stefanieTeamMemberships.map(tm => tm.team.name));
}

main().catch(console.error).finally(() => prisma.$disconnect());
