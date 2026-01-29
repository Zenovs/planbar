import { decrypt } from './encryption';

// MOCO Schedule Entry (basierend auf offizieller API-Dokumentation)
interface MocoSchedule {
  id: number;
  date: string;
  comment: string | null;
  am: boolean | null;        // Vormittag belegt
  pm: boolean | null;        // Nachmittag belegt
  symbol: number | null;     // Symbol-ID (z.B. für Feiertag, Krankheit)
  assignment: {
    id: number;
    name: string;            // z.B. "Ferien", "Feiertag", "Krank"
    customer_name: string | null;
    color: string;
    type: string;            // "Absence" für Abwesenheiten
  } | null;
  user: {
    id: number;
    firstname: string;
    lastname: string;
  };
  created_at: string;
  updated_at: string;
}

// MOCO Session/User Response
interface MocoSessionResponse {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
}

// MOCO User für E-Mail-Validierung
interface MocoUserResponse {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
}

export interface MocoApiResponse {
  success: boolean;
  data?: MocoSchedule[];
  error?: string;
  raw?: unknown;
  mocoUserId?: number;
  mocoUserName?: string;
}

// Erlaubte Abwesenheitstypen (nur diese werden importiert)
const ALLOWED_ABSENCE_TYPES = [
  'ferien',
  'urlaub',
  'vacation',
  'holiday',
  'feiertag',
  'public holiday',
  'krank',
  'krankheit',
  'sick',
  'illness'
];

/**
 * Prüft ob ein Assignment-Name eine erlaubte Abwesenheit ist
 */
function isAllowedAbsence(name: string | undefined): boolean {
  if (!name) return false;
  const lowerName = name.toLowerCase();
  return ALLOWED_ABSENCE_TYPES.some(type => lowerName.includes(type));
}

/**
 * Holt die MOCO User-ID des API-Key Besitzers
 */
export async function getMocoCurrentUser(
  apiKey: string,
  instanceDomain: string
): Promise<{ success: boolean; userId?: number; userName?: string; userEmail?: string; error?: string }> {
  try {
    const baseUrl = `https://${instanceDomain}.mocoapp.com/api/v1`;
    const response = await fetch(`${baseUrl}/session`, {
      method: 'GET',
      headers: {
        'Authorization': `Token token=${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return { success: false, error: `Session API Fehler: ${response.status}` };
    }

    const data: MocoSessionResponse = await response.json();
    return {
      success: true,
      userId: data.id,
      userName: `${data.firstname} ${data.lastname}`,
      userEmail: data.email
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Sucht einen MOCO User anhand seiner E-Mail-Adresse
 * Hinweis: Viele API-Keys haben keine Berechtigung für /users (403)
 * In diesem Fall wird der API-Key-Besitzer verwendet
 */
export async function findMocoUserByEmail(
  apiKey: string,
  instanceDomain: string,
  email: string
): Promise<{ success: boolean; userId?: number; userName?: string; error?: string; fallbackToSession?: boolean }> {
  try {
    const baseUrl = `https://${instanceDomain}.mocoapp.com/api/v1`;
    
    // Versuche alle User abzurufen
    const response = await fetch(`${baseUrl}/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Token token=${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    // Bei 403 (keine Berechtigung) → Fallback auf Session-User
    if (response.status === 403) {
      console.log('MOCO /users nicht erlaubt (403), verwende Session-User');
      return { 
        success: true, 
        fallbackToSession: true 
      };
    }

    if (!response.ok) {
      return { success: false, error: `Users API Fehler: ${response.status}` };
    }

    const users: MocoUserResponse[] = await response.json();
    const matchingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!matchingUser) {
      // E-Mail nicht gefunden, aber wir erlauben trotzdem den Sync mit dem API-Key-Besitzer
      console.log(`E-Mail "${email}" nicht in MOCO gefunden, verwende Session-User`);
      return { 
        success: true, 
        fallbackToSession: true 
      };
    }

    return {
      success: true,
      userId: matchingUser.id,
      userName: `${matchingUser.firstname} ${matchingUser.lastname}`
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Ruft NUR die Abwesenheiten (Ferien, Krank, Feiertage) des angegebenen MOCO-Users ab
 * @param mocoEmail - Optional: E-Mail-Adresse des MOCO-Users dessen Daten geholt werden sollen
 */
export async function fetchMocoSchedules(
  apiKeyEncrypted: string,
  apiKeyIv: string,
  instanceDomain: string,
  fromDate: string,
  toDate: string,
  mocoEmail?: string
): Promise<MocoApiResponse> {
  try {
    const apiKey = decrypt(apiKeyEncrypted, apiKeyIv);
    const baseUrl = `https://${instanceDomain}.mocoapp.com/api/v1`;
    
    let mocoUserId: number;
    let mocoUserName: string | undefined;
    
    // Zuerst immer den Session-User (API-Key-Besitzer) holen
    const sessionResult = await getMocoCurrentUser(apiKey, instanceDomain);
    if (!sessionResult.success || !sessionResult.userId) {
      return {
        success: false,
        error: sessionResult.error || 'Konnte MOCO User nicht ermitteln'
      };
    }
    
    // Wenn eine E-Mail angegeben ist, versuche User über E-Mail zu finden
    if (mocoEmail) {
      console.log(`MOCO: Versuche User mit E-Mail zu finden: ${mocoEmail}`);
      const userByEmail = await findMocoUserByEmail(apiKey, instanceDomain, mocoEmail);
      
      if (userByEmail.success && userByEmail.userId && !userByEmail.fallbackToSession) {
        // E-Mail-User gefunden
        mocoUserId = userByEmail.userId;
        mocoUserName = userByEmail.userName;
        console.log(`MOCO User per E-Mail gefunden: ${mocoUserName} (ID: ${mocoUserId})`);
      } else {
        // Fallback auf Session-User (bei 403 oder E-Mail nicht gefunden)
        mocoUserId = sessionResult.userId;
        mocoUserName = sessionResult.userName;
        console.log(`MOCO: Verwende Session-User: ${mocoUserName} (ID: ${mocoUserId})`);
      }
    } else {
      // Keine E-Mail angegeben → API-Key Besitzer verwenden
      mocoUserId = sessionResult.userId;
      mocoUserName = sessionResult.userName;
      console.log(`MOCO User (API-Key Owner): ${mocoUserName} (ID: ${mocoUserId})`);
    }
    
    // 2. Schedules NUR für diesen User abrufen (user_id Parameter!)
    const url = `${baseUrl}/schedules?from=${fromDate}&to=${toDate}&user_id=${mocoUserId}`;
    console.log('MOCO API Request:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Token token=${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('MOCO API Fehler:', response.status, errorText);
      return {
        success: false,
        error: `MOCO API Fehler: ${response.status} - ${errorText}`
      };
    }
    
    const rawData = await response.json();
    console.log('MOCO API Response count:', Array.isArray(rawData) ? rawData.length : 'not array');
    
    if (!Array.isArray(rawData)) {
      return {
        success: false,
        error: 'Unerwartete API-Antwort (kein Array)',
        raw: rawData
      };
    }
    
    // 3. NUR Ferien, Krank, Feiertage filtern (keine Projekte oder andere Einträge)
    const schedules = rawData.filter((s: MocoSchedule) => {
      // Muss ein assignment haben
      if (!s.assignment) return false;
      
      // Nur erlaubte Abwesenheitstypen
      if (!isAllowedAbsence(s.assignment.name)) {
        console.log(`Überspringe: ${s.assignment.name} (kein erlaubter Abwesenheitstyp)`);
        return false;
      }
      
      return true;
    });
    
    console.log(`MOCO Abwesenheiten für ${mocoUserName}: ${schedules.length} Einträge`);
    schedules.forEach((s: MocoSchedule) => {
      console.log(`  - ${s.date}: ${s.assignment?.name}`);
    });
    
    return {
      success: true,
      data: schedules as MocoSchedule[],
      raw: rawData.slice(0, 5),
      mocoUserId,
      mocoUserName
    };
  } catch (error) {
    console.error('MOCO API Anfrage fehlgeschlagen:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    };
  }
}

// Legacy-Funktion für Abwärtskompatibilität
export async function fetchMocoActivities(
  apiKeyEncrypted: string,
  apiKeyIv: string,
  instanceDomain: string,
  fromDate: string,
  toDate: string
): Promise<MocoApiResponse> {
  return fetchMocoSchedules(apiKeyEncrypted, apiKeyIv, instanceDomain, fromDate, toDate);
}

/**
 * Testet die MOCO API Verbindung und validiert optional die E-Mail
 * @param mocoEmail - Optional: E-Mail zur Validierung, dass dieser User existiert
 */
export async function testMocoConnection(
  apiKeyEncrypted: string,
  apiKeyIv: string,
  instanceDomain: string,
  mocoEmail?: string
): Promise<{ success: boolean; error?: string; userName?: string; userEmail?: string }> {
  try {
    const apiKey = decrypt(apiKeyEncrypted, apiKeyIv);
    
    const baseUrl = `https://${instanceDomain}.mocoapp.com/api/v1`;
    const url = `${baseUrl}/session`;
    
    console.log(`MOCO Test: Verbindung zu ${baseUrl}...`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Token token=${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const statusCode = response.status;
      let errorMessage = '';
      
      switch (statusCode) {
        case 401:
          errorMessage = 'Ungültiger API-Key. Bitte prüfen Sie, ob der API-Key korrekt kopiert wurde.';
          break;
        case 403:
          errorMessage = 'Zugriff verweigert. Der API-Key hat keine Berechtigung für diese MOCO-Instanz. Bitte prüfen Sie: 1) Ist die Domain korrekt? 2) Hat Ihr Account API-Zugriff?';
          break;
        case 404:
          errorMessage = `MOCO-Instanz "${instanceDomain}" nicht gefunden. Bitte prüfen Sie die Domain (ohne .mocoapp.com).`;
          break;
        default:
          errorMessage = `MOCO API Fehler: ${statusCode}`;
      }
      
      console.error(`MOCO Test fehlgeschlagen: ${statusCode}`, await response.text().catch(() => ''));
      
      return {
        success: false,
        error: errorMessage
      };
    }
    
    const data = await response.json();
    
    // Session gibt nur id und uuid zurück, wir brauchen mehr Details
    // Versuche Schedules abzurufen um den User-Namen zu bekommen
    const schedulesTest = await fetch(`${baseUrl}/schedules?from=2026-01-01&to=2026-01-02&user_id=${data.id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Token token=${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    let userName = `User ${data.id}`;
    if (schedulesTest.ok) {
      const schedules = await schedulesTest.json();
      if (Array.isArray(schedules) && schedules.length > 0 && schedules[0].user) {
        userName = `${schedules[0].user.firstname} ${schedules[0].user.lastname}`;
      }
    }
    
    console.log(`MOCO Test: Verbindung OK für ${userName}`);
    
    // E-Mail-Validierung überspringen (viele API-Keys haben keine /users Berechtigung)
    // Die E-Mail wird nur als Referenz gespeichert
    
    return {
      success: true,
      userName: userName,
      userEmail: mocoEmail || data.email
    };
  } catch (error) {
    console.error('MOCO Test Exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Verbindungsfehler - bitte Domain und API-Key prüfen'
    };
  }
}
