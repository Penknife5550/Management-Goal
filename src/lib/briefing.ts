// ============================================================
// src/lib/briefing.ts
// Reine Render-Logik des Montags-Briefings (AP3): verdichtet das Tagesurteil
// (bewerteTag, AP2) + die wichtigsten Insights (AP1) zu Betreff/HTML/Text.
// Bewusst Prisma-/Framework-frei -> isoliert testbar. "Regeln zuerst, KI
// formuliert spaeter nur": die Insight-Saetze sind schon deutsches Klartext.
// Jeder dynamische Wert wird HTML-escaped (Injection-Schutz), da Ziel-Titel
// nutzerkontrolliert sind.
// ============================================================
import type { Ampel } from "./goals";
import { bewerteTag, type TagesTon } from "./heute";
import type { Insight, InsightSchwere } from "./insights";

export interface BriefingEingabe {
  name: string;
  fokusAmpeln: Ampel[]; // Ampeln der aktiven FOKUS-Ziele (WIGs)
  insights: Insight[]; // bereits nach Schwere sortiert (berechneInsights)
  appUrl: string;
  maxInsights?: number; // wie viele Insights die Mail zeigt (Default 4)
  // Optionaler KI-Wochenkommentar (ai-briefing.ts). null/undefined -> die Mail
  // rendert rein deterministisch (Fallback), sonst als warmer Intro-Block.
  kiKommentar?: string | null;
}

export interface BriefingMail {
  subject: string;
  html: string;
  text: string;
}

// CREDO-Statusfarben (Hex nur hier im Mail-Kontext; Mails kennen keine
// CSS-Variablen). Passend zum Ton des Tagesurteils bzw. der Insight-Schwere.
const TON_FARBE: Record<TagesTon, { akzent: string; flaeche: string }> = {
  gruen: { akzent: "#6baa24", flaeche: "#eef6e6" },
  gelb: { akzent: "#fbc900", flaeche: "#fff8e1" },
  rot: { akzent: "#e2001a", flaeche: "#fdeaec" },
  leer: { akzent: "#575756", flaeche: "#f2f2f2" },
};

const SCHWERE_FARBE: Record<InsightSchwere, string> = {
  warnung: "#e2001a",
  hinweis: "#fbc900",
  info: "#575756",
};

const SCHWERE_LABEL: Record<InsightSchwere, string> = {
  warnung: "Warnung",
  hinweis: "Hinweis",
  info: "Info",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Betreff spiegelt den Ton des Tagesurteils. Bewusst OHNE Zahl: "rot" kann von
// einer roten Ampel ODER einer Insight-Warnung kommen; eine Warn-Zaehlung waere
// bei roter Ampel ohne Warn-Insight irrefuehrend ("0 Punkte").
function betreff(ton: TagesTon): string {
  if (ton === "rot") return "Montags-Briefing: etwas braucht deine Aufmerksamkeit";
  if (ton === "gelb") return "Montags-Briefing: ein paar Dinge im Blick behalten";
  if (ton === "gruen") return "Montags-Briefing: du bist auf Kurs";
  return "Montags-Briefing: leg deine Fokus-Ziele fest";
}

/**
 * Baut das Wochen-Briefing. Gibt null zurueck, wenn es nichts zu berichten gibt
 * (keine FOKUS-Ziele) - solche Nutzer bekommen keine Mail.
 */
export function rendereBriefing(e: BriefingEingabe): BriefingMail | null {
  if (e.fokusAmpeln.length === 0) return null;

  const urteil = bewerteTag({ fokusAmpeln: e.fokusAmpeln, insights: e.insights });
  const top = e.insights.slice(0, e.maxInsights ?? 4);
  const farbe = TON_FARBE[urteil.ton];
  const name = escapeHtml(e.name);
  const heuteUrl = `${e.appUrl}/heute`;
  const kiKommentar = e.kiKommentar?.trim() ? escapeHtml(e.kiKommentar.trim()) : null;

  // Optionaler KI-Wochenkommentar (heller Block, dezent kursiv). Fehlt er, wird
  // nichts gerendert -> die Mail ist exakt das deterministische Cut-1-Briefing.
  const kommentarHtml = kiKommentar
    ? `<table cellpadding="0" cellspacing="0" width="100%" style="background-color:#f7f7f6;border-radius:6px;margin:0 0 20px;">
            <tr><td style="padding:14px 18px;color:#4b5563;font-size:14px;line-height:1.6;font-style:italic;">${kiKommentar}</td></tr>
          </table>`
    : "";

  // ---- HTML ----
  const insightZeilenHtml =
    top.length === 0
      ? `<p style="color:#6b7280;font-size:14px;margin:0;">Nichts Auffaelliges diese Woche – keine Watermelons, Fokus-Lecks oder Zombies erkannt.</p>`
      : top
          .map(
            (i) => `
          <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 12px;">
            <tr>
              <td width="10" valign="top" style="padding-top:5px;">
                <div style="width:8px;height:8px;border-radius:8px;background-color:${SCHWERE_FARBE[i.schwere]};font-size:0;line-height:0;">&nbsp;</div>
              </td>
              <td style="padding-left:10px;">
                <div style="color:#1a1a1a;font-size:14px;font-weight:bold;">${escapeHtml(i.titel)}</div>
                <div style="color:#4b5563;font-size:13px;line-height:1.5;">${escapeHtml(i.detail)}</div>
              </td>
            </tr>
          </table>`,
          )
          .join("");

  const html = `<!DOCTYPE html>
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
          <p style="color:#374151;font-size:15px;margin:0 0 20px;">Guten Morgen ${name}, hier ist dein Wochenstart.</p>
          ${kommentarHtml}
          <table cellpadding="0" cellspacing="0" width="100%" style="background-color:${farbe.flaeche};border-left:4px solid ${farbe.akzent};border-radius:6px;margin:0 0 24px;">
            <tr><td style="padding:16px 18px;">
              <div style="color:#1a1a1a;font-size:16px;font-weight:bold;margin:0 0 4px;">Gewinne ich? ${escapeHtml(urteil.titel)}</div>
              <div style="color:#374151;font-size:14px;line-height:1.6;">${escapeHtml(urteil.text)}</div>
            </td></tr>
          </table>

          <div style="color:#111827;font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 12px;">Was auffaellt</div>
          ${insightZeilenHtml}

          <table cellpadding="0" cellspacing="0" style="margin-top:28px;"><tr><td style="border-radius:8px;background-color:#575756;">
            <a href="${heuteUrl}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;">Zum Cockpit</a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:16px 32px;color:#9ca3af;font-size:12px;">
          Dieses woechentliche Briefing kommt vom CREDO Fuehrungs-Cockpit. Du kannst es in deinen Einstellungen abschalten.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // ---- Text (Fallback) ----
  const insightZeilenText =
    top.length === 0
      ? "Nichts Auffaelliges diese Woche."
      : top.map((i) => `- [${SCHWERE_LABEL[i.schwere]}] ${i.titel}: ${i.detail}`).join("\n");

  const text = [
    `Guten Morgen ${e.name}, hier ist dein Wochenstart.`,
    ...(kiKommentar ? ["", e.kiKommentar!.trim()] : []),
    "",
    `Gewinne ich? ${urteil.titel}`,
    urteil.text,
    "",
    "Was auffaellt:",
    insightZeilenText,
    "",
    `Zum Cockpit: ${heuteUrl}`,
    "",
    "Dieses woechentliche Briefing kannst du in deinen Einstellungen abschalten.",
  ].join("\n");

  return { subject: betreff(urteil.ton), html, text };
}
