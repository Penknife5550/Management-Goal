// ============================================================
// /api/settings/email-templates/test  (POST)
// Sendet eine Test-Mail des Events an die angegebene Adresse (Sample-Payload).
// Schutz: ADMIN_TOKEN + Rate-Limit.
// ============================================================
import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { rateLimit, requireAdminToken } from "@/lib/admin-guard";
import { getEventDefinition } from "@/lib/email-events";
import { sendEventEmail } from "@/lib/mailer";
import { emailTemplateTestSchema } from "@/lib/validation/mail";

export async function POST(request: NextRequest) {
  const verweigert = requireAdminToken(request);
  if (verweigert) return verweigert;

  if (!rateLimit("template-test")) {
    return jsonError("Zu viele Testversuche. Bitte in einigen Minuten erneut versuchen.", 429);
  }

  try {
    const body = await request.json().catch(() => null);
    const parsed = emailTemplateTestSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Ungueltige Eingabe.", 400);

    const def = getEventDefinition(parsed.data.event);
    if (!def) return jsonError("Unbekanntes Event.", 400);

    const ergebnis = await sendEventEmail(parsed.data.event, def.samplePayload, {
      isTest: true,
      overrideTo: parsed.data.testEmail,
    });
    if (ergebnis.status !== "SENT") {
      return jsonError(ergebnis.detail ?? "Testversand fehlgeschlagen.", 400);
    }
    return jsonOk({ status: ergebnis.status });
  } catch (fehler) {
    console.error("POST /api/settings/email-templates/test fehlgeschlagen:", fehler);
    return jsonError("Testversand fehlgeschlagen.", 500);
  }
}
