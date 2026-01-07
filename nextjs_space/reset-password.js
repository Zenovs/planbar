const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('test123', 10);
  
  await prisma.user.update({
    where: { email: 'test@planbar.com' },
    data: { password: hashedPassword }
  });
  
  console.log('✅ Password reset for test@planbar.com to "test123"');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
