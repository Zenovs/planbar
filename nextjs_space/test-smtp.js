// Einfacher SMTP-Test ohne Next.js
const nodemailer = require('nodemailer');

const configs = [
  {
    name: 'SMTP (default)',
    host: 'asmtp.mail.hostpoint.ch',
    port: 587,
    user: 'noreply@planbar.dev',
    password: '6ub!k!X.g*!FYh!',
    from: 'noreply@planbar.dev',
  },
  {
    name: 'SMTP_LOGIN',
    host: 'asmtp.mail.hostpoint.ch',
    port: 587,
    user: 'noreply@planbar.dev',
    password: '6ub!k!X.g*!FYh!',
    from: 'noreply@planbar.dev',
  },
  {
    name: 'SMTP_UPDATE',
    host: 'asmtp.mail.hostpoint.ch',
    port: 587,
    user: 'update@planbar.dev',
    password: 'i@8RAU9_v2Qoyu3',
    from: 'update@planbar.dev',
  },
];

async function testSMTP(config) {
  console.log(`\n=== Teste ${config.name} ===`);
  console.log(`Host: ${config.host}:${config.port}`);
  console.log(`User: ${config.user}`);
  console.log(`From: ${config.from}`);

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: false, // STARTTLS
      auth: {
        user: config.user,
        pass: config.password,
      },
      debug: true, // Aktiviert Debug-Ausgabe
      logger: true, // Aktiviert Logger
    });

    // Verbindung testen
    console.log('Teste Verbindung...');
    await transporter.verify();
    console.log('✅ Verbindung erfolgreich!');

    // Test-E-Mail senden
    console.log('Sende Test-E-Mail...');
    const info = await transporter.sendMail({
      from: config.from,
      to: 'dario@schnyder-werbung.ch',
      subject: `Test von ${config.name}`,
      text: `Dies ist eine Test-E-Mail von ${config.name}.\n\nGesendet am: ${new Date().toLocaleString('de-DE')}`,
      html: `<h1>Test von ${config.name}</h1><p>Dies ist eine Test-E-Mail.</p><p><strong>Gesendet am:</strong> ${new Date().toLocaleString('de-DE')}</p>`,
    });

    console.log('✅ E-Mail gesendet!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    return true;
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    if (error.code) console.error('Error Code:', error.code);
    if (error.command) console.error('SMTP Command:', error.command);
    return false;
  }
}

async function main() {
  console.log('\n🧪 SMTP-Konfigurationstest');
  console.log('============================');

  const results = [];
  for (const config of configs) {
    const success = await testSMTP(config);
    results.push({ name: config.name, success });
    // Pause zwischen Tests
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log('\n\n📊 Zusammenfassung:');
  console.log('===================');
  results.forEach((r) => {
    console.log(`${r.success ? '✅' : '❌'} ${r.name}`);
  });

  const allSuccess = results.every((r) => r.success);
  console.log(`\n${allSuccess ? '✅ Alle Tests erfolgreich!' : '❌ Einige Tests fehlgeschlagen'}`);
  process.exit(allSuccess ? 0 : 1);
}

main();
