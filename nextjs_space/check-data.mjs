import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Users
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, teamId: true }
  });
  console.log('=== USERS ===');
  users.forEach(u => console.log(`${u.name} (${u.email}): role=${u.role}, teamId=${u.teamId}`));
  
  // Teams
  const teams = await prisma.team.findMany();
  console.log('\n=== TEAMS ===');
  teams.forEach(t => console.log(`${t.name} (${t.id})`));
  
  // TeamMembers
  const members = await prisma.teamMember.findMany({
    include: { user: true, team: true }
  });
  console.log('\n=== TEAM MEMBERS ===');
  members.forEach(m => console.log(`${m.user.name} -> ${m.team.name}`));
  
  // Tickets
  const tickets = await prisma.ticket.findMany({
    select: { id: true, title: true, teamId: true, createdById: true, assignedToId: true }
  });
  console.log('\n=== TICKETS ===');
  tickets.forEach(t => console.log(`${t.title}: teamId=${t.teamId}, createdBy=${t.createdById}`));
}

main().finally(() => prisma.$disconnect());
