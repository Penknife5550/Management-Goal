// ============================================================
// /api/cron/montags-briefing  (GET)
// Versendet das woechentliche Montags-Briefing (AP3). Extern getriggert per
// Host-Cron (Europe/Berlin), geschuetzt mit CRON_SECRET (Authorization: Bearer).
//
// Beispiel-Crontab (Host, Europe/Berlin), Montags 07:00 (vor dem Reminder um 08:00):
//   0 7 * * 1 curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
//             http://localhost:3000/api/cron/montags-briefing
// ============================================================
import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { requireCronSecret } from "@/lib/admin-guard";
import { dispatchMontagsBriefing } from "@/lib/briefing-service";

export async function GET(request: NextRequest) {
  const verweigert = requireCronSecret(request);
  if (verweigert) return verweigert;
  try {
    const ergebnis = await dispatchMontagsBriefing();
    console.log("[Cron] Montags-Briefing:", JSON.stringify(ergebnis));
    return jsonOk(ergebnis);
  } catch (fehler) {
    console.error("GET /api/cron/montags-briefing fehlgeschlagen:", fehler);
    return jsonError("Briefing-Versand fehlgeschlagen.", 500);
  }
}
