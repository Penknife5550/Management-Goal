// ============================================================
// /api/settings/reminders
// GET - globalen Reminder-Kill-Switch lesen
// PUT - Kill-Switch setzen { enabled: boolean }
// Schutz: ADMIN_TOKEN.
// ============================================================
import { jsonOk, parseBody } from "@/lib/api";
import { withAdmin } from "@/lib/admin-guard";
import { istReminderGlobalAktiv, setReminderGlobalAktiv } from "@/lib/reminders";
import { reminderSwitchSchema } from "@/lib/validation/mail";

export const GET = withAdmin("GET /api/settings/reminders", async () => {
  return jsonOk({ enabled: await istReminderGlobalAktiv() });
});

export const PUT = withAdmin("PUT /api/settings/reminders", async (request) => {
  const p = await parseBody(request, reminderSwitchSchema);
  if (!p.ok) return p.response;
  await setReminderGlobalAktiv(p.data.enabled);
  return jsonOk({ enabled: p.data.enabled });
});
