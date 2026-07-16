// ============================================================
// src/lib/audit.ts
// Zentraler Audit-Writer (AP6, Personalrat/DSB-Zusage): EIN Weg, Ereignisse
// zu protokollieren -> konsistente Aktions-Codes statt Ad-hoc-Strings
// (bewusste Verbesserung gegenueber dem HR-Portal-Muster).
// Schreibfehler brechen NIE den Hauptfluss (Login darf nicht an einem
// Log-Insert scheitern) - sie landen nur im Server-Log.
// ============================================================
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

// Katalog der Aktions-Codes: bewusst als Union, damit keine Tippfehler-Strings
// in der DB landen. Bei neuen Ereignissen hier erweitern.
export type AuditAktion =
  | "LOGIN_ERFOLG"
  | "LOGIN_FEHLGESCHLAGEN"
  | "LOGOUT"
  | "MAGIC_LINK_ANGEFORDERT"
  | "MAGIC_LINK_EINGELOEST"
  | "MAGIC_LINK_ABGELEHNT";

export interface AuditEintrag {
  aktion: AuditAktion;
  userId?: string | null;
  // Nur unkritische Zusatzinfos (KEINE Passwoerter/Tokens/Hashes).
  details?: Record<string, unknown>;
  ipAddress?: string | null;
}

/** Audit-Eintrag schreiben; wirft nie. */
export async function schreibeAudit(eintrag: AuditEintrag): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        aktion: eintrag.aktion,
        userId: eintrag.userId ?? null,
        details: (eintrag.details as Prisma.InputJsonValue | undefined) ?? undefined,
        ipAddress: eintrag.ipAddress ?? null,
      },
    });
  } catch (fehler) {
    console.error("Audit-Log konnte nicht geschrieben werden:", fehler);
  }
}

/**
 * Best-effort Client-IP aus x-forwarded-for (erste Adresse).
 *
 * ACHTUNG (Security-Review AP6): XFF ist client-kontrollierbar. Der Wert dient
 * hier nur als (a) Audit-Notiz und (b) SEKUNDAERER Rate-Limit-Schluessel. Die
 * PRIMAERE Brute-Force-Bremse sind die konto-gebundenen Limits (pro E-Mail,
 * IP-unabhaengig) in den Login-/Magic-Link-Routen. Sobald die konkrete
 * Reverse-Proxy-Topologie feststeht, hier auf die vom eigenen Proxy gesetzte
 * (rechte) Adresse bzw. eine feste, vertrauenswuerdige Hop-Zahl umstellen.
 */
export function clientIp(request: Request): string | null {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? null;
  return null;
}
