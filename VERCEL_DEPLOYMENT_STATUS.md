# Vercel Deployment Status & Troubleshooting

## Aktueller Status

- **Lokale Version**: ✅ Funktioniert einwandfrei (getestet auf localhost:3000)
- **Vercel Production**: ❌ Zeigt Server-Fehler (Digest: 1597040284)
- **Letzter Git Push**: fcf9076 - "Fix: Seed-Script aktualisiert - deadline Felder entfernt"
- **Datum**: 06.01.2026, 11:47 UTC

## Problem

Die Vercel-Seite zeigt:
```
Application error: a server-side exception has occurred (see the server logs for more information).
Digest: 1597040284
```

## Mögliche Ursachen

### 1. Vercel Deployment noch nicht abgeschlossen
- Vercel benötigt normalerweise 2-3 Minuten für ein Deployment
- Bei größeren Änderungen (wie Prisma-Schema-Updates) kann es länger dauern

### 2. Datenbank-Schema nicht synchronisiert
Das Hauptproblem ist wahrscheinlich, dass:
- Wir haben das `deadline` Feld aus dem Ticket-Model entfernt
- Die Datenbank wurde lokal mit `npx prisma db push` aktualisiert
- **ABER**: Vercel verwendet möglicherweise eine andere Datenbank-Instanz
- Wenn die DATABASE_URL auf Vercel anders ist, hat die Produktions-Datenbank noch das alte Schema

### 3. Build-Fehler auf Vercel
- Möglicherweise ist das Build fehlgeschlagen
- Check Vercel Build-Logs für Details

## Was zu überprüfen ist

### Schritt 1: Vercel Dashboard überprüfen

1. Gehen Sie zu: https://vercel.com/dashboard
2. Wählen Sie Ihr Projekt "planbar"
3. Gehen Sie zu **"Deployments"**
4. Überprüfen Sie den Status des neuesten Deployments
   - Wenn "Building": Warten Sie, bis es abgeschlossen ist
   - Wenn "Failed": Öffnen Sie die Build-Logs und suchen Sie nach Fehlern
   - Wenn "Ready": Das Problem liegt woanders

### Schritt 2: Umgebungsvariablen überprüfen

1. Gehen Sie zu **Settings** → **Environment Variables**
2. Stellen Sie sicher, dass folgende Variablen gesetzt sind:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
NEXTAUTH_URL=https://planbar-one.vercel.app
NEXTAUTH_SECRET=<your-secret-key>
NODE_ENV=production
```

### Schritt 3: Datenbank-Schema auf Vercel aktualisieren

Da wir das Schema lokal geändert haben, müssen wir es auch auf der Produktions-Datenbank aktualisieren:

**Option A: Über Vercel CLI** (empfohlen)
```bash
# Vercel CLI installieren
npm i -g vercel

# In Ihr Projekt einloggen
vercel login
cd /path/to/planbar/nextjs_space
vercel link

# Prisma Schema pushen
npx prisma db push
```

**Option B: Manuell über Neon Dashboard** (wenn Sie Neon verwenden)
1. Gehen Sie zu https://console.neon.tech
2. Wählen Sie Ihre Datenbank
3. Führen Sie folgenden SQL-Befehl aus:
```sql
ALTER TABLE "tickets" DROP COLUMN IF EXISTS "deadline";
```

**Option C: Deployment mit Build Command neu triggern**
1. In Vercel Dashboard → Settings → General
2. Fügen Sie einen "Build Command" hinzu: `npm run build`
3. Oder triggern Sie ein Re-Deploy: Deployments → [Latest] → ⋯ → Redeploy

### Schritt 4: Favicon-Fehler beheben (optional)

Es gibt auch einen 404-Fehler für `/favicon.ico`. Dies kann behoben werden, indem man sicherstellt, dass die Datei `/public/favicon.svg` existiert.

## Was bereits funktioniert

✅ Lokale Entwicklungsumgebung läuft perfekt
✅ Datenbank lokal korrekt migriert
✅ Alle Code-Änderungen committed und gepusht
✅ Seed-Script aktualisiert (keine deadline-Felder mehr)
✅ Admin-User angelegt: dario@schnyder-werbung.ch / Admin123!

## Nächste Schritte

1. **Überprüfen Sie das Vercel Deployment im Dashboard**
2. **Wenn das Deployment erfolgreich war, aber der Fehler weiterhin besteht:**
   - Führen Sie `npx prisma db push` auf der Produktions-Datenbank aus
   - Oder führen Sie die SQL-Migration manuell aus
3. **Wenn das Deployment fehlgeschlagen ist:**
   - Überprüfen Sie die Build-Logs
   - Stellen Sie sicher, dass alle Umgebungsvariablen korrekt gesetzt sind
4. **Triggern Sie ein Re-Deploy:**
   - Entweder über das Vercel Dashboard
   - Oder mit einem neuen Git-Push

## Kontakt bei weiteren Problemen

Wenn das Problem weiterhin besteht nach diesen Schritten, bitte:
1. Screenshot der Vercel Build-Logs teilen
2. Bestätigen, welche DATABASE_URL verwendet wird (ohne Passwort zu zeigen)
3. Überprüfen, ob Auto-Deploy in Vercel aktiviert ist
