/**
 * Zentralisierte Auth-Hilfsfunktionen
 * Verhindert inkonsistente Rollenprüfungen
 */

export function isAdmin(role: string | null | undefined): boolean {
  const normalizedRole = role?.toLowerCase();
  return normalizedRole === 'admin' || normalizedRole === 'administrator';
}

export function isKoordinator(role: string | null | undefined): boolean {
  const normalizedRole = role?.toLowerCase();
  return normalizedRole === 'koordinator';
}

export function isAdminOrKoordinator(role: string | null | undefined): boolean {
  return isAdmin(role) || isKoordinator(role);
}

export function canManageUsers(role: string | null | undefined): boolean {
  // Nur Admins können Benutzer verwalten
  return isAdmin(role);
}

export function canManageTeam(role: string | null | undefined): boolean {
  // Admins und Koordinatoren können Teams verwalten
  return isAdminOrKoordinator(role);
}

export function canAssignTasks(role: string | null | undefined): boolean {
  // Admins und Koordinatoren können Tasks zuweisen
  return isAdminOrKoordinator(role);
}

export function canViewAllData(role: string | null | undefined): boolean {
  // Nur Admins sehen alle Daten
  return isAdmin(role);
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
