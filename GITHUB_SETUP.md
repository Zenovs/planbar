# GitHub Setup Anleitung

Der Code für **planbar** ist bereit zum Pushen! Folge diesen Schritten:

## Schritt 1: GitHub Repository erstellen

1. Gehe zu **https://github.com/new**
2. Fülle das Formular aus:
   - **Repository name**: `planbar`
   - **Description**: `Modernes Ticket-Management-System für kleine Teams`
   - **Visibility**: `Public` (bereits ausgewählt)
   - **WICHTIG**: NICHT "Initialize this repository with a README" anklicken!
3. Klicke auf **"Create repository"**

## Schritt 2: Code pushen

Führe folgende Befehle im Terminal aus:

```bash
# In das Projekt-Verzeichnis wechseln
cd /home/ubuntu/planbar

# Remote Repository hinzufügen
git remote add origin https://github.com/Zenovs/planbar.git

# Prüfe ob alles korrekt ist
git remote -v

# Code zum GitHub pushen
git push -u origin master
```

## Alternative: Mit Personal Access Token (falls nötig)

Wenn du einen Personal Access Token verwenden möchtest:

```bash
git remote add origin https://YOUR_TOKEN@github.com/Zenovs/planbar.git
git push -u origin master
```

## Alternative: Mit SSH

Wenn du SSH bevorzugst:

```bash
git remote add origin git@github.com:Zenovs/planbar.git
git push -u origin master
```

## Schritt 3: Veröffentlichung prüfen

1. Gehe zu **https://github.com/Zenovs/planbar**
2. Du solltest alle Dateien sehen
3. Die README.md wird automatisch auf der Hauptseite angezeigt

## Schritt 4: Deployment (Optional)

Wenn du die App online deployen möchtest:

### Mit Vercel (Empfohlen)

1. Gehe zu **https://vercel.com**
2. "Sign up" mit deinem GitHub Account
3. "Import Project" wählen
4. Wähle das `planbar` Repository
5. Setze die Umgebungsvariablen:
   - `DATABASE_URL` (deine PostgreSQL Connection String)
   - `NEXTAUTH_URL` (wird automatisch gesetzt)
   - `NEXTAUTH_SECRET` (generiere mit: `openssl rand -base64 32`)
6. Klicke auf "Deploy"

### Datenbank für Production

Für Production brauchst du eine PostgreSQL Datenbank. Optionen:

- **Vercel Postgres** (einfach, direkt integriert)
- **Supabase** (kostenloser Tier verfügbar)
- **Railway** (einfach zu nutzen)
- **Neon** (serverless PostgreSQL)

---

## Troubleshooting

### "Repository not found"
- Stelle sicher, dass das Repository auf GitHub existiert
- Überprüfe den Repository-Namen (Groß-/Kleinschreibung)

### "Authentication failed"
- Bei HTTPS: Nutze einen Personal Access Token statt Passwort
- Bei SSH: Stelle sicher, dass dein SSH Key zu GitHub hinzugefügt ist

### "Remote already exists"
Wenn du den Remote bereits hinzugefügt hast:
```bash
git remote remove origin
git remote add origin https://github.com/Zenovs/planbar.git
```

---

**Viel Erfolg mit planbar! 🎫**
