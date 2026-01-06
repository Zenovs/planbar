# Vercel Deployment Setup für Planbar

## Problem
Das Next.js-Projekt befindet sich im `nextjs_space` Unterverzeichnis, nicht im Repository-Root.

## Lösung: Root Directory in Vercel setzen

### Schritte:

1. Gehen Sie zu Ihrem Vercel Dashboard: https://vercel.com/dashboard
2. Wählen Sie Ihr Projekt "planbar"
3. Klicken Sie auf **"Settings"** (Einstellungen)
4. Navigieren Sie zu **"General"**
5. Scrollen Sie zu **"Root Directory"**
6. Klicken Sie auf **"Edit"**
7. Geben Sie ein: `nextjs_space`
8. Klicken Sie auf **"Save"**
9. Gehen Sie zurück zu **"Deployments"**
10. Klicken Sie auf **"Redeploy"** für den neuesten Commit

### Alternative: Manuelle Build-Konfiguration

Falls die Root Directory-Einstellung nicht funktioniert:

1. In den Settings → Build & Development Settings
2. Setzen Sie:
   - **Framework Preset**: Next.js
   - **Root Directory**: `nextjs_space`
   - **Build Command**: `npm run build`
   - **Install Command**: `npm install`
   - **Output Directory**: `.next`

### Wichtig:
Nach der Änderung des Root Directory muss ein neuer Deployment ausgelöst werden!

## Aktueller Git Commit
- **Branch**: master
- **Letzter Commit**: 4058b9b - "Fix: Tailwind & PostCSS zu production dependencies"

## Projektstruktur
```
planbar/
├── nextjs_space/          ← Root Directory für Vercel
│   ├── app/
│   ├── components/
│   ├── prisma/
│   ├── package.json
│   ├── next.config.js
│   └── tsconfig.json
├── vercel.json           ← Leere Konfiguration
└── VERCEL_SETUP.md       ← Diese Datei
```
