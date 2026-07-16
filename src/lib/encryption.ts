// ============================================================
// src/lib/encryption.ts
// AES-256-GCM fuer sensible Felder (aktuell: SMTP-Passwort).
// Pattern aus dem CREDO HR-Portal. Schluessel: 64-stelliger Hex-String
// (32 Bytes) in ENCRYPTION_KEY  ->  openssl rand -hex 32
// ============================================================
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// Cache pro Hex-Schluessel, damit nicht bei jedem Aufruf neu geparst wird.
const keyCache = new Map<string, Buffer>();

function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY ?? "";
  const cached = keyCache.get(keyHex);
  if (cached) return cached;

  if (keyHex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY muss ein exakt 64-stelliger Hex-String (32 Bytes) sein. " +
        "Generieren mit: openssl rand -hex 32",
    );
  }
  const buf = Buffer.from(keyHex, "hex");
  keyCache.set(keyHex, buf);
  return buf;
}

// Verschluesselt Klartext zu "iv:authTag:ciphertext" (alles Base64).
export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

// Entschluesselt "iv:authTag:ciphertext". Unverschluesselte Altwerte (ohne ":")
// werden unveraendert zurueckgegeben.
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText;

  const [ivB64, tagB64, dataB64, ...rest] = encryptedText.split(":");
  if (!ivB64 || !tagB64 || !dataB64 || rest.length > 0) return encryptedText;

  try {
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(tagB64, "base64");
    const encrypted = Buffer.from(dataB64, "base64");
    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
      return encryptedText;
    }
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
  } catch {
    // Struktur passte (iv:tag:data, korrekte Laengen), aber Entschluesselung schlug
    // fehl -> kein Altdaten-Klartext, sondern Schluessel-Mismatch/Manipulation.
    // NICHT den Ciphertext als Klartext zurueckgeben (sonst stiller SMTP-Auth-Fehler).
    throw new Error(
      "Entschluesselung fehlgeschlagen — ENCRYPTION_KEY passt nicht zum gespeicherten Wert.",
    );
  }
}

// Startup-/Vorab-Check: ist ein gueltiger Schluessel konfiguriert?
export function isEncryptionConfigured(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}
