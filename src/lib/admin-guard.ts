// ============================================================
// src/lib/admin-guard.ts
// Uebergangs-Schutz fuer Einstellungs-/Test-Endpunkte, solange es noch keine
// RBAC gibt (Phase 4). Erwartet den Header "x-admin-token" == ENV ADMIN_TOKEN.
// In Phase 4 ersetzt durch echte Auth/Rollen.
//
// Zusaetzlich: ein schlanker In-Memory-Rate-Limiter fuer den Test-Versand,
// damit der Endpunkt nicht als offenes Mail-Relay missbraucht werden kann.
// Hinweis: pro Prozess (eine Instanz) — bei Mehr-Instanz-Betrieb spaeter zentralisieren.
// ============================================================
import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { jsonError } from "@/lib/api";

// Laengen-sicherer Konstantzeit-Vergleich (timingSafeEqual wirft bei ungleicher Laenge).
function vergleicheSecret(got: string, expected: string): boolean {
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Prueft ein Secret aus dem Request gegen eine ENV-Variable. Liefert null wenn
// berechtigt, sonst eine fertige Fehlerantwort (500 = ENV fehlt, 403 = falsch).
function pruefeSecret(envName: string, got: string): ReturnType<typeof jsonError> | null {
  const expected = process.env[envName] ?? "";
  if (!expected) return jsonError(`${envName} ist nicht konfiguriert — Endpunkt gesperrt.`, 500);
  return vergleicheSecret(got, expected) ? null : jsonError("Keine Berechtigung.", 403);
}

// Einstellungs-/Test-Routen: Header "x-admin-token" == ADMIN_TOKEN.
export function requireAdminToken(request: NextRequest): ReturnType<typeof jsonError> | null {
  return pruefeSecret("ADMIN_TOKEN", request.headers.get("x-admin-token") ?? "");
}

// Wrapper fuer admin-geschuetzte Routen: Token-Guard + einheitliches try/catch/500.
// Spart den wiederholten Vorspann in jeder Settings-Route.
export function withAdmin(
  name: string,
  handler: (request: NextRequest) => Promise<Response> | Response,
): (request: NextRequest) => Promise<Response> {
  return async (request) => {
    const verweigert = requireAdminToken(request);
    if (verweigert) return verweigert;
    try {
      return await handler(request);
    } catch (fehler) {
      console.error(`${name} fehlgeschlagen:`, fehler);
      return jsonError("Interner Serverfehler.", 500);
    }
  };
}

// Cron-Route: Authorization: Bearer <CRON_SECRET>.
export function requireCronSecret(request: NextRequest): ReturnType<typeof jsonError> | null {
  const header = request.headers.get("authorization") ?? "";
  const got = header.startsWith("Bearer ") ? header.slice(7) : "";
  return pruefeSecret("CRON_SECRET", got);
}

// =============================================
// Rate-Limiter (Test-Versand)
// =============================================
const hits = new Map<string, number[]>();

// Erlaubt max. `limit` Aufrufe pro `windowMs` je Schluessel.
export function rateLimit(key: string, limit = 5, windowMs = 10 * 60_000): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}
