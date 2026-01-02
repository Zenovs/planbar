# 🎫 planbar - Ticket-Management-System

**Modernes Ticket-Management für kleine Teams**

Ein vollständiges, produktionsreifes Ticket-Management-System gebaut mit Next.js 14, React 18, TypeScript, PostgreSQL und Tailwind CSS.

![planbar Preview](nextjs_space/public/og-image.png)

---

## ✨ Features

### 🎯 Kern-Features

- **📊 Dashboard**: Übersichtliche Statistiken und schneller Zugriff auf wichtige Informationen
- **🎫 Ticket-Verwaltung**
  - Tickets erstellen, bearbeiten, löschen
  - Status: Offen, In Bearbeitung, Erledigt, Geschlossen
  - Prioritäten: Niedrig, Mittel, Hoch, Kritisch
  - Deadline-Management mit visueller Überfälligkeits-Anzeige
  - Zuweisung an Team-Mitglieder

- **🔍 Listen-Ansicht**
  - Filterung nach Status, Priorität, zugewiesener Person
  - Volltext-Suche in Titel und Beschreibung
  - Sortierung nach verschiedenen Kriterien
  - Responsive Kartenansicht

- **👥 Team-Verwaltung**
  - Benutzer hinzufügen, bearbeiten, löschen
  - Rollen-System (Admin/Mitglied)
  - Übersicht über offene Tickets pro Person
  - Passwort-Management

- **🔐 Authentifizierung**
  - Email/Passwort-Login
  - Sichere Passwort-Verschlüsselung mit bcrypt
  - Session-Management mit NextAuth.js
  - Geschützte Routen und API-Endpoints

### 🎨 Design

- **Modern & Responsiv**: Funktioniert perfekt auf Desktop, Tablet und Mobile
- **Animationen**: Smooth Framer Motion Animationen für bessere UX
- **Gradients & Shadows**: Ansprechendes Design mit Farbverläufen
- **Intuitive Navigation**: Sticky Header mit schnellem Zugriff auf alle Bereiche
- **Dark Mode Ready**: Theme-System vorbereitet

---

## 🚀 Schnellstart

### Voraussetzungen

- Node.js 18+ (empfohlen: 20.x)
- Yarn Package Manager
- PostgreSQL Datenbank

### Installation

1. **Repository klonen**
   ```bash
   git clone https://github.com/Zenovs/planbar.git
   cd planbar/nextjs_space
   ```

2. **Dependencies installieren**
   ```bash
   yarn install
   ```

3. **Umgebungsvariablen konfigurieren**
   
   Erstellen Sie eine `.env` Datei im `nextjs_space` Ordner:
   ```env
   # Database
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
   
   # NextAuth
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here"  # Generieren mit: openssl rand -base64 32
   ```

4. **Datenbank initialisieren**
   ```bash
   # Prisma Client generieren
   yarn prisma generate
   
   # Datenbank-Schema pushen
   yarn prisma db push
   
   # Test-Daten seeden (optional)
   yarn prisma db seed
   ```

5. **Development Server starten**
   ```bash
   yarn dev
   ```

   Die Anwendung läuft nun auf `http://localhost:3000`

### Test-Benutzer (nach Seeding)

Wenn Sie die Datenbank mit Test-Daten gefüllt haben, können Sie sich mit folgenden Accounts einloggen:

| Email | Passwort | Rolle |
|-------|----------|-------|
| test@planbar.com | testuser123 | Mitglied |
| sarah@planbar.com | member123 | Mitglied |
| max@planbar.com | member123 | Mitglied |

---

## 📦 Projekt-Struktur

```
planbar/
└── nextjs_space/
    ├── app/                      # Next.js App Router
    │   ├── api/                  # API Routes
    │   │   ├── auth/             # NextAuth Endpoints
    │   │   ├── tickets/          # Ticket CRUD
    │   │   └── users/            # User Management
    │   ├── dashboard/            # Dashboard Seite
    │   ├── tickets/              # Ticket Pages
    │   │   ├── [id]/             # Ticket Detail/Edit
    │   │   └── new/              # Neues Ticket
    │   ├── team/                 # Team-Verwaltung
    │   ├── layout.tsx            # Root Layout
    │   └── page.tsx              # Landing/Login
    ├── components/               # React Components
    │   ├── ui/                   # shadcn/ui Components
    │   ├── header.tsx            # Sticky Navigation
    │   ├── ticket-card.tsx       # Ticket Karte
    │   ├── status-badge.tsx      # Status Badge
    │   └── priority-badge.tsx    # Priorität Badge
    ├── lib/                      # Utilities
    │   ├── auth.ts               # NextAuth Config
    │   ├── db.ts                 # Prisma Client
    │   └── types.ts              # TypeScript Types
    ├── prisma/
    │   └── schema.prisma         # Datenbank Schema
    └── scripts/
        └── seed.ts               # Seed Script
```

---

## 🗄️ Datenbank-Schema

### User (Benutzer)
- `id`: Eindeutige ID
- `email`: E-Mail-Adresse (unique)
- `password`: Verschlüsseltes Passwort
- `name`: Benutzername
- `role`: Rolle (admin/member)
- `createdAt`: Erstellungsdatum

### Ticket
- `id`: Eindeutige ID
- `title`: Ticket-Titel
- `description`: Detaillierte Beschreibung
- `status`: Status (open/in_progress/done/closed)
- `priority`: Priorität (low/medium/high/critical)
- `deadline`: Fälligkeitsdatum (optional)
- `assignedToId`: Zugewiesener Benutzer (optional)
- `createdById`: Ersteller
- `createdAt`: Erstellungsdatum
- `updatedAt`: Letzte Änderung

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React Framework mit App Router
- **React 18** - UI Library
- **TypeScript** - Type Safety
- **Tailwind CSS** - Utility-First Styling
- **Framer Motion** - Animationen
- **Lucide React** - Icon Library
- **shadcn/ui** - UI Component Library
- **date-fns** - Datum-Formatierung

### Backend
- **Next.js API Routes** - Server-Side API
- **NextAuth.js** - Authentifizierung
- **Prisma ORM** - Database Toolkit
- **PostgreSQL** - Relationale Datenbank
- **bcryptjs** - Passwort Hashing

### Development
- **ESLint** - Code Linting
- **Prettier** - Code Formatting
- **TypeScript** - Static Type Checking

---

## 📝 Verwendung

### Tickets erstellen

1. Navigiere zu "Tickets" im Header
2. Klicke auf "Neues Ticket"
3. Fülle das Formular aus:
   - **Titel**: Kurze Beschreibung des Problems
   - **Beschreibung**: Detaillierte Information (optional)
   - **Status**: Aktueller Status des Tickets
   - **Priorität**: Wichtigkeit des Tickets
   - **Zugewiesen an**: Team-Mitglied (optional)
   - **Deadline**: Fälligkeitsdatum (optional)
4. Klicke auf "Ticket erstellen"

### Tickets filtern und suchen

1. Gehe zur Tickets-Übersicht
2. Nutze die Filter-Optionen:
   - **Suche**: Volltextsuche in Titel/Beschreibung
   - **Status**: Filtere nach Ticket-Status
   - **Priorität**: Filtere nach Priorität
   - **Zugewiesen an**: Filtere nach Person
   - **Sortierung**: Sortiere nach verschiedenen Kriterien

### Team verwalten (Admin)

1. Navigiere zu "Team"
2. **Mitglied hinzufügen**:
   - Klicke auf "Mitglied hinzufügen"
   - Gib Name, E-Mail und Passwort ein
   - Wähle Rolle (Mitglied/Admin)
3. **Mitglied bearbeiten**:
   - Klicke auf das Edit-Icon
   - Ändere Name, Rolle oder Passwort
4. **Mitglied löschen**:
   - Klicke auf das Papierkorb-Icon
   - Bestätige die Aktion

---

## 🔒 Sicherheit

- **Passwort-Hashing**: Alle Passwörter werden mit bcrypt verschlüsselt
- **Session-Management**: Sichere Sessions mit NextAuth.js
- **API-Protection**: Alle API-Routes sind authentifiziert
- **Input-Validation**: Server-seitige Validierung aller Eingaben
- **SQL-Injection Prevention**: Prisma schützt vor SQL-Injection

---

## 📊 API-Endpoints

### Authentication
- `POST /api/auth/signin` - Login
- `POST /api/auth/signout` - Logout
- `POST /api/signup` - Registrierung

### Tickets
- `GET /api/tickets` - Liste aller Tickets (mit Filtern)
- `POST /api/tickets` - Neues Ticket erstellen
- `GET /api/tickets/[id]` - Ticket Details
- `PATCH /api/tickets/[id]` - Ticket aktualisieren
- `DELETE /api/tickets/[id]` - Ticket löschen

### Users
- `GET /api/users` - Liste aller Benutzer
- `POST /api/users` - Neuen Benutzer erstellen (Admin)
- `PATCH /api/users/[id]` - Benutzer aktualisieren (Admin)
- `DELETE /api/users/[id]` - Benutzer löschen (Admin)

---

## 🚢 Deployment

### Vercel (Empfohlen)

1. **Repository zu GitHub pushen** (siehe unten)
2. **Vercel Account erstellen** auf [vercel.com](https://vercel.com)
3. **Projekt importieren** und mit GitHub verbinden
4. **Umgebungsvariablen setzen**:
   - `DATABASE_URL`
   - `NEXTAUTH_URL` (deine Vercel URL)
   - `NEXTAUTH_SECRET`
5. **Deploy** - Vercel baut und deployed automatisch

### Andere Plattformen

Die App kann auf jeder Plattform deployed werden, die Next.js unterstützt:
- Railway
- Render
- AWS
- Google Cloud
- Azure

---

## 📤 GitHub Setup

### Repository auf GitHub erstellen

1. Gehe zu [github.com/new](https://github.com/new)
2. Repository Name: **planbar**
3. Sichtbarkeit: **Public**
4. **NICHT** "Initialize with README" anklicken
5. "Create repository" klicken

### Code pushen

Der Code ist bereits committed. Führe folgende Befehle aus:

```bash
cd /home/ubuntu/planbar

# GitHub Remote hinzufügen (ersetze USERNAME)
git remote add origin https://github.com/USERNAME/planbar.git

# Code pushen
git branch -M master
git push -u origin master
```

**Alternative mit SSH:**
```bash
git remote add origin git@github.com:USERNAME/planbar.git
git push -u origin master
```

---

## 🔧 Entwicklung

### Prisma Commands

```bash
# Prisma Client neu generieren
yarn prisma generate

# Datenbank-Schema aktualisieren
yarn prisma db push

# Prisma Studio öffnen (GUI)
yarn prisma studio

# Datenbank seeden
yarn prisma db seed
```

### Build & Production

```bash
# Production Build
yarn build

# Production Server starten
yarn start
```

---

## 🤝 Beiträge

Beiträge sind willkommen! Bitte:

1. Fork das Repository
2. Erstelle einen Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Committe deine Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. Pushe zum Branch (`git push origin feature/AmazingFeature`)
5. Öffne einen Pull Request

---

## 📄 Lizenz

Dieses Projekt steht unter der MIT Lizenz.

---

## 🙏 Danksagungen

- [Next.js](https://nextjs.org/)
- [Prisma](https://www.prisma.io/)
- [NextAuth.js](https://next-auth.js.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [Lucide Icons](https://lucide.dev/)

---

## 📧 Support

Bei Fragen oder Problemen:
- Öffne ein [GitHub Issue](https://github.com/Zenovs/planbar/issues)
- Kontaktiere das Team

---

**Gebaut mit ❤️ für effizientes Team-Management**
