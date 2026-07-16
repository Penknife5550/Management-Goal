// ============================================================
// /api/settings/email-templates/test  (POST)
// Sendet eine Test-Mail des Events an die angegebene Adresse (Sample-Payload).
// Schutz: nur Administratoren (withAdmin) + Rate-Limit.
// ============================================================
import { jsonError, jsonOk, parseBody } from "@/lib/api";
import { rateLimit, withAdmin } from "@/lib/admin-guard";
import { getEventDefinition } from "@/lib/email-events";
import { sendEventEmail } from "@/lib/mailer";
import { emailTemplateTestSchema } from "@/lib/validation/mail";

export const POST = withAdmin("POST /api/settings/email-templates/test", async (request) => {
  if (!rateLimit("template-test")) {
    return jsonError("Zu viele Testversuche. Bitte in einigen Minuten erneut versuchen.", 429);
  }
  const p = await parseBody(request, emailTemplateTestSchema);
  if (!p.ok) return p.response;

  const def = getEventDefinition(p.data.event);
  if (!def) return jsonError("Unbekanntes Event.", 400);

  const ergebnis = await sendEventEmail(p.data.event, def.samplePayload, {
    isTest: true,
    overrideTo: p.data.testEmail,
  });
  if (ergebnis.status !== "SENT")
    return jsonError(ergebnis.detail ?? "Testversand fehlgeschlagen.", 400);
  return jsonOk({ status: ergebnis.status });
});
