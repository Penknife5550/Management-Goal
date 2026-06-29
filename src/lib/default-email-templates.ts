// ============================================================
// src/lib/default-email-templates.ts
// Code-Defaults der E-Mail-Vorlagen. Greifen, solange im Portal noch keine
// DB-Vorlage gespeichert wurde, und dienen dem Admin als Ausgangsbasis.
// CREDO-CI: Dunkelgrau #575756, KEINE Farbverlaeufe, Arial (Mail-Fallback).
// Variablen {{schluessel}} werden beim Versand ersetzt und HTML-escaped.
// ============================================================
import { EVENT_CATALOG } from "@/lib/email-events";

export interface EmailTemplateDefinition {
  event: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  variables: { key: string; description: string }[];
}

// CREDO-Mail-Layout: grauer Kopf, weisse Karte, CREDO-Linie, ein Button.
function credoLayout(opts: { heading: string; intro: string; cta: string }): string {
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f4f4f3;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f3;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="background-color:#575756;border-radius:8px 8px 0 0;padding:24px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:bold;">CREDO Fuehrungs-Cockpit</h1>
        </td></tr>
        <tr><td style="height:4px;background-color:#fbc900;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="background-color:#ffffff;padding:32px;">
          <h2 style="color:#1a1a1a;font-size:18px;margin:0 0 16px;">${opts.heading}</h2>
          <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">${opts.intro}</p>
          <table cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background-color:#575756;">
            <a href="{{link}}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;">${opts.cta}</a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:16px 32px;color:#9ca3af;font-size:12px;">
          Diese Nachricht kommt vom CREDO Fuehrungs-Cockpit. Du kannst Erinnerungen in deinen Einstellungen abschalten.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplateDefinition[] = [
  {
    event: "weekly-checkin-reminder",
    name: "Wochen-Check-in-Erinnerung",
    subject: "Wochen-Check-in: {{anzahl}} WIG(s) warten auf dich",
    bodyHtml: credoLayout({
      heading: "Hallo {{name}}, Zeit fuer deinen Wochen-Check-in",
      intro:
        "Du hast {{anzahl}} wirklich wichtige(s) Ziel(e) (WIG), die seit ueber einer Woche keinen Check-in hatten:<br /><br />" +
        "<strong>{{wigListe}}</strong><br /><br />" +
        "Nimm dir kurz Zeit: Ampel setzen, Fortschritt pruefen, naechsten Schritt festlegen.",
      cta: "Wochen-Check-in starten",
    }),
    bodyText:
      "Hallo {{name}},\n\nZeit fuer deinen Wochen-Check-in. {{anzahl}} WIG(s) ohne Check-in seit ueber einer Woche:\n{{wigListe}}\n\nWochen-Check-in starten: {{link}}\n\nErinnerungen kannst du in deinen Einstellungen abschalten.",
    variables: EVENT_CATALOG.find((e) => e.event === "weekly-checkin-reminder")!.variables,
  },
];

export function getDefaultTemplate(event: string): EmailTemplateDefinition | undefined {
  return DEFAULT_EMAIL_TEMPLATES.find((t) => t.event === event);
}
