// ============================================================
// src/lib/validation/mail.ts
// Server-seitige Validierung der Mail-/SMTP-Eingaben (Zod, deutsche Meldungen).
// ============================================================
import { z } from "zod";

// Beim Speichern mit isActive=true sind Pflichtfelder erforderlich;
// die feinere Pruefung passiert in der Route (haengt von isActive ab).
export const smtpConfigSchema = z.object({
  host: z.string().trim().max(255).default(""),
  port: z.number().int().min(1, "Port ungueltig").max(65535, "Port ungueltig").default(587),
  secure: z.boolean().default(false),
  username: z.string().trim().max(255).default(""),
  // Leerer/maskierter Wert = unveraendert lassen (Route entscheidet).
  password: z.string().max(500).default(""),
  fromEmail: z.string().trim().max(255).default(""),
  fromName: z.string().trim().max(255).default("CREDO Fuehrungs-Cockpit"),
  replyToEmail: z.string().trim().max(255).default(""),
  isActive: z.boolean().default(false),
});

export const smtpTestSchema = z.object({
  testEmail: z.string().trim().email("Bitte eine gueltige E-Mail-Adresse angeben"),
});

export const emailTemplateSchema = z.object({
  event: z.string().trim().min(1, "Event ist erforderlich"),
  name: z.string().trim().min(1, "Name ist erforderlich").max(120),
  subject: z.string().trim().min(1, "Betreff ist erforderlich").max(255),
  bodyHtml: z.string().min(1, "HTML-Inhalt ist erforderlich"),
  bodyText: z.string().nullable().optional(),
  recipientTo: z.string().trim().max(500).default(""),
  recipientCc: z.string().trim().max(500).default(""),
  recipientBcc: z.string().trim().max(500).default(""),
  recipientReplyTo: z.string().trim().max(255).default(""),
  isActive: z.boolean().default(true),
});

export const emailTemplateTestSchema = z.object({
  event: z.string().trim().min(1),
  testEmail: z.string().trim().email("Bitte eine gueltige E-Mail-Adresse angeben"),
});

export const reminderSwitchSchema = z.object({
  enabled: z.boolean(),
});

export type SmtpConfigInput = z.infer<typeof smtpConfigSchema>;
export type EmailTemplateInput = z.infer<typeof emailTemplateSchema>;
