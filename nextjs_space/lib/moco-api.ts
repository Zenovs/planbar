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
): Promise<{ success: boolean; userId?: number; userName?: string; error?: string }> {
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
      userName: `${data.firstname} ${data.lastname}`
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Ruft NUR die Abwesenheiten (Ferien, Krank, Feiertage) des aktuellen MOCO-Users ab
 */
export async function fetchMocoSchedules(
  apiKeyEncrypted: string,
  apiKeyIv: string,
  instanceDomain: string,
  fromDate: string,
  toDate: string
): Promise<MocoApiResponse> {
  try {
    const apiKey = decrypt(apiKeyEncrypted, apiKeyIv);
    const baseUrl = `https://${instanceDomain}.mocoapp.com/api/v1`;
    
    // 1. Zuerst die MOCO User-ID des API-Key Besitzers holen
    const userResult = await getMocoCurrentUser(apiKey, instanceDomain);
    if (!userResult.success || !userResult.userId) {
      return {
        success: false,
        error: userResult.error || 'Konnte MOCO User nicht ermitteln'
      };
    }

    const mocoUserId = userResult.userId;
    const mocoUserName = userResult.userName;
    console.log(`MOCO User: ${mocoUserName} (ID: ${mocoUserId})`);
    
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
 * Testet die MOCO API Verbindung
 */
export async function testMocoConnection(
  apiKeyEncrypted: string,
  apiKeyIv: string,
  instanceDomain: string
): Promise<{ success: boolean; error?: string; userName?: string }> {
  try {
    const apiKey = decrypt(apiKeyEncrypted, apiKeyIv);
    
    const baseUrl = `https://${instanceDomain}.mocoapp.com/api/v1`;
    const url = `${baseUrl}/session`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Token token=${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      return {
        success: false,
        error: `Verbindung fehlgeschlagen: ${response.status}`
      };
    }
    
    const data = await response.json();
    return {
      success: true,
      userName: `${data.firstname} ${data.lastname}`
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Verbindungsfehler'
    };
  }
}
