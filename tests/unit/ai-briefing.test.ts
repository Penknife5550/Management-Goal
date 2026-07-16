// ============================================================
// tests/unit/ai-briefing.test.ts
// KI-Veredelung (optionaler Layer auf AP3): Prompt-Leitplanke, Text-Bereinigung,
// PII-Modell-Guard und der Fallback (keine Konfiguration -> null).
// ============================================================
import { afterEach, describe, expect, it } from "vitest";
import {
  baueBriefingPrompt,
  bereinigeKiKommentar,
  holeKiKommentar,
  istLokalesModell,
} from "../../src/lib/ai-briefing";
import type { Insight, InsightSchwere } from "../../src/lib/insights";

const insight = (
  schwere: InsightSchwere,
  titel = "Watermelon",
  detail = "Aussen gruen",
): Insight => ({
  typ: "watermelon",
  schwere,
  titel,
  detail,
});

describe("istLokalesModell", () => {
  it("akzeptiert lokale Modelle", () => {
    expect(istLokalesModell("qwen2.5:7b")).toBe(true);
  });
  it("lehnt :cloud-Modelle ab (PII)", () => {
    expect(istLokalesModell("gpt-oss:cloud")).toBe(false);
  });
  it("lehnt reale -cloud-Tag-Modelle ab (nicht nur :cloud)", () => {
    // Ollama-Cloud-Modelle tragen den Marker als Tag-Suffix.
    expect(istLokalesModell("gpt-oss:120b-cloud")).toBe(false);
    expect(istLokalesModell("deepseek-v3.1:671b-cloud")).toBe(false);
    expect(istLokalesModell("qwen3-coder:480b-cloud")).toBe(false);
  });
  it("ist case-insensitiv (CLOUD/Cloud)", () => {
    expect(istLokalesModell("modell:CLOUD")).toBe(false);
    expect(istLokalesModell("modell-Cloud")).toBe(false);
  });
  it("lehnt leeres Modell ab", () => {
    expect(istLokalesModell("")).toBe(false);
  });
});

describe("baueBriefingPrompt", () => {
  it("enthaelt die Anti-Halluzinations-Leitplanke und die Findings", () => {
    const prompt = baueBriefingPrompt({
      fokusAmpeln: ["ROT"],
      insights: [insight("warnung", "Zombie-Ziel", "Seit 90 Tagen unbewegt")],
    });
    expect(prompt).toMatch(/Erfinde KEINE/i);
    expect(prompt).toContain("Zombie-Ziel");
    expect(prompt).toContain("Seit 90 Tagen unbewegt");
    // Das Gesamturteil (aus bewerteTag) fliesst als Kontext ein.
    expect(prompt).toMatch(/Gesamturteil:/);
  });

  it("kommt auch ohne Insights klar", () => {
    const prompt = baueBriefingPrompt({ fokusAmpeln: ["GRUEN"], insights: [] });
    expect(prompt).toMatch(/keine besonderen Auffaelligkeiten/);
  });
});

describe("bereinigeKiKommentar", () => {
  it("trimmt und normalisiert gueltigen Text", () => {
    expect(bereinigeKiKommentar("  Guter   Start  in\ndie Woche. ")).toBe(
      "Guter Start in die Woche.",
    );
  });
  it("liefert null bei Nicht-String", () => {
    expect(bereinigeKiKommentar(null)).toBeNull();
    expect(bereinigeKiKommentar(42)).toBeNull();
    expect(bereinigeKiKommentar({ text: "x" })).toBeNull();
  });
  it("liefert null bei leerem Text", () => {
    expect(bereinigeKiKommentar("   \n  ")).toBeNull();
  });
  it("entfernt HTML/Markup defensiv", () => {
    const r = bereinigeKiKommentar("Hallo <script>alert(1)</script> Welt");
    expect(r).not.toMatch(/<script>/);
    expect(r).toContain("Hallo");
    expect(r).toContain("Welt");
  });
  it("kappt ueberlangen Text auf 800 Zeichen", () => {
    const r = bereinigeKiKommentar("a".repeat(2000));
    expect(r!.length).toBe(800);
  });
});

describe("holeKiKommentar (Fallback)", () => {
  const alt = process.env.N8N_BRIEFING_WEBHOOK_URL;
  afterEach(() => {
    if (alt === undefined) delete process.env.N8N_BRIEFING_WEBHOOK_URL;
    else process.env.N8N_BRIEFING_WEBHOOK_URL = alt;
  });

  it("liefert null (ohne Netzwerkaufruf), wenn kein Webhook konfiguriert ist", async () => {
    delete process.env.N8N_BRIEFING_WEBHOOK_URL;
    const r = await holeKiKommentar({ fokusAmpeln: ["GRUEN"], insights: [] });
    expect(r).toBeNull();
  });
});
