import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('Test1234!', 12);
  
  // Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.de' },
    update: { role: 'admin', password },
    create: {
      email: 'admin@test.de',
      name: 'Test Admin',
      password,
      role: 'admin'
    }
  });
  console.log('Admin erstellt:', admin.email);
  
  // Projektleiter
  const pl = await prisma.user.upsert({
    where: { email: 'projektleiter@test.de' },
    update: { role: 'projektleiter', password },
    create: {
      email: 'projektleiter@test.de',
      name: 'Test Projektleiter',
      password,
      role: 'projektleiter'
    }
  });
  console.log('Projektleiter erstellt:', pl.email);
  
  // Koordinator
  const coord = await prisma.user.upsert({
    where: { email: 'koordinator@test.de' },
    update: { role: 'koordinator', password },
    create: {
      email: 'koordinator@test.de',
      name: 'Test Koordinator',
      password,
      role: 'koordinator'
    }
  });
  console.log('Koordinator erstellt:', coord.email);
  
  // Mitglied
  const member = await prisma.user.upsert({
    where: { email: 'mitglied@test.de' },
    update: { role: 'member', password },
    create: {
      email: 'mitglied@test.de',
      name: 'Test Mitglied',
      password,
      role: 'member'
    }
  });
  console.log('Mitglied erstellt:', member.email);
  
  console.log('\n✅ Alle Test-Benutzer erstellt!');
  console.log('Passwort für alle: Test1234!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
