// Dieses Skript markiert alle bestehenden Benutzer als verifiziert
// Wird einmalig nach dem Schema-Update ausgeführt

import prisma from '../lib/db';

async function migrateExistingUsers() {
  console.log('Starte Migration: Markiere bestehende Benutzer als verifiziert...');
  
  try {
    // Alle Benutzer ohne emailVerified=true updaten
    const result = await prisma.user.updateMany({
      where: {
        emailVerified: false,
        // Nur Benutzer die VOR dem Feature erstellt wurden
        // (haben keinen verificationCode)
        verificationCode: null,
      },
      data: {
        emailVerified: true,
      },
    });
    
    console.log(`${result.count} bestehende Benutzer wurden als verifiziert markiert.`);
  } catch (error) {
    console.error('Fehler bei der Migration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateExistingUsers();
