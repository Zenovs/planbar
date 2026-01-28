import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

// Verwende ENCRYPTION_KEY aus env oder generiere einen fallback (nur für Development)
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (key) {
    // Key sollte 32 bytes (256 bits) sein
    return Buffer.from(key, 'hex');
  }
  // Fallback für Development - NICHT in Production verwenden!
  console.warn('⚠️ ENCRYPTION_KEY nicht gesetzt - verwende Fallback');
  return crypto.scryptSync('planbar-moco-default-key', 'salt', 32);
}

/**
 * Verschlüsselt einen String (z.B. API-Key)
 * @param text Der zu verschlüsselnde Text
 * @returns { encrypted: string, iv: string }
 */
export function encrypt(text: string): { encrypted: string; iv: string } {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    encrypted,
    iv: iv.toString('hex')
  };
}

/**
 * Entschlüsselt einen verschlüsselten String
 * @param encrypted Der verschlüsselte Text
 * @param ivHex Der Initialization Vector als hex string
 * @returns Der entschlüsselte Text
 */
export function decrypt(encrypted: string, ivHex: string): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Prüft ob ein Wert verschlüsselt werden kann/soll
 */
export function isValidApiKey(apiKey: string): boolean {
  // MOCO API Keys haben ein bestimmtes Format
  return apiKey.length >= 20 && apiKey.length <= 100;
}
