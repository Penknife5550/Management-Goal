// ============================================================
// src/lib/admin-guard.ts
// Schutz fuer Einstellungs-/Test-Endpunkte: echte Session + Rolle ADMIN
// (withAdmin, ersetzt den frueheren x-admin-token-Uebergang). Cron- und
// KI-Callback-Endpunkte bleiben bewusst secret-basiert (pruefeSecret /
// requireCronSecret) — dort gibt es keine Nutzer-Session.
//
// Zusaetzlich: ein schlanker In-Memory-Rate-Limiter fuer den Test-Versand,
// damit der Endpunkt nicht als offenes Mail-Relay missbraucht werden kann.
// Hinweis: pro Prozess (eine Instanz) — bei Mehr-Instanz-Betrieb spaeter zentralisieren.
// ============================================================
import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { jsonError } from "@/lib/api";
import { getAktuellerNutzer, NichtAngemeldetError } from "./auth";

// Laengen-sicherer Konstantzeit-Vergleich (timingSafeEqual wirft bei ungleicher Laenge).
function vergleicheSecret(got: string, expected: string): boolean {
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Prueft ein Secret aus dem Request gegen eine ENV-Variable. Liefert null wenn
// berechtigt, sonst eine fertige Fehlerantwort (500 = ENV fehlt, 403 = falsch).
export function pruefeSecret(envName: string, got: string): ReturnType<typeof jsonError> | null {
  const expected = process.env[envName] ?? "";
  if (!expected) return jsonError(`${envName} ist nicht konfiguriert — Endpunkt gesperrt.`, 500);
  return vergleicheSecret(got, expected) ? null : jsonError("Keine Berechtigung.", 403);
}

// Wrapper fuer admin-geschuetzte Routen: Session-/Rollen-Guard + einheitliches
// try/catch/500. Spart den wiederholten Vorspann in jeder Settings-Route.
export function withAdmin(
  name: string,
  handler: (request: NextRequest) => Promise<Response> | Response,
): (request: NextRequest) => Promise<Response> {
  return async (request) => {
    // DB-frische Pruefung (getAktuellerNutzer): ein herabgestufter oder
    // deaktivierter Nutzer verliert die Admin-Rechte sofort, nicht erst bei
    // Token-Ablauf.
    let nutzer;
    try {
      nutzer = await getAktuellerNutzer();
    } catch (fehler) {
      if (fehler instanceof NichtAngemeldetError) return jsonError("Nicht angemeldet.", 401);
      throw fehler;
    }
    if (nutzer.rolle !== "ADMIN") return jsonError("Keine Berechtigung.", 403);
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
