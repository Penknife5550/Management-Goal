// ============================================================
// tests/unit/ueberblick.test.ts
// GF-Aggregat (AP5): die reine Roll-up-Verdichtung (fasseZusammen).
// ============================================================
import { describe, expect, it } from "vitest";
import type { TagesTon } from "../../src/lib/heute";
import { fasseZusammen, type NutzerUeberblick } from "../../src/lib/ueberblick";

function nutzer(ton: TagesTon, wigAnzahl = 0): NutzerUeberblick {
  return {
    id: `u-${ton}-${wigAnzahl}`,
    name: "Test",
    urteilTon: ton,
    urteilTitel: "x",
    anzahlWarnungen: 0,
    wigs: Array.from({ length: wigAnzahl }, (_, i) => ({
      id: `w${i}`,
      titel: "WIG",
      ampel: "GRUEN" as const,
      fortschritt: 50,
    })),
  };
}

describe("fasseZusammen", () => {
  it("leere Liste -> alle Zaehler 0", () => {
    const r = fasseZusammen([]);
    expect(r).toEqual({
      anzahlNutzer: 0,
      anzahlWigs: 0,
      aufKurs: 0,
      wackelig: 0,
      kritisch: 0,
      ohneFokus: 0,
    });
  });

  it("zaehlt Personen und WIGs korrekt", () => {
    const r = fasseZusammen([nutzer("gruen", 2), nutzer("rot", 1)]);
    expect(r.anzahlNutzer).toBe(2);
    expect(r.anzahlWigs).toBe(3);
  });

  it("verteilt die Toene auf die richtigen Zaehler", () => {
    const r = fasseZusammen([
      nutzer("gruen"),
      nutzer("gelb"),
      nutzer("gelb"),
      nutzer("rot"),
      nutzer("leer"),
    ]);
    expect(r.aufKurs).toBe(1);
    expect(r.wackelig).toBe(2);
    expect(r.kritisch).toBe(1);
    expect(r.ohneFokus).toBe(1);
  });
});
