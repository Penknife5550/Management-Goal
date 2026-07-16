// ============================================================
// /api/settings/smtp/test  (POST)
// Sendet eine Test-Mail mit der aktuellen SMTP-Konfiguration.
// Schutz: nur Administratoren (withAdmin) + Rate-Limit (kein offenes Relay).
// ============================================================
import { jsonError, jsonOk, parseBody } from "@/lib/api";
import { rateLimit, withAdmin } from "@/lib/admin-guard";
import { testSmtpConnection } from "@/lib/mailer";
import { smtpTestSchema } from "@/lib/validation/mail";

export const POST = withAdmin("POST /api/settings/smtp/test", async (request) => {
  if (!rateLimit("smtp-test")) {
    return jsonError("Zu viele Testversuche. Bitte in einigen Minuten erneut versuchen.", 429);
  }
  const p = await parseBody(request, smtpTestSchema);
  if (!p.ok) return p.response;

  const ergebnis = await testSmtpConnection(p.data.testEmail);
  if (!ergebnis.success) return jsonError(ergebnis.error ?? "SMTP-Test fehlgeschlagen.", 400);
  return jsonOk({ success: true, durationMs: ergebnis.durationMs });
});
