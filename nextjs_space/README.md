# Planbar - Projektmanagement System

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-6.0-2D3748?logo=prisma)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.3-38B2AC?logo=tailwind-css)

Planbar ist ein modernes, responsives Projektmanagement-System für Teams. Es bietet Kanban-Boards, Aufgabenverwaltung, Teamkoordination und Multi-Tenant-Unterstützung für Organisationen.

## 🚀 Features

### Aufgabenverwaltung
- **Kanban & Listen-Ansicht** - Synchronisierte Ansichten für flexible Arbeitsweisen
- **Subtasks** - Detaillierte Unteraufgaben mit Status, Zuweisungen und Fälligkeitsdaten
- **Rich-Text Beschreibungen** - Formatierte Aufgabenbeschreibungen
- **Dateianhänge** - Cloud-basierter Datei-Upload (AWS S3)

### Team-Verwaltung
- **Multi-Team Support** - Benutzer können mehreren Teams angehören
- **Individuelles Pensum** - Wochenstunden und Workload-Prozent pro Team-Mitglied
- **Ressourcen-Übersicht** - Automatische Berechnung der verfügbaren Kapazitäten

### Multi-Tenant Organisationen
- **Organisations-Isolation** - Vollständige Datentrennung zwischen Organisationen
- **Admin Organisations-Wechsel** - Admins können alle Organisationen verwalten
- **Organisations-Rollen** - org_admin, projektleiter, koordinator, member

### Rollen & Berechtigungen (RBAC)
| Rolle | Berechtigungen |
|-------|---------------|
| Admin | Vollzugriff auf alle Organisationen, Teams, Benutzer und Einstellungen |
| Projektleiter | Team-Verwaltung für eigene Teams, Aufgaben erstellen/bearbeiten |
| Koordinator | Aufgaben in zugewiesenen Teams bearbeiten |
| Mitglied | Nur eigene Aufgaben einsehen und bearbeiten |

### Weitere Features
- **Kalender-Integration** - ICS-Export für externe Kalender
- **E-Mail-Benachrichtigungen** - Erinnerungen für Aufgaben und Deadlines
- **Teilen-Funktion** - Öffentliche Links für externe Stakeholder
- **Stripe-Integration** - Subscription-basierte Abrechnung (Free/Paid Tier)
- **Responsive Design** - Optimiert für Desktop, Tablet und Mobile

## 🛠 Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Sprache:** TypeScript
- **Datenbank:** PostgreSQL mit Prisma ORM
- **Auth:** NextAuth.js mit Credentials Provider
- **Styling:** Tailwind CSS + Framer Motion
- **UI Components:** Radix UI / shadcn/ui
- **Email:** Nodemailer (SMTP)
- **Storage:** AWS S3
- **Payments:** Stripe

## 📦 Installation

```bash
# Repository klonen
git clone https://github.com/Zenovs/planbar.git
cd planbar/nextjs_space

# Dependencies installieren
npm install

# Environment-Variablen konfigurieren
cp .env.example .env
# Bearbeite .env mit deinen Werten

# Datenbank-Schema anwenden
npx prisma db push

# Entwicklungsserver starten
npm run dev
```

## ⚙️ Environment Variablen

```env
# Datenbank
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Email (SMTP)
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="your-email"
SMTP_PASSWORD="your-password"
SMTP_FROM="noreply@example.com"

# AWS S3 (optional)
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="eu-central-1"
AWS_BUCKET_NAME="..."

# Stripe (optional)
STRIPE_SECRET_KEY="sk_..."
STRIPE_PUBLISHABLE_KEY="pk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

## 📁 Projektstruktur

```
nextjs_space/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/          # NextAuth endpoints
│   │   ├── organizations/ # Organisations-API
│   │   ├── teams/         # Team-API
│   │   ├── tickets/       # Aufgaben-API
│   │   └── users/         # Benutzer-API
│   ├── dashboard/         # Dashboard-Seite
│   ├── kalenderplanung/   # Kalender-Ansicht
│   ├── organisation/      # Organisations-Verwaltung
│   ├── team/              # Team-Verwaltung
│   └── tickets/           # Aufgaben-Seiten
├── components/            # Wiederverwendbare UI-Komponenten
├── lib/                   # Utilities und Konfiguration
│   ├── auth.ts           # NextAuth Konfiguration
│   ├── db.ts             # Prisma Client
│   └── email.ts          # E-Mail Service
└── prisma/
    └── schema.prisma     # Datenbank-Schema
```

## 🏢 Multi-Tenant Architektur

Planbar unterstützt mehrere Organisationen mit vollständiger Datenisolation:

- Jeder Benutzer gehört zu einer Organisation
- Teams sind einer Organisation zugeordnet
- Admins können zwischen Organisationen wechseln
- API-Endpunkte filtern automatisch nach Organisation

## 📱 Responsive Design

- **Mobile-First** Ansatz mit Tailwind CSS
- **Touch-optimierte** Buttons (min. 44px)
- **Angepasste Breakpoints** für alle Geräte
- **Bottom Sheets** statt Modals auf Mobile

## 🔐 Sicherheit

- Passwort-Hashing mit bcrypt
- CSRF-Schutz durch NextAuth
- API-Routes mit Session-Validierung
- Rollen-basierte Zugriffskontrolle

## 📄 Lizenz

Privates Projekt - Alle Rechte vorbehalten.

## 👥 Entwickelt von

**Schnyder Werbung** - [schnyder-werbung.ch](https://schnyder-werbung.ch)
