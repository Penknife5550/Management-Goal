// ============================================================
// /api/settings/reminders
// GET - globalen Reminder-Kill-Switch lesen
// PUT - Kill-Switch setzen { enabled: boolean }
// Schutz: ADMIN_TOKEN.
// ============================================================
import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { requireAdminToken } from "@/lib/admin-guard";
import { istReminderGlobalAktiv, setReminderGlobalAktiv } from "@/lib/reminders";
import { reminderSwitchSchema } from "@/lib/validation/mail";

export async function GET(request: NextRequest) {
  const verweigert = requireAdminToken(request);
  if (verweigert) return verweigert;
  try {
    return jsonOk({ enabled: await istReminderGlobalAktiv() });
  } catch (fehler) {
    console.error("GET /api/settings/reminders fehlgeschlagen:", fehler);
    return jsonError("Reminder-Status konnte nicht geladen werden.", 500);
  }
}

export async function PUT(request: NextRequest) {
  const verweigert = requireAdminToken(request);
  if (verweigert) return verweigert;
  try {
    const body = await request.json().catch(() => null);
    const parsed = reminderSwitchSchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungueltige Eingabe.", 400);
    await setReminderGlobalAktiv(parsed.data.enabled);
    return jsonOk({ enabled: parsed.data.enabled });
  } catch (fehler) {
    console.error("PUT /api/settings/reminders fehlgeschlagen:", fehler);
    return jsonError("Reminder-Status konnte nicht gespeichert werden.", 500);
  }
}
