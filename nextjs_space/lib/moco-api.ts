import { decrypt } from './encryption';

// MOCO Schedule/Absence (Abwesenheit/Ferien)
interface MocoSchedule {
  id: number;
  date: string;
  am: string | null;  // "absence" | "absence_am" | null
  pm: string | null;  // "absence" | "absence_pm" | null
  comment: string | null;
  absence: {
    id: number;
    name: string;     // z.B. "Ferien", "Feiertag", "Krank"
    color: string;
  } | null;
  assignment: {
    id: number;
    name: string;
  } | null;
  user: {
    id: number;
    firstname: string;
    lastname: string;
  };
}

interface MocoApiResponse {
  success: boolean;
  data?: MocoSchedule[];
  error?: string;
}

/**
 * Ruft Abwesenheiten/Ferien von der MOCO API ab
 * @param apiKeyEncrypted Verschlüsselter API-Key
 * @param apiKeyIv IV für Entschlüsselung
 * @param instanceDomain MOCO Instance (z.B. "meinefirma" für meinefirma.mocoapp.com)
 * @param fromDate Start-Datum (YYYY-MM-DD)
 * @param toDate End-Datum (YYYY-MM-DD)
 * @param userId Optional: MOCO User ID (wenn leer, werden eigene Abwesenheiten geholt)
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
    // API-Key entschlüsseln
    const apiKey = decrypt(apiKeyEncrypted, apiKeyIv);
    
    const baseUrl = `https://${instanceDomain}.mocoapp.com/api/v1`;
    // schedules Endpoint für Abwesenheiten
    let url = `${baseUrl}/schedules?from=${fromDate}&to=${toDate}`;
    if (userId) {
      url += `&user_id=${userId}`;
    }
    
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
    
    const data = await response.json();
    // Nur Einträge mit Abwesenheiten filtern
    const absences = (data as MocoSchedule[]).filter(
      s => s.absence !== null || s.am === 'absence' || s.pm === 'absence'
    );
    return {
      success: true,
      data: absences
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
