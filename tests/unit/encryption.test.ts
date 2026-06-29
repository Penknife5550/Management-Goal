// ============================================================
// tests/unit/encryption.test.ts
// AES-256-GCM: Roundtrip, Format, Altdaten-Passthrough, Schluessel-Mismatch
// (muss werfen, nicht still Klartext liefern) und Konfig-Check.
// ============================================================
import { afterEach, describe, expect, it } from "vitest";
import { decrypt, encrypt, isEncryptionConfigured } from "../../src/lib/encryption";

const KEY_A = "a".repeat(64); // 32 Bytes Hex
const KEY_B = "b".repeat(64);

afterEach(() => {
  delete process.env.ENCRYPTION_KEY;
});

describe("encrypt/decrypt", () => {
  it("Roundtrip ergibt den Klartext zurueck", () => {
    process.env.ENCRYPTION_KEY = KEY_A;
    const klartext = "S3hr-geheim!";
    expect(decrypt(encrypt(klartext))).toBe(klartext);
  });

  it("Ausgabe hat das Format iv:tag:cipher (3 Base64-Teile)", () => {
    process.env.ENCRYPTION_KEY = KEY_A;
    expect(encrypt("x").split(":")).toHaveLength(3);
  });

  it("leerer String bleibt unveraendert", () => {
    process.env.ENCRYPTION_KEY = KEY_A;
    expect(encrypt("")).toBe("");
    expect(decrypt("")).toBe("");
  });

  it("Altdaten ohne ':' werden als Klartext durchgereicht", () => {
    process.env.ENCRYPTION_KEY = KEY_A;
    expect(decrypt("klartext-altwert")).toBe("klartext-altwert");
  });

  it("falscher Schluessel wirft (kein stiller Klartext-Fallback)", () => {
    process.env.ENCRYPTION_KEY = KEY_A;
    const cipher = encrypt("geheim");
    process.env.ENCRYPTION_KEY = KEY_B;
    expect(() => decrypt(cipher)).toThrow();
  });
});

describe("isEncryptionConfigured", () => {
  it("true bei gueltigem 64-stelligem Schluessel", () => {
    process.env.ENCRYPTION_KEY = KEY_A;
    expect(isEncryptionConfigured()).toBe(true);
  });

  it("false ohne Schluessel oder bei falscher Laenge", () => {
    delete process.env.ENCRYPTION_KEY;
    expect(isEncryptionConfigured()).toBe(false);
    process.env.ENCRYPTION_KEY = "z".repeat(60);
    expect(isEncryptionConfigured()).toBe(false);
  });
});
