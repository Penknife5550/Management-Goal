// ============================================================
// /api/settings/smtp/test  (POST)
// Sendet eine Test-Mail mit der aktuellen SMTP-Konfiguration.
// Schutz: ADMIN_TOKEN + Rate-Limit (kein offenes Relay).
// ============================================================
import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { rateLimit, requireAdminToken } from "@/lib/admin-guard";
import { testSmtpConnection } from "@/lib/mailer";
import { smtpTestSchema } from "@/lib/validation/mail";

export async function POST(request: NextRequest) {
  const verweigert = requireAdminToken(request);
  if (verweigert) return verweigert;

  if (!rateLimit("smtp-test")) {
    return jsonError("Zu viele Testversuche. Bitte in einigen Minuten erneut versuchen.", 429);
  }

  try {
    const body = await request.json().catch(() => null);
    const parsed = smtpTestSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Ungueltige Eingabe.", 400);

    const ergebnis = await testSmtpConnection(parsed.data.testEmail);
    if (!ergebnis.success) {
      return jsonError(ergebnis.error ?? "SMTP-Test fehlgeschlagen.", 400);
    }
    return jsonOk({ success: true, durationMs: ergebnis.durationMs });
  } catch (fehler) {
    console.error("POST /api/settings/smtp/test fehlgeschlagen:", fehler);
    return jsonError("SMTP-Test fehlgeschlagen.", 500);
  }
}
