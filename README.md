# 🎫 planbar - Projekt- & Ressourcenmanagement

**Umfassendes Projektmanagement-System für Teams**

Ein vollständiges, produktionsreifes Projektmanagement-System mit Ressourcenplanung, Kanban-Board, Team-Verwaltung und Kalenderplanung. Gebaut mit Next.js 14, React 18, TypeScript, PostgreSQL und Tailwind CSS.

🌐 **Live Demo**: [planbar-one.vercel.app](https://planbar-one.vercel.app)

---

## ✨ Features

### 🎯 Projekt-Management

- **📊 Dashboard**: Übersichtliche Statistiken, Workload-Anzeige und schneller Zugriff auf wichtige Informationen
- **🎫 Projekt-Verwaltung**
  - Projekte erstellen, bearbeiten, löschen
  - Status: Offen, In Bearbeitung, Erledigt, Geschlossen
  - Prioritäten: Niedrig, Mittel, Hoch, Kritisch
  - Deadline-Management mit visueller Überfälligkeits-Anzeige
  - Projektleiter/in zuweisen und bearbeiten
  - Kategorien mit Farbcodierung
  - Team-Zuweisung für Projekte

- **✅ Teilaufgaben (Subtasks)**
  - Unbegrenzte Teilaufgaben pro Projekt
  - Eigener Status, Beschreibung und Deadline pro Teilaufgabe
  - Geschätzte Stunden für Ressourcenplanung
  - Zuweisung an Team-Mitglieder
  - Rich-Text Beschreibungen

### 📋 Ansichten

- **🔍 Listen-Ansicht**
  - Filterung nach Status, Priorität, Kategorie, Team, Projektleiter
  - Volltext-Suche in Titel und Beschreibung
  - Sortierung nach verschiedenen Kriterien
  - Inline-Bearbeitung von Teilaufgaben
  - Responsive Kartenansicht

- **📌 Kanban-Board**
  - Drag & Drop Funktionalität
  - Spalten nach Status (Offen, In Bearbeitung, Erledigt)
  - Detail-Popup beim Klick auf Teilaufgaben
  - Schnelle Status-Änderungen
  - Erinnerungs-Funktion mit E-Mail-Benachrichtigung

### 📊 Ressourcenplanung

- **📈 Workload-Übersicht**
  - Auslastung pro Team-Mitglied in Prozent
  - Wochenarbeitszeit-Konfiguration pro Benutzer
  - Berücksichtigung von Abwesenheiten
  - Überfällige Tasks werden automatisch auf "heute" gerechnet
  - Visuelle Kapazitätsanzeige (grün/gelb/rot)

- **🏖️ Abwesenheits-Management**
  - Urlaub, Krankheit, Home-Office etc.
  - Automatische Anpassung der Kapazität
  - Übersicht im Ressourcen-Dashboard

### 📅 Kalenderplanung (Admin)

- **Monats- und Wochenansicht**
- **Deadlines visuell dargestellt**
- **Nur für Administratoren zugänglich**

### 👥 Team-Verwaltung

- **Teams erstellen und verwalten**
- **Team-Mitglieder zuweisen**
- **Team-basierte Filterung in Projektübersicht**
- **Benutzer mit Rollen (Admin/Mitglied)**
- **Wochenarbeitszeit pro Benutzer konfigurieren**

### 🔐 Authentifizierung & Berechtigungen

- **Email/Passwort-Login**
- **Rollenbasierte Zugriffskontrolle (RBAC)**
  - **Admin**: Vollzugriff auf alle Bereiche (Dashboard, Kalender, Team, Ressourcen)
  - **Mitglied**: Eingeschränkter Zugriff (nur Projekte und zugewiesene Aufgaben)
- **Session-Management mit NextAuth.js**
- **Geschützte Routen und API-Endpoints**

### 📧 E-Mail-Benachrichtigungen

- **Erinnerungs-Funktion für Teilaufgaben**
- **Automatische Benachrichtigung an zugewiesene Person**
- **Cooldown-System (10 Minuten) gegen Spam**
- **Konfigurierbar via SMTP**

### 🔗 Teilen-Funktion

- **Projekte mit externen Personen teilen**
- **Automatische Link-Generierung**
- **Kopieren in Zwischenablage**

### 🎨 Design

- **Modern & Responsiv**: Optimiert für Desktop, Tablet und Mobile
- **Mobile-First**: Spezieller xs-Breakpoint (375px) für kleine Smartphones
- **Touch-optimiert**: Alle Buttons mindestens 44px für einfache Bedienung
- **Bottom-Sheets**: Mobile-freundliche Popups auf kleinen Bildschirmen
- **Animationen**: Smooth Framer Motion Animationen
- **Gradients & Shadows**: Ansprechendes Design mit Farbverläufen

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
    │   │   ├── tickets/          # Projekt CRUD
    │   │   ├── subtasks/         # Teilaufgaben CRUD
    │   │   ├── teams/            # Team Management
    │   │   ├── categories/       # Kategorien CRUD
    │   │   ├── absences/         # Abwesenheiten CRUD
    │   │   └── users/            # User Management
    │   ├── dashboard/            # Dashboard Seite
    │   ├── tickets/              # Projekt Pages
    │   │   ├── [id]/             # Projekt Detail/Edit
    │   │   └── new/              # Neues Projekt
    │   ├── team/                 # Team-Verwaltung
    │   ├── ressourcen/           # Ressourcenplanung
    │   ├── kalenderplanung/      # Kalender (Admin)
    │   ├── settings/             # Einstellungen
    │   ├── layout.tsx            # Root Layout
    │   └── page.tsx              # Landing/Login
    ├── components/               # React Components
    │   ├── ui/                   # shadcn/ui Components
    │   ├── header.tsx            # Sticky Navigation (RBAC)
    │   ├── ticket-card.tsx       # Projekt Karte
    │   ├── subtask-detail-popup.tsx  # Teilaufgaben-Detail
    │   ├── status-badge.tsx      # Status Badge
    │   └── priority-badge.tsx    # Priorität Badge
    ├── lib/                      # Utilities
    │   ├── auth.ts               # NextAuth Config
    │   ├── db.ts                 # Prisma Client
    │   ├── email.ts              # E-Mail Service
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
- `role`: Rolle (admin/Mitglied)
- `weeklyHours`: Wochenarbeitszeit (Standard: 40)
- `createdAt`: Erstellungsdatum

### Ticket (Projekt)
- `id`: Eindeutige ID
- `title`: Projekt-Titel
- `description`: Detaillierte Beschreibung
- `status`: Status (open/in_progress/done/closed)
- `priority`: Priorität (low/medium/high/critical)
- `deadline`: Fälligkeitsdatum (optional)
- `assignedToId`: Zugewiesener Benutzer (optional)
- `projectManagerId`: Projektleiter/in
- `categoryId`: Kategorie
- `teamId`: Zugewiesenes Team
- `createdById`: Ersteller
- `createdAt`: Erstellungsdatum
- `updatedAt`: Letzte Änderung

### SubTask (Teilaufgabe)
- `id`: Eindeutige ID
- `title`: Teilaufgaben-Titel
- `description`: Beschreibung
- `status`: Status (open/in_progress/done)
- `dueDate`: Fälligkeitsdatum
- `estimatedHours`: Geschätzte Stunden
- `assignedToId`: Zugewiesener Benutzer
- `ticketId`: Zugehöriges Projekt

### Team
- `id`: Eindeutige ID
- `name`: Team-Name
- `color`: Team-Farbe (Hex)
- `createdAt`: Erstellungsdatum

### TeamMember
- `id`: Eindeutige ID
- `userId`: Benutzer-ID
- `teamId`: Team-ID

### Category (Kategorie)
- `id`: Eindeutige ID
- `name`: Kategorie-Name
- `color`: Farbe (Hex)

### Absence (Abwesenheit)
- `id`: Eindeutige ID
- `userId`: Benutzer-ID
- `startDate`: Startdatum
- `endDate`: Enddatum
- `type`: Typ (vacation/sick/other)
- `description`: Beschreibung

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

### Projekte erstellen

1. Navigiere zu "Projekte" im Header
2. Klicke auf "Neues Projekt"
3. Fülle das Formular aus:
   - **Titel**: Kurze Beschreibung des Projekts
   - **Beschreibung**: Detaillierte Information (optional)
   - **Status**: Aktueller Status
   - **Priorität**: Wichtigkeit des Projekts
   - **Projektleiter/in**: Verantwortliche Person
   - **Team**: Zugewiesenes Team
   - **Kategorie**: Projekt-Kategorie
   - **Deadline**: Fälligkeitsdatum (optional)
4. **Teilaufgaben hinzufügen** (optional):
   - Klicke auf "Teilaufgabe hinzufügen"
   - Gib Titel, Beschreibung, zugewiesene Person und geschätzte Stunden ein
5. Klicke auf "Projekt erstellen"

### Projekte filtern und suchen

1. Gehe zur Projekt-Übersicht
2. Nutze die Filter-Optionen:
   - **Suche**: Volltextsuche in Titel/Beschreibung
   - **Status**: Filtere nach Projekt-Status
   - **Priorität**: Filtere nach Priorität
   - **Kategorie**: Filtere nach Kategorie
   - **Team**: Filtere nach Team (für Mitglieder nur eigene Teams)
   - **Projektleiter**: Filtere nach Projektleiter/in
   - **Sortierung**: Sortiere nach verschiedenen Kriterien

### Kanban-Board nutzen

1. Öffne ein Projekt und wechsle zur Kanban-Ansicht
2. **Status ändern**: Ziehe Teilaufgaben zwischen Spalten
3. **Details anzeigen**: Klicke auf eine Teilaufgabe für das Detail-Popup
4. **Erinnerung senden**: Klicke auf das Glocken-Icon im Popup
5. **Bearbeiten**: Klicke auf "Bearbeiten" um zur Listen-Ansicht zu wechseln

### Ressourcen planen

1. Navigiere zu "Ressourcen"
2. Sieh die Auslastung pro Team-Mitglied
3. **Auslastungsanzeige**:
   - Grün: < 80% Auslastung
   - Gelb: 80-100% Auslastung
   - Rot: > 100% Überauslastung
4. Überfällige Aufgaben werden automatisch auf "heute" gerechnet

### Team verwalten (Admin)

1. Navigiere zu "Team"
2. **Team erstellen**:
   - Klicke auf "Neues Team"
   - Gib Namen und Farbe ein
3. **Mitglieder verwalten**:
   - Klicke auf ein Team
   - Füge Benutzer hinzu oder entferne sie
4. **Benutzer verwalten**:
   - Klicke auf "Mitglied hinzufügen"
   - Gib Name, E-Mail, Passwort und Wochenarbeitszeit ein
   - Wähle Rolle (Mitglied/Admin)

### Abwesenheiten verwalten (Admin)

1. Navigiere zu "Ressourcen"
2. Klicke auf "Abwesenheit hinzufügen"
3. Wähle Mitarbeiter, Datum und Typ (Urlaub/Krank/Sonstiges)

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

### Tickets (Projekte)
- `GET /api/tickets` - Liste aller Projekte (mit Filtern: status, priority, category, team, projectManager)
- `POST /api/tickets` - Neues Projekt erstellen (inkl. Teilaufgaben)
- `GET /api/tickets/[id]` - Projekt Details
- `PATCH /api/tickets/[id]` - Projekt aktualisieren (inkl. Projektleiter)
- `DELETE /api/tickets/[id]` - Projekt löschen

### SubTasks (Teilaufgaben)
- `GET /api/subtasks` - Liste aller Teilaufgaben
- `POST /api/subtasks` - Neue Teilaufgabe erstellen
- `PATCH /api/subtasks/[id]` - Teilaufgabe aktualisieren
- `DELETE /api/subtasks/[id]` - Teilaufgabe löschen
- `POST /api/subtasks/[id]/reminder` - E-Mail-Erinnerung senden

### Users (Benutzer)
- `GET /api/users` - Liste aller Benutzer
- `POST /api/users` - Neuen Benutzer erstellen (Admin)
- `PATCH /api/users/[id]` - Benutzer aktualisieren (Admin)
- `DELETE /api/users/[id]` - Benutzer löschen (Admin)

### Teams
- `GET /api/teams` - Liste aller Teams
- `POST /api/teams` - Neues Team erstellen
- `PATCH /api/teams/[id]` - Team aktualisieren
- `DELETE /api/teams/[id]` - Team löschen
- `POST /api/teams/[id]/members` - Mitglied hinzufügen
- `DELETE /api/teams/[id]/members/[userId]` - Mitglied entfernen

### Categories (Kategorien)
- `GET /api/categories` - Liste aller Kategorien
- `POST /api/categories` - Neue Kategorie erstellen
- `PATCH /api/categories/[id]` - Kategorie aktualisieren
- `DELETE /api/categories/[id]` - Kategorie löschen

### Absences (Abwesenheiten)
- `GET /api/absences` - Liste aller Abwesenheiten
- `POST /api/absences` - Neue Abwesenheit erstellen
- `PATCH /api/absences/[id]` - Abwesenheit aktualisieren
- `DELETE /api/absences/[id]` - Abwesenheit löschen

### Resources (Ressourcen)
- `GET /api/resources` - Workload-Daten pro Benutzer

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
