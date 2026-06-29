// ============================================================
// /api/cron/reminders  (GET)
// Versendet die Wochen-Check-in-Erinnerungen. Extern getriggert per Host-Cron
// (Europe/Berlin), geschuetzt mit CRON_SECRET (Authorization: Bearer ...).
//
// Beispiel-Crontab (Host, Europe/Berlin), Montags 08:00:
//   0 8 * * 1 curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
//             http://localhost:3000/api/cron/reminders
// ============================================================
import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { requireCronSecret } from "@/lib/admin-guard";
import { dispatchWeeklyReminders } from "@/lib/reminders";

export async function GET(request: NextRequest) {
  const verweigert = requireCronSecret(request);
  if (verweigert) return verweigert;
  try {
    const ergebnis = await dispatchWeeklyReminders();
    console.log("[Cron] Wochen-Reminder:", JSON.stringify(ergebnis));
    return jsonOk(ergebnis);
  } catch (fehler) {
    console.error("GET /api/cron/reminders fehlgeschlagen:", fehler);
    return jsonError("Reminder-Versand fehlgeschlagen.", 500);
  }
}
