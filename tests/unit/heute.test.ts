// ============================================================
// tests/unit/heute.test.ts
// Startseite /heute (AP 2): das "Gewinne ich?"-Tagesurteil und seine
// Rangfolge (rot vor gelb vor gruen) + Grenzfaelle (keine WIGs).
// ============================================================
import { describe, expect, it } from "vitest";
import { bewerteTag } from "../../src/lib/heute";
import type { Insight, InsightSchwere } from "../../src/lib/insights";

const insight = (schwere: InsightSchwere): Insight => ({
  typ: "trend",
  schwere,
  titel: "Test-Insight",
  detail: "…",
});

describe("bewerteTag", () => {
  it("leer, wenn es keine Fokus-Ziele gibt", () => {
    const u = bewerteTag({ fokusAmpeln: [], insights: [] });
    expect(u.ton).toBe("leer");
  });

  it("leer schlaegt selbst eine Warnung, wenn keine WIGs da sind", () => {
    // Ohne WIGs ist "Gewinne ich?" nicht beantwortbar -> Anstoss statt Alarm.
    const u = bewerteTag({ fokusAmpeln: [], insights: [insight("warnung")] });
    expect(u.ton).toBe("leer");
  });

  it("gruen, wenn alle Ampeln gruen und keine Findings", () => {
    const u = bewerteTag({ fokusAmpeln: ["GRUEN", "GRUEN"], insights: [] });
    expect(u.ton).toBe("gruen");
  });

  it("rot bei einer roten Ampel", () => {
    const u = bewerteTag({ fokusAmpeln: ["GRUEN", "ROT"], insights: [] });
    expect(u.ton).toBe("rot");
  });

  it("rot bei einer Insight-Warnung, auch wenn alle Ampeln gruen sind", () => {
    const u = bewerteTag({ fokusAmpeln: ["GRUEN"], insights: [insight("warnung")] });
    expect(u.ton).toBe("rot");
  });

  it("gelb bei einer gelben Ampel", () => {
    const u = bewerteTag({ fokusAmpeln: ["GRUEN", "GELB"], insights: [] });
    expect(u.ton).toBe("gelb");
  });

  it("gelb bei einem Insight-Hinweis", () => {
    const u = bewerteTag({ fokusAmpeln: ["GRUEN"], insights: [insight("hinweis")] });
    expect(u.ton).toBe("gelb");
  });

  it("info-Insights allein kippen das Urteil nicht auf gelb", () => {
    const u = bewerteTag({ fokusAmpeln: ["GRUEN"], insights: [insight("info")] });
    expect(u.ton).toBe("gruen");
  });

  it("rot hat Vorrang vor gelb (rote Ampel + gelbe Ampel)", () => {
    const u = bewerteTag({ fokusAmpeln: ["GELB", "ROT"], insights: [insight("hinweis")] });
    expect(u.ton).toBe("rot");
  });

  it("liefert immer Titel und Text", () => {
    const u = bewerteTag({ fokusAmpeln: ["GRUEN"], insights: [] });
    expect(u.titel.length).toBeGreaterThan(0);
    expect(u.text.length).toBeGreaterThan(0);
  });
});
