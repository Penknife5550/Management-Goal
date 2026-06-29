// ============================================================
// /api/settings/email-log  (GET)
// Letzte Versandprotokoll-Eintraege (max. 100). Schutz: ADMIN_TOKEN.
// ============================================================
import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { requireAdminToken } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const verweigert = requireAdminToken(request);
  if (verweigert) return verweigert;
  try {
    // Nur die im Protokoll angezeigten Felder ausliefern (kein Leak von messageId/cc/bcc).
    const logs = await prisma.emailLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        event: true,
        recipient: true,
        subject: true,
        status: true,
        detail: true,
        isTest: true,
        createdAt: true,
      },
    });
    return jsonOk(logs);
  } catch (fehler) {
    console.error("GET /api/settings/email-log fehlgeschlagen:", fehler);
    return jsonError("Versandprotokoll konnte nicht geladen werden.", 500);
  }
}
