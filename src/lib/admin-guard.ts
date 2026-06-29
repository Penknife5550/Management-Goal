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

// Liefert null wenn berechtigt, sonst eine fertige Fehlerantwort.
export function requireAdminToken(request: NextRequest): ReturnType<typeof jsonError> | null {
  const expected = process.env.ADMIN_TOKEN ?? "";
  if (!expected) {
    return jsonError("ADMIN_TOKEN ist nicht konfiguriert — Endpunkt gesperrt.", 500);
  }
  const got = request.headers.get("x-admin-token") ?? "";
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  const ok = a.length === b.length && timingSafeEqual(a, b);
  if (!ok) return jsonError("Keine Berechtigung.", 403);
  return null;
}

// Cron-Route: Authorization: Bearer <CRON_SECRET>
export function requireCronSecret(request: NextRequest): ReturnType<typeof jsonError> | null {
  const expected = process.env.CRON_SECRET ?? "";
  if (!expected) {
    return jsonError("CRON_SECRET ist nicht konfiguriert — Endpunkt gesperrt.", 500);
  }
  const header = request.headers.get("authorization") ?? "";
  const got = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  const ok = a.length === b.length && timingSafeEqual(a, b);
  if (!ok) return jsonError("Keine Berechtigung.", 403);
  return null;
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
