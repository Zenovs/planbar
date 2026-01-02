import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Create admin user (john@doe.com / johndoe123)
  const adminPassword = await bcrypt.hash('johndoe123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {},
    create: {
      email: 'john@doe.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'admin',
    },
  });
  console.log(`Created admin user: ${admin.email}`);

  // Create test members
  const member1Password = await bcrypt.hash('testuser123', 10);
  const member1 = await prisma.user.upsert({
    where: { email: 'test@planbar.com' },
    update: {},
    create: {
      email: 'test@planbar.com',
      password: member1Password,
      name: 'Test User',
      role: 'member',
    },
  });
  console.log(`Created member: ${member1.email}`);

  const member2Password = await bcrypt.hash('member123', 10);
  const member2 = await prisma.user.upsert({
    where: { email: 'sarah@planbar.com' },
    update: {},
    create: {
      email: 'sarah@planbar.com',
      password: member2Password,
      name: 'Sarah Müller',
      role: 'member',
    },
  });
  console.log(`Created member: ${member2.email}`);

  const member3Password = await bcrypt.hash('member123', 10);
  const member3 = await prisma.user.upsert({
    where: { email: 'max@planbar.com' },
    update: {},
    create: {
      email: 'max@planbar.com',
      password: member3Password,
      name: 'Max Schmidt',
      role: 'member',
    },
  });
  console.log(`Created member: ${member3.email}`);

  // Create sample tickets
  const tickets = [
    {
      title: 'Homepage Redesign umsetzen',
      description: 'Die neue Homepage muss nach den aktuellen Design-Vorgaben umgesetzt werden.Inklusive responsive Design für mobile Geräte.',
      status: 'in_progress',
      priority: 'high',
      assignedToId: member2.id,
      createdById: admin.id,
      deadline: new Date('2025-01-15'),
    },
    {
      title: 'Fehler in der Login-Funktion beheben',
      description: 'Benutzer können sich nach dem letzten Update nicht mehr einloggen. Fehlermeldung erscheint nach Eingabe der Credentials.',
      status: 'open',
      priority: 'critical',
      assignedToId: member1.id,
      createdById: admin.id,
      deadline: new Date('2025-01-08'),
    },
    {
      title: 'Datenbank-Backup einrichten',
      description: 'Automatisches tägliches Backup der Produktionsdatenbank konfigurieren.',
      status: 'open',
      priority: 'high',
      assignedToId: member3.id,
      createdById: member2.id,
      deadline: new Date('2025-01-20'),
    },
    {
      title: 'Newsletter-Feature entwickeln',
      description: 'Implementierung eines Newsletter-Systems mit Abonnement-Verwaltung und E-Mail-Versand.',
      status: 'open',
      priority: 'medium',
      assignedToId: member1.id,
      createdById: admin.id,
      deadline: new Date('2025-02-01'),
    },
    {
      title: 'Performance-Optimierung durchführen',
      description: 'Die Ladezeiten der Hauptseite verbessern. Ziel: unter 2 Sekunden.',
      status: 'in_progress',
      priority: 'medium',
      assignedToId: member3.id,
      createdById: member2.id,
      deadline: new Date('2025-01-25'),
    },
    {
      title: 'API-Dokumentation aktualisieren',
      description: 'Swagger-Dokumentation für alle neuen API-Endpoints erstellen.',
      status: 'done',
      priority: 'low',
      assignedToId: member2.id,
      createdById: admin.id,
      deadline: new Date('2025-01-05'),
    },
    {
      title: 'User-Testing durchführen',
      description: 'Usability-Tests mit 5 Testpersonen durchführen und Feedback dokumentieren.',
      status: 'open',
      priority: 'medium',
      assignedToId: null,
      createdById: member1.id,
      deadline: new Date('2025-01-30'),
    },
    {
      title: 'SEO-Optimierung implementieren',
      description: 'Meta-Tags, strukturierte Daten und Sitemap hinzufügen.',
      status: 'closed',
      priority: 'low',
      assignedToId: member1.id,
      createdById: admin.id,
      deadline: new Date('2025-01-03'),
    },
  ];

  for (const ticket of tickets) {
    await prisma.ticket.upsert({
      where: {
        id: ticket.title.toLowerCase().replace(/\s+/g, '-'),
      },
      update: {},
      create: ticket,
    });
    console.log(`Created ticket: ${ticket.title}`);
  }

  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
