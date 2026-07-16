// ============================================================
// tests/unit/ai-eisenhower.test.ts
// Reine KI-Lib: Prompt-Bau, deterministischer jobKey, robuste Antwort-Validierung.
// ============================================================
import { describe, expect, it } from "vitest";
import { baueKlassifizierungsPrompt, jobKey, parseKiAntwort } from "../../src/lib/ai-eisenhower";

describe("baueKlassifizierungsPrompt", () => {
  it("enthaelt den Titel und fordert JSON", () => {
    const p = baueKlassifizierungsPrompt("Angebot fuer Kunde X");
    expect(p).toContain("Angebot fuer Kunde X");
    expect(p).toContain("JSON");
    expect(p).toContain("important");
    expect(p).toContain("urgent");
  });
});

describe("jobKey", () => {
  it("ist deterministisch fuer gleiche Eingabe", () => {
    expect(jobKey("t1", "Titel")).toBe(jobKey("t1", "Titel"));
  });

  it("unterscheidet sich bei anderem Titel oder anderer id", () => {
    expect(jobKey("t1", "Titel")).not.toBe(jobKey("t1", "Anders"));
    expect(jobKey("t1", "Titel")).not.toBe(jobKey("t2", "Titel"));
  });
});

describe("parseKiAntwort", () => {
  it("akzeptiert eine gueltige Antwort und leitet den Quadranten ab", () => {
    const r = parseKiAntwort({
      important: true,
      urgent: false,
      confidence: 0.78,
      reasoning: "Strategisch.",
    });
    expect(r).toMatchObject({ important: true, urgent: false, quadrant: 2, confidence: 0.78 });
    expect(r.reasoning).toBe("Strategisch.");
  });

  it("leitet alle vier Quadranten korrekt ab", () => {
    expect(
      parseKiAntwort({ important: true, urgent: true, confidence: 1, reasoning: "x" }).quadrant,
    ).toBe(1);
    expect(
      parseKiAntwort({ important: false, urgent: true, confidence: 0, reasoning: "x" }).quadrant,
    ).toBe(3);
    expect(
      parseKiAntwort({ important: false, urgent: false, confidence: 0.5, reasoning: "x" }).quadrant,
    ).toBe(4);
  });

  it("kappt ueberlanges reasoning und trimmt", () => {
    const lang = "  " + "a".repeat(600) + "  ";
    expect(
      parseKiAntwort({ important: true, urgent: true, confidence: 0.5, reasoning: lang }).reasoning
        .length,
    ).toBe(500);
  });

  it("wirft bei fehlenden/falschen Flags", () => {
    expect(() => parseKiAntwort({ urgent: false, confidence: 0.5, reasoning: "x" })).toThrow();
    expect(() =>
      parseKiAntwort({ important: "ja", urgent: false, confidence: 0.5, reasoning: "x" }),
    ).toThrow();
  });

  it("wirft bei confidence ausserhalb 0..1", () => {
    expect(() =>
      parseKiAntwort({ important: true, urgent: true, confidence: 2, reasoning: "x" }),
    ).toThrow();
    expect(() =>
      parseKiAntwort({ important: true, urgent: true, confidence: -0.1, reasoning: "x" }),
    ).toThrow();
  });

  it("wirft bei leerem reasoning und bei Nicht-Objekt", () => {
    expect(() =>
      parseKiAntwort({ important: true, urgent: true, confidence: 0.5, reasoning: "  " }),
    ).toThrow();
    expect(() => parseKiAntwort(null)).toThrow();
    expect(() => parseKiAntwort("nope")).toThrow();
  });
});
