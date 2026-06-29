// ============================================================
// src/lib/mailer.ts
// Eigener SMTP-Versand (statt n8n). Pattern aus dem CREDO HR-Portal,
// auf das Cockpit reduziert: DB-Config, editierbare Vorlagen, Versandprotokoll.
//
// - Konfiguration aus der DB (SmtpConfig, Passwort verschluesselt).
// - Vorlage je Event aus der DB (EmailTemplate) vor Code-Default.
// - Variablenwerte werden im HTML-Body HTML-escaped (Injection-Schutz),
//   in Betreff/Text unverandert eingesetzt.
// - Dev: MAIL_DRY_RUN="1" -> jsonTransport, es geht KEINE echte Mail raus.
// - Jeder Versuch wird im EmailLog protokolliert (SENT/FAILED/SKIPPED).
// ============================================================
import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import { decrypt, isEncryptionConfigured } from "@/lib/encryption";
import { getDefaultTemplate } from "@/lib/default-email-templates";
import { getEventDefinition } from "@/lib/email-events";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// =============================================
// Hilfen
// =============================================
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Ersetzt {{key}} durch die Werte. escapeHtml=true escaped jeden Wert
// (fuer HTML-Bodies); der Vorlagen-Markup selbst bleibt unberuehrt.
export function renderTemplate(
  template: string,
  variables: Record<string, string>,
  opts?: { escapeHtml?: boolean },
): string {
  const transform = opts?.escapeHtml ? escapeHtml : (v: string) => v;
  return Object.entries(variables).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, transform(value ?? "")),
    template,
  );
}

// Empfaengerfeld rendern (Festadressen + {{variablen}}), validieren, deduplizieren.
function renderRecipientField(field: string, vars: Record<string, string>): string {
  const addresses = renderTemplate(field, vars)
    .split(",")
    .map((a) => a.trim())
    .filter((a) => EMAIL_PATTERN.test(a));
  return [...new Set(addresses.map((a) => a.toLowerCase()))].join(", ");
}

// =============================================
// SMTP-Transporter aus der DB-Config (oder Dry-Run im Dev)
// =============================================
async function createTransporter(): Promise<{
  transporter: nodemailer.Transporter;
  from: string;
} | null> {
  const config = await prisma.smtpConfig.findUnique({ where: { id: "default" } });
  if (!config || !config.isActive || !config.host || !config.username) {
    return null;
  }

  const from = `"${config.fromName}" <${config.fromEmail}>`;

  // Dev-Schutz: kein echter Versand, Inhalt landet als JSON im Server-Log.
  if (process.env.MAIL_DRY_RUN === "1") {
    return { transporter: nodemailer.createTransport({ jsonTransport: true }), from };
  }

  return {
    transporter: nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.username,
        pass: isEncryptionConfigured() ? decrypt(config.password) : config.password,
      },
      tls: { rejectUnauthorized: process.env.NODE_ENV === "production" },
      // Harte Timeouts: ein haengender SMTP-Server darf Request-Pfade nicht blockieren.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    }),
    from,
  };
}

// =============================================
// Low-Level-Versand
// =============================================
interface MailOptions {
  to: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
}

export type SendEmailResult =
  | { ok: true; messageId?: string }
  | { ok: false; error: string };

export async function sendEmailDetailed(options: MailOptions): Promise<SendEmailResult> {
  const t = await createTransporter();
  if (!t) {
    return {
      ok: false,
      error:
        "SMTP ist nicht konfiguriert oder nicht aktiviert. Bitte unter Einstellungen → SMTP " +
        "Host/Benutzer/Absender eintragen, aktivieren und Verbindung testen.",
    };
  }
  try {
    const info = await t.transporter.sendMail({ from: t.from, ...options });
    if (process.env.MAIL_DRY_RUN === "1") {
      console.log("[Mailer][DRY-RUN] Mail nicht versendet:", JSON.stringify(info.message));
    }
    return { ok: true, messageId: info.messageId };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Mailer] Versand fehlgeschlagen:", msg);
    return { ok: false, error: msg };
  }
}

// =============================================
// SMTP-Verbindungstest (Einstellungs-Portal)
// =============================================
export async function testSmtpConnection(
  testEmail: string,
): Promise<{ success: boolean; error?: string; durationMs: number; startedAt: number }> {
  const start = Date.now();
  const fail = (error: string) => ({ success: false, error, durationMs: Date.now() - start, startedAt: start });
  try {
    const t = await createTransporter();
    if (!t) return fail("SMTP ist nicht konfiguriert oder deaktiviert.");
    await t.transporter.verify();
    const info = await t.transporter.sendMail({
      from: t.from,
      to: testEmail,
      subject: "CREDO Fuehrungs-Cockpit – SMTP-Verbindungstest",
      html: '<div style="font-family:Arial,sans-serif;padding:24px;"><h2 style="color:#575756;">SMTP-Verbindungstest erfolgreich</h2><p>Die SMTP-Konfiguration funktioniert korrekt.</p></div>',
      text: "CREDO Fuehrungs-Cockpit SMTP-Test: Die Verbindung funktioniert korrekt.",
    });
    if (process.env.MAIL_DRY_RUN === "1") {
      console.log("[Mailer][DRY-RUN] Test-Mail nicht versendet:", JSON.stringify(info.message));
    }
    return { success: true, durationMs: Date.now() - start, startedAt: start };
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unbekannter Fehler");
  }
}

// =============================================
// Vorlage aufloesen: DB-Eintrag vor Code-Default
// =============================================
export interface ResolvedTemplate {
  subject: string;
  bodyHtml: string;
  bodyText: string | null;
  recipientTo: string;
  recipientCc: string;
  recipientBcc: string;
  recipientReplyTo: string;
  isActive: boolean;
  source: "db" | "default";
}

export async function resolveEventTemplate(event: string): Promise<ResolvedTemplate | null> {
  const dbTemplate = await prisma.emailTemplate.findUnique({ where: { event } });
  if (dbTemplate) {
    return {
      subject: dbTemplate.subject,
      bodyHtml: dbTemplate.bodyHtml,
      bodyText: dbTemplate.bodyText,
      recipientTo: dbTemplate.recipientTo,
      recipientCc: dbTemplate.recipientCc,
      recipientBcc: dbTemplate.recipientBcc,
      recipientReplyTo: dbTemplate.recipientReplyTo,
      isActive: dbTemplate.isActive,
      source: "db",
    };
  }
  const def = getDefaultTemplate(event);
  if (!def) return null;
  return {
    subject: def.subject,
    bodyHtml: def.bodyHtml,
    bodyText: def.bodyText,
    recipientTo: "",
    recipientCc: "",
    recipientBcc: "",
    recipientReplyTo: "",
    isActive: true,
    source: "default",
  };
}

// =============================================
// Event-Mail rendern (Empfaenger + Inhalt)
// =============================================
interface RenderedEmail {
  to: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
}

export function renderEventEmail(
  template: ResolvedTemplate,
  event: string,
  payload: Record<string, unknown>,
  options?: { overrideTo?: string; globalReplyTo?: string },
): { rendered: RenderedEmail | null; skipReason?: string } {
  // Variablen = alle skalaren Payload-Felder (Cockpit-Payloads sind flach).
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v == null) continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      vars[k] = String(v);
    }
  }

  const body = {
    subject: renderTemplate(template.subject, vars),
    html: renderTemplate(template.bodyHtml, vars, { escapeHtml: true }),
    text: template.bodyText ? renderTemplate(template.bodyText, vars) : undefined,
  };

  const replyToField = template.recipientReplyTo.trim() || (options?.globalReplyTo ?? "");
  const replyTo = renderRecipientField(replyToField, vars) || undefined;

  if (options?.overrideTo) {
    return { rendered: { to: options.overrideTo, replyTo, ...body } };
  }

  const def = getEventDefinition(event);
  const toField = template.recipientTo.trim() || def?.defaultRecipientTo || "";
  const to = renderRecipientField(toField, vars);
  if (!to) {
    return {
      rendered: null,
      skipReason: template.recipientTo.trim()
        ? `Empfaenger "${template.recipientTo}" ergab keine gueltige Adresse`
        : "Kein Empfaenger konfiguriert — bitte in der Vorlage ein An-Feld setzen",
    };
  }

  const cc = renderRecipientField(template.recipientCc.trim(), vars) || undefined;
  const bcc = renderRecipientField(template.recipientBcc.trim(), vars) || undefined;
  return { rendered: { to, cc, bcc, replyTo, ...body } };
}

// =============================================
// Versandprotokoll — wirft niemals
// =============================================
export type EmailLogStatus = "SENT" | "FAILED" | "SKIPPED";

async function writeEmailLog(entry: {
  event: string;
  status: EmailLogStatus;
  recipient?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  detail?: string;
  messageId?: string;
  isTest?: boolean;
}): Promise<void> {
  try {
    await prisma.emailLog.create({
      data: {
        event: entry.event,
        status: entry.status,
        recipient: entry.recipient ?? "",
        cc: entry.cc,
        bcc: entry.bcc,
        subject: entry.subject ?? "",
        detail: entry.detail,
        messageId: entry.messageId,
        isTest: entry.isTest ?? false,
      },
    });
  } catch (err) {
    console.error("[Mailer] Versandprotokoll konnte nicht geschrieben werden:", err);
  }
}

// =============================================
// Primaerer Event-Versand — orchestriert + protokolliert. Wirft niemals.
// =============================================
export interface EventEmailResult {
  status: EmailLogStatus;
  detail?: string;
}

export async function sendEventEmail(
  event: string,
  payload: Record<string, unknown>,
  options?: { isTest?: boolean; overrideTo?: string },
): Promise<EventEmailResult> {
  const isTest = options?.isTest ?? false;
  try {
    const template = await resolveEventTemplate(event);
    if (!template) {
      const detail = "Keine E-Mail-Vorlage vorhanden";
      await writeEmailLog({ event, status: "SKIPPED", detail, isTest });
      return { status: "SKIPPED", detail };
    }
    if (!template.isActive && !isTest) {
      const detail = "E-Mail-Vorlage ist deaktiviert";
      await writeEmailLog({ event, status: "SKIPPED", detail, isTest });
      return { status: "SKIPPED", detail };
    }

    const smtpConfig = await prisma.smtpConfig.findUnique({ where: { id: "default" } });
    const { rendered, skipReason } = renderEventEmail(template, event, payload, {
      overrideTo: options?.overrideTo,
      globalReplyTo: smtpConfig?.replyToEmail ?? "",
    });
    if (!rendered) {
      await writeEmailLog({ event, status: "SKIPPED", detail: skipReason, isTest });
      return { status: "SKIPPED", detail: skipReason };
    }
    if (isTest) rendered.subject = `[TEST] ${rendered.subject}`;

    const result = await sendEmailDetailed(rendered);
    if (result.ok) {
      await writeEmailLog({
        event,
        status: "SENT",
        recipient: rendered.to,
        cc: rendered.cc,
        bcc: rendered.bcc,
        subject: rendered.subject,
        messageId: result.messageId,
        isTest,
      });
      return { status: "SENT" };
    }
    await writeEmailLog({
      event,
      status: "FAILED",
      recipient: rendered.to,
      cc: rendered.cc,
      bcc: rendered.bcc,
      subject: rendered.subject,
      detail: result.error,
      isTest,
    });
    return { status: "FAILED", detail: result.error };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`[Mailer] Unerwarteter Fehler beim Versand fuer "${event}":`, detail);
    await writeEmailLog({ event, status: "FAILED", detail, isTest });
    return { status: "FAILED", detail };
  }
}
