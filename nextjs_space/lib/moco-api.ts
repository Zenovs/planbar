import { decrypt } from './encryption';

interface MocoActivity {
  id: number;
  date: string;
  hours: number;
  seconds: number;
  description: string;
  billed: boolean;
  billable: boolean;
  project: {
    id: number;
    name: string;
  } | null;
  task: {
    id: number;
    name: string;
  } | null;
}

interface MocoApiResponse {
  success: boolean;
  data?: MocoActivity[];
  error?: string;
}

/**
 * Ruft Kalendereinträge (Aktivitäten) von der MOCO API ab
 * @param apiKeyEncrypted Verschlüsselter API-Key
 * @param apiKeyIv IV für Entschlüsselung
 * @param instanceDomain MOCO Instance (z.B. "meinefirma" für meinefirma.mocoapp.com)
 * @param fromDate Start-Datum (YYYY-MM-DD)
 * @param toDate End-Datum (YYYY-MM-DD)
 */
export async function fetchMocoActivities(
  apiKeyEncrypted: string,
  apiKeyIv: string,
  instanceDomain: string,
  fromDate: string,
  toDate: string
): Promise<MocoApiResponse> {
  try {
    // API-Key entschlüsseln
    const apiKey = decrypt(apiKeyEncrypted, apiKeyIv);
    
    const baseUrl = `https://${instanceDomain}.mocoapp.com/api/v1`;
    const url = `${baseUrl}/activities?from=${fromDate}&to=${toDate}`;
    
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
    return {
      success: true,
      data: data as MocoActivity[]
    };
  } catch (error) {
    console.error('MOCO API Anfrage fehlgeschlagen:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    };
  }
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
