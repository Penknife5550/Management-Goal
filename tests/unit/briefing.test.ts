// ============================================================
// tests/unit/briefing.test.ts
// Montags-Briefing (AP3): reine Render-Logik - Urteil-Ton, Top-N-Begrenzung,
// HTML-Escaping nutzerkontrollierter Werte, Null bei fehlendem Fokus.
// ============================================================
import { describe, expect, it } from "vitest";
import { rendereBriefing } from "../../src/lib/briefing";
import type { Insight, InsightSchwere } from "../../src/lib/insights";

const insight = (schwere: InsightSchwere, titel = "Test", detail = "Detail"): Insight => ({
  typ: "trend",
  schwere,
  titel,
  detail,
});

const basis = {
  name: "Dimitri",
  appUrl: "https://cockpit.example",
};

describe("rendereBriefing", () => {
  it("liefert null, wenn es keine Fokus-Ziele gibt", () => {
    expect(rendereBriefing({ ...basis, fokusAmpeln: [], insights: [] })).toBeNull();
  });

  it("gruener Ton: Betreff signalisiert 'auf Kurs'", () => {
    const mail = rendereBriefing({ ...basis, fokusAmpeln: ["GRUEN"], insights: [] });
    expect(mail).not.toBeNull();
    expect(mail!.subject).toMatch(/auf Kurs/i);
    expect(mail!.html).toContain("Auf Kurs");
    expect(mail!.text).toContain("Auf Kurs");
  });

  it("roter Ton bei Warnung: Betreff mahnt zur Aufmerksamkeit (ohne Zahl)", () => {
    const mail = rendereBriefing({
      ...basis,
      fokusAmpeln: ["GRUEN"],
      insights: [insight("warnung"), insight("warnung")],
    });
    expect(mail!.subject).toMatch(/Aufmerksamkeit/);
  });

  it("roter Ton durch rote Ampel OHNE Warn-Insight: Betreff nennt keine '0'", () => {
    // Regression: fruehere Zaehl-Logik ergab "0 Punkte brauchen deine Aufmerksamkeit".
    const mail = rendereBriefing({ ...basis, fokusAmpeln: ["ROT"], insights: [] });
    expect(mail!.subject).toMatch(/Aufmerksamkeit/);
    expect(mail!.subject).not.toMatch(/0/);
  });

  it("begrenzt die angezeigten Insights auf maxInsights", () => {
    const viele = Array.from({ length: 6 }, (_, i) => insight("info", `Insight-${i}`));
    const mail = rendereBriefing({
      ...basis,
      fokusAmpeln: ["GELB"],
      insights: viele,
      maxInsights: 2,
    });
    expect(mail!.html).toContain("Insight-0");
    expect(mail!.html).toContain("Insight-1");
    expect(mail!.html).not.toContain("Insight-2");
  });

  it("escaped nutzerkontrollierte Werte im HTML (kein Script-Durchschlag)", () => {
    const boese = insight("warnung", "<script>alert(1)</script>", 'Ziel "A" & <b>B</b>');
    const mail = rendereBriefing({
      ...basis,
      name: "<img src=x onerror=1>",
      fokusAmpeln: ["ROT"],
      insights: [boese],
    });
    expect(mail!.html).not.toContain("<script>");
    expect(mail!.html).not.toContain("<img src=x");
    expect(mail!.html).toContain("&lt;script&gt;");
    expect(mail!.html).toContain("&amp;");
  });

  it("enthaelt den CTA-Link auf /heute", () => {
    const mail = rendereBriefing({ ...basis, fokusAmpeln: ["GRUEN"], insights: [] });
    expect(mail!.html).toContain("https://cockpit.example/heute");
    expect(mail!.text).toContain("https://cockpit.example/heute");
  });

  it("zeigt einen freundlichen Hinweis, wenn keine Insights vorliegen", () => {
    const mail = rendereBriefing({ ...basis, fokusAmpeln: ["GRUEN"], insights: [] });
    expect(mail!.html).toMatch(/Nichts Auffaelliges/);
  });

  it("rendert den KI-Kommentar (HTML + Text), wenn vorhanden", () => {
    const mail = rendereBriefing({
      ...basis,
      fokusAmpeln: ["GRUEN"],
      insights: [],
      kiKommentar: "Starke Woche, bleib dran!",
    });
    expect(mail!.html).toContain("Starke Woche, bleib dran!");
    expect(mail!.text).toContain("Starke Woche, bleib dran!");
  });

  it("escaped auch den KI-Kommentar (kein Markup-Durchschlag)", () => {
    const mail = rendereBriefing({
      ...basis,
      fokusAmpeln: ["GRUEN"],
      insights: [],
      kiKommentar: "<b>fett</b>",
    });
    expect(mail!.html).not.toContain("<b>fett</b>");
    expect(mail!.html).toContain("&lt;b&gt;");
  });

  it("ohne KI-Kommentar (null): rein deterministisch, kein Kommentar-Block", () => {
    const mail = rendereBriefing({
      ...basis,
      fokusAmpeln: ["GRUEN"],
      insights: [],
      kiKommentar: null,
    });
    expect(mail!.html).not.toContain("font-style:italic");
  });
});
