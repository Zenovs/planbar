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

export interface MocoApiResponse {
  success: boolean;
  data?: MocoSchedule[];
  error?: string;
  raw?: unknown;  // Für Debug-Zwecke
}

/**
 * Ruft alle Schedules (inkl. Abwesenheiten/Ferien) von der MOCO API ab
 */
export async function fetchMocoSchedules(
  apiKeyEncrypted: string,
  apiKeyIv: string,
  instanceDomain: string,
  fromDate: string,
  toDate: string,
  userId?: number
): Promise<MocoApiResponse> {
  try {
    const apiKey = decrypt(apiKeyEncrypted, apiKeyIv);
    const baseUrl = `https://${instanceDomain}.mocoapp.com/api/v1`;
    
    // Schedules Endpoint - enthält alle Abwesenheiten
    let url = `${baseUrl}/schedules?from=${fromDate}&to=${toDate}`;
    if (userId) {
      url += `&user_id=${userId}`;
    }
    
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
    
    // Alle Schedule-Einträge zurückgeben (mit assignment = Abwesenheit)
    // Filter: Nur Einträge mit einem assignment (= geplante Abwesenheit)
    const schedules = rawData.filter((s: MocoSchedule) => {
      // Ein Schedule ist eine Abwesenheit, wenn assignment vorhanden ist
      // und assignment.type "Absence" ist ODER assignment.name bestimmte Wörter enthält
      if (!s.assignment) return false;
      
      const isAbsence = s.assignment.type?.toLowerCase() === 'absence' ||
        s.assignment.name?.toLowerCase().includes('ferien') ||
        s.assignment.name?.toLowerCase().includes('urlaub') ||
        s.assignment.name?.toLowerCase().includes('feiertag') ||
        s.assignment.name?.toLowerCase().includes('krank') ||
        s.assignment.name?.toLowerCase().includes('holiday') ||
        s.assignment.name?.toLowerCase().includes('vacation') ||
        s.assignment.name?.toLowerCase().includes('sick');
        
      return isAbsence;
    });
    
    console.log('MOCO Abwesenheiten gefunden:', schedules.length);
    if (schedules.length > 0) {
      console.log('Beispiel:', JSON.stringify(schedules[0], null, 2));
    }
    
    return {
      success: true,
      data: schedules as MocoSchedule[],
      raw: rawData.slice(0, 3)  // Erste 3 Einträge für Debug
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
