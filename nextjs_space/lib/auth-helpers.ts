/**
 * Zentralisierte Auth-Hilfsfunktionen
 * Verhindert inkonsistente Rollenprüfungen
 * 
 * Rollen-Hierarchie (von oben nach unten):
 * 1. Admin - Vollzugriff auf alles
 * 2. Projektleiter - Teams & Benutzer verwalten, keine System-Einstellungen
 * 3. Koordinator - Team-Tasks sehen und zuweisen
 * 4. Mitglied - Nur eigene Daten
 */

export function isAdmin(role: string | null | undefined): boolean {
  const normalizedRole = role?.toLowerCase();
  return normalizedRole === 'admin' || normalizedRole === 'administrator';
}

export function isProjektleiter(role: string | null | undefined): boolean {
  const normalizedRole = role?.toLowerCase();
  return normalizedRole === 'projektleiter';
}

export function isKoordinator(role: string | null | undefined): boolean {
  const normalizedRole = role?.toLowerCase();
  return normalizedRole === 'koordinator';
}

export function isAdminOrProjektleiter(role: string | null | undefined): boolean {
  return isAdmin(role) || isProjektleiter(role);
}

export function isAdminOrKoordinator(role: string | null | undefined): boolean {
  return isAdmin(role) || isKoordinator(role);
}

export function isProjektleiterOrHigher(role: string | null | undefined): boolean {
  return isAdmin(role) || isProjektleiter(role);
}

export function isKoordinatorOrHigher(role: string | null | undefined): boolean {
  return isAdmin(role) || isProjektleiter(role) || isKoordinator(role);
}

export function canManageUsers(role: string | null | undefined): boolean {
  // Admins und Projektleiter können Benutzer verwalten
  return isAdminOrProjektleiter(role);
}

export function canManageTeams(role: string | null | undefined): boolean {
  // Admins und Projektleiter können Teams verwalten
  return isAdminOrProjektleiter(role);
}

export function canManageTeam(role: string | null | undefined): boolean {
  // Alias für canManageTeams
  return canManageTeams(role);
}

export function canAssignTasks(role: string | null | undefined): boolean {
  // Admins, Projektleiter und Koordinatoren können Tasks zuweisen
  return isKoordinatorOrHigher(role);
}

export function canViewAllData(role: string | null | undefined): boolean {
  // Nur Admins sehen alle Daten
  return isAdmin(role);
}

export function canViewTeamData(role: string | null | undefined): boolean {
  // Admins, Projektleiter und Koordinatoren sehen Team-Daten
  return isKoordinatorOrHigher(role);
}

/**
 * Validiert ein Passwort gegen Mindestanforderungen
 * - Mindestens 8 Zeichen
 * - Mindestens ein Großbuchstabe
 * - Mindestens ein Kleinbuchstabe
 * - Mindestens eine Zahl
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { valid: false, error: 'Passwort muss mindestens 8 Zeichen lang sein' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Passwort muss mindestens einen Kleinbuchstaben enthalten' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Passwort muss mindestens einen Großbuchstaben enthalten' };
  }
  
  if (!/\d/.test(password)) {
    return { valid: false, error: 'Passwort muss mindestens eine Zahl enthalten' };
  }
  
  return { valid: true };
}

/**
 * Validiert eine E-Mail-Adresse
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
