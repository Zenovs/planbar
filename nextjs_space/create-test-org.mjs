import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Test-Organisation erstellen
  const org = await prisma.organization.create({
    data: {
      name: 'Test Organisation zum Löschen',
      slug: 'test-org-delete',
      description: 'Diese Organisation wird zum Testen des Löschens verwendet',
    },
  });
  console.log('Test-Organisation erstellt:', org);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
