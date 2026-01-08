# E-Mail-Benachrichtigungen einrichten

planbar unterstützt automatische E-Mail-Benachrichtigungen für wichtige Ereignisse wie:
- Neue Tickets
- Ticket-Statusänderungen
- Ticket-Zuweisungen
- Neue Subtasks
- Subtask-Zuweisungen
- Erledigte Subtasks

## SMTP-Konfiguration

Um E-Mail-Benachrichtigungen zu aktivieren, müssen Sie die folgenden Umgebungsvariablen in der `.env`-Datei konfigurieren:

### Erforderliche Variablen

```env
SMTP_HOST=smtp.gmail.com          # SMTP-Server-Adresse
SMTP_PORT=587                      # SMTP-Port (meist 587 oder 465)
SMTP_USER=your-email@gmail.com     # Ihr E-Mail-Account
SMTP_PASSWORD=your-app-password    # App-Passwort (nicht das normale Passwort!)
SMTP_FROM=your-email@gmail.com     # Absender-Adresse
```

### Optionale Variablen

```env
COMPANY_NAME=planbar              # Firmenname in E-Mail-Templates
PRIMARY_COLOR=#3b82f6             # Primärfarbe für E-Mail-Design
NEXTAUTH_URL=https://your-domain.com  # Produktions-URL (wichtig für Links!)
```

## Einrichtung für verschiedene E-Mail-Anbieter

### 👍 Gmail (empfohlen)

1. **2-Faktor-Authentifizierung aktivieren:**
   - Gehen Sie zu Ihrem Google-Konto: https://myaccount.google.com/security
   - Aktivieren Sie die 2-Faktor-Authentifizierung

2. **App-Passwort erstellen:**
   - Gehen Sie zu: https://myaccount.google.com/apppasswords
   - Wählen Sie "Mail" und "Anderes Gerät"
   - Geben Sie "planbar" als Namen ein
   - Kopieren Sie das generierte 16-stellige Passwort

3. **In `.env` eintragen:**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=ihre-email@gmail.com
   SMTP_PASSWORD=abcd efgh ijkl mnop  # Das App-Passwort
   SMTP_FROM=ihre-email@gmail.com
   ```

### 📧 Outlook / Office 365

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=ihre-email@outlook.com
SMTP_PASSWORD=ihr-passwort
SMTP_FROM=ihre-email@outlook.com
```

**Hinweis:** Bei Office 365 müssen Sie eventuell "SMTP AUTH" in den Exchange-Einstellungen aktivieren.

### 📨 Eigener SMTP-Server

Wenn Sie einen eigenen SMTP-Server haben:

```env
SMTP_HOST=mail.ihre-domain.com
SMTP_PORT=587                      # Oder 465 für SSL
SMTP_USER=ihr-smtp-user
SMTP_PASSWORD=ihr-smtp-passwort
SMTP_FROM=noreply@ihre-domain.com
```

**Wichtig:** Bei Port 465 müssen Sie `secure: true` in `lib/email.ts` setzen.

### 🚀 SendGrid / Mailgun / AWS SES

Für professionelle E-Mail-Dienste:

**SendGrid:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=IHR_SENDGRID_API_KEY
SMTP_FROM=noreply@ihre-domain.com
```

**Mailgun:**
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@ihre-domain.mailgun.org
SMTP_PASSWORD=IHR_MAILGUN_PASSWORT
SMTP_FROM=noreply@ihre-domain.com
```

## Benutzer-Einstellungen

Benutzer können E-Mail-Benachrichtigungen individuell in ihrem **Profil** aktivieren/deaktivieren:

1. Gehen Sie zum Profil (über das Benutzermenü oben rechts)
2. Scrollen Sie zu "Benachrichtigungen"
3. Aktivieren/Deaktivieren Sie "E-Mail-Benachrichtigungen"

**Standard:** E-Mail-Benachrichtigungen sind für neue Benutzer **aktiviert**.

## Welche E-Mails werden versendet?

### 🎫 Ticket-Benachrichtigungen

1. **Ticket erstellt** 
   - An: Zugewiesener User
   - Wann: Neues Ticket wird erstellt und jemand zugewiesen

2. **Ticket zugewiesen**
   - An: Neu zugewiesener User
   - Wann: Ticket wird jemand anderem zugewiesen

3. **Status geändert**
   - An: Zugewiesener User + Ersteller (falls unterschiedlich)
   - Wann: Ticket-Status ändert sich (offen → in Bearbeitung → erledigt)

### ✅ Subtask-Benachrichtigungen

1. **Subtask zugewiesen**
   - An: Zugewiesener User
   - Wann: Neuer Subtask wird erstellt und zugewiesen

2. **Subtask neu zugewiesen**
   - An: Neu zugewiesener User
   - Wann: Subtask wird jemand anderem zugewiesen

3. **Subtask erledigt**
   - An: Ticket-Ersteller
   - Wann: Subtask wird als erledigt markiert

## Testen der E-Mail-Konfiguration

### 1. SMTP-Verbindung testen

Erstellen Sie eine Test-Route in `app/api/test-email/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export async function GET() {
  const result = await sendEmail({
    to: 'ihre-test-email@example.com',
    subject: 'Test E-Mail von planbar',
    html: '<h1>Es funktioniert!</h1><p>Die E-Mail-Konfiguration ist korrekt.</p>',
  });

  return NextResponse.json({ success: result });
}
```

Rufen Sie dann auf: `http://localhost:3000/api/test-email`

### 2. Produktions-Test

1. Erstellen Sie ein neues Ticket
2. Weisen Sie es einem Benutzer zu (der E-Mail-Benachrichtigungen aktiviert hat)
3. Prüfen Sie das Postfach des Benutzers

## Fehlerbehebung

### ⚠️ "Email transporter not configured"

**Problem:** SMTP-Umgebungsvariablen fehlen oder sind falsch.

**Lösung:**
- Überprüfen Sie, ob alle `SMTP_*` Variablen in `.env` gesetzt sind
- Starten Sie den Server neu nach Änderungen an `.env`

### ⚠️ "Authentication failed"

**Problem:** Falsches Passwort oder App-Passwort nicht verwendet.

**Lösung bei Gmail:**
- Verwenden Sie ein **App-Passwort**, nicht Ihr normales Google-Passwort
- Aktivieren Sie 2-Faktor-Authentifizierung zuerst
- Generieren Sie ein neues App-Passwort

**Lösung bei Outlook:**
- Aktivieren Sie "SMTP AUTH" in den Konto-Einstellungen
- Verwenden Sie das vollständige E-Mail-Passwort

### ⚠️ "Connection timeout"

**Problem:** Firewall blockiert Port 587 oder 465.

**Lösung:**
- Prüfen Sie Firewall-Einstellungen
- Testen Sie alternativen Port (587 statt 465 oder umgekehrt)
- Bei Port 465: Setzen Sie `secure: true` in `lib/email.ts`

### ⚠️ E-Mails landen im Spam

**Problem:** Fehlende SPF/DKIM-Einträge oder unseriöser Absender.

**Lösung:**
1. Verwenden Sie einen professionellen E-Mail-Dienst (SendGrid, Mailgun)
2. Konfigurieren Sie SPF- und DKIM-Records in Ihrer Domain
3. Setzen Sie eine gültige `SMTP_FROM`-Adresse (am besten mit eigener Domain)
4. Vermeiden Sie Spam-Wörter im Betreff

### ⚠️ Keine E-Mails trotz korrekter Konfiguration

**Checkliste:**
1. ✅ SMTP-Konfiguration in `.env` korrekt?
2. ✅ Server neu gestartet nach `.env`-Änderungen?
3. ✅ Benutzer hat E-Mail-Benachrichtigungen im Profil aktiviert?
4. ✅ `emailNotifications` Feld in DB ist `true`?
5. ✅ Console-Logs prüfen: `console.error('Failed to send email')`
6. ✅ Test-E-Mail mit `/api/test-email` funktioniert?

## Produktions-Tipps

### 🔒 Sicherheit

- **Niemals** SMTP-Credentials in Git committen!
- Verwenden Sie Umgebungsvariablen auf dem Hosting-Provider
- Bei Vercel: Settings → Environment Variables
- Bei Heroku: Config Vars
- Bei Docker: `.env`-Datei oder Secrets

### 🚀 Performance

- E-Mail-Versand erfolgt **asynchron** (blockiert nicht die Antwort)
- Fehler beim E-Mail-Versand führen nicht zum Fehler der API-Anfrage
- Logs werden in Console ausgegeben: `console.error('Failed to send email')`

### 📊 Monitoring

**Empfehlung:** Verwenden Sie einen professionellen E-Mail-Dienst mit Dashboard:
- SendGrid: Analytics, Bounce-Tracking, Spam-Reports
- Mailgun: Logs, Delivery-Rate, Event-Webhooks
- AWS SES: CloudWatch-Metriken

## Weitere Ressourcen

- [Gmail App-Passwörter](https://support.google.com/accounts/answer/185833)
- [Outlook SMTP-Einstellungen](https://support.microsoft.com/de-de/office/pop-imap-und-smtp-einstellungen-8361e398-8af4-4e97-b147-6c6c4ac95353)
- [SendGrid Node.js Setup](https://docs.sendgrid.com/for-developers/sending-email/nodejs)
- [Nodemailer Dokumentation](https://nodemailer.com/about/)

---

**Support:** Bei Problemen erstellen Sie ein Issue auf GitHub oder kontaktieren Sie den Administrator.
