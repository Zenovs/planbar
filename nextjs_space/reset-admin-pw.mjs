import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const newPassword = 'Admin123!';
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  const user = await prisma.user.update({
    where: { email: 'dario@schnyder-werbung.ch' },
    data: { password: hashedPassword }
  });
  
  console.log('Passwort zurückgesetzt für:', user.email);
  console.log('Neues Passwort: Admin123!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
