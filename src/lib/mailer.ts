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

// Optionale Empfaenger-Allowlist (Relay-Schutz): nur Mails an erlaubte Domains.
// MAIL_ALLOWED_DOMAINS leer/ungesetzt = keine Einschraenkung (Dev/Default).
function erlaubteDomains(): string[] {
  return (process.env.MAIL_ALLOWED_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

export function istErlaubteAdresse(email: string): boolean {
  const domains = erlaubteDomains();
  if (domains.length === 0) return true;
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  return domains.includes(email.slice(at + 1).toLowerCase());
}

// nodemailer-Fehler auf eine knappe deutsche Kategorie mappen — verhindert, dass
// Host/Port/Auth-Hinweise im Klartext an Client und EmailLog gelangen. Der rohe
// Fehler wird ausschliesslich serverseitig geloggt.
export function mapSmtpError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? "";
  const msg = error instanceof Error ? error.message : String(error);
  if (code === "EAUTH" || /\b535\b|5\.7\.\d/.test(msg)) {
    return "SMTP-Anmeldung fehlgeschlagen (Benutzer/Passwort pruefen).";
  }
  if (["ECONNECTION", "ECONNREFUSED", "ENOTFOUND", "EDNS", "EHOSTUNREACH"].includes(code)) {
    return "Verbindung zum SMTP-Server fehlgeschlagen (Host/Port pruefen).";
  }
  if (["ETIMEDOUT", "ESOCKET"].includes(code) || /timeout/i.test(msg)) {
    return "Zeitueberschreitung beim SMTP-Server.";
  }
  return "SMTP-Versand fehlgeschlagen.";
}

// Empfaengerfeld rendern (Festadressen + {{variablen}}), validieren, deduplizieren.
// Adressen ausserhalb der Allowlist werden verworfen.
function renderRecipientField(field: string, vars: Record<string, string>): string {
  const addresses = renderTemplate(field, vars)
    .split(",")
    .map((a) => a.trim())
    .filter((a) => EMAIL_PATTERN.test(a) && istErlaubteAdresse(a));
  return [...new Set(addresses.map((a) => a.toLowerCase()))].join(", ");
}

// =============================================
// SMTP-Transporter aus der DB-Config (oder Dry-Run im Dev)
// =============================================
// Wiederverwendbarer Transporter je Konfiguration: pool=true haelt SMTP-Verbindungen
// offen, sodass beim Batch-Versand (Wochen-Reminder) nicht pro Mail ein neuer
// TLS-Handshake noetig ist. Cache ueber Versand-/Request-Grenzen hinweg; aendert
// sich die Konfiguration, wechselt der Signatur-Key und der alte Pool wird geschlossen.
let transporterCache: { signatur: string; transporter: nodemailer.Transporter } | null = null;

async function createTransporter(): Promise<{
  transporter: nodemailer.Transporter;
  from: string;
} | null> {
  const config = await prisma.smtpConfig.findUnique({ where: { id: "default" } });
  if (!config || !config.isActive || !config.host || !config.username) {
    return null;
  }

  const from = `"${config.fromName}" <${config.fromEmail}>`;

  // Dev-Schutz: kein echter Versand, Inhalt landet als JSON im Server-Log (kein Pool noetig).
  if (process.env.MAIL_DRY_RUN === "1") {
    return { transporter: nodemailer.createTransport({ jsonTransport: true }), from };
  }

  const signatur = [config.host, config.port, config.secure, config.username, config.password].join("|");
  if (transporterCache?.signatur !== signatur) {
    transporterCache?.transporter.close();
    transporterCache = {
      signatur,
      transporter: nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.username,
          pass: isEncryptionConfigured() ? decrypt(config.password) : config.password,
        },
        tls: { rejectUnauthorized: process.env.NODE_ENV === "production" },
        pool: true,
        maxConnections: 3,
        // Harte Timeouts: ein haengender SMTP-Server darf Request-Pfade nicht blockieren.
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
      }),
    };
  }
  return { transporter: transporterCache.transporter, from };
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
    // Roh nur ins Server-Log; nach aussen nur die kategorisierte Meldung.
    console.error("[Mailer] Versand fehlgeschlagen:", error instanceof Error ? error.message : String(error));
    return { ok: false, error: mapSmtpError(error) };
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
    console.error("[Mailer] SMTP-Test fehlgeschlagen:", error instanceof Error ? error.message : String(error));
    return fail(mapSmtpError(error));
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
    // Betreff CRLF-bereinigen: verhindert Header-Injection ueber Variablenwerte.
    subject: renderTemplate(template.subject, vars).replace(/[\r\n]+/g, " "),
    html: renderTemplate(template.bodyHtml, vars, { escapeHtml: true }),
    text: template.bodyText ? renderTemplate(template.bodyText, vars) : undefined,
  };

  const replyToField = template.recipientReplyTo.trim() || (options?.globalReplyTo ?? "");
  const replyTo = renderRecipientField(replyToField, vars) || undefined;

  if (options?.overrideTo) {
    // Test-Versand: auch die frei eingegebene Zieladresse muss Pattern + Allowlist erfuellen.
    if (!EMAIL_PATTERN.test(options.overrideTo) || !istErlaubteAdresse(options.overrideTo)) {
      return { rendered: null, skipReason: `Empfaenger "${options.overrideTo}" ist nicht zugelassen` };
    }
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
