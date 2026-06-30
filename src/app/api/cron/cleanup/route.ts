// ============================================================
// GET /api/cron/cleanup
// Retention-Bereinigung alter Protokolle (EmailLog/ReminderDispatch).
// Geschuetzt mit CRON_SECRET. Beispiel (Host-Cron, woechentlich):
//   0 3 * * 0 curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
//             http://localhost:3000/api/cron/cleanup
// ============================================================
import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { requireCronSecret } from "@/lib/admin-guard";
import { bereinigeAlteDaten } from "@/lib/retention";

export async function GET(request: NextRequest) {
  const verweigert = requireCronSecret(request);
  if (verweigert) return verweigert;
  try {
    const ergebnis = await bereinigeAlteDaten();
    console.log("[Cron] Retention-Cleanup:", JSON.stringify(ergebnis));
    return jsonOk(ergebnis);
  } catch (fehler) {
    console.error("GET /api/cron/cleanup fehlgeschlagen:", fehler);
    return jsonError("Cleanup fehlgeschlagen.", 500);
  }
}
