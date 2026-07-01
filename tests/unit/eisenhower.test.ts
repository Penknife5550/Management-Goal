// ============================================================
// tests/unit/eisenhower.test.ts
// Eisenhower-Domaenenlogik: Quadrant-Ableitung, Meta-Konsistenz, offener KI-Vorschlag.
// ============================================================
import { describe, expect, it } from "vitest";
import {
  berechneQuadrant,
  EISENHOWER_QUADRANTEN,
  istKiVorschlagOffen,
  quadrantMeta,
} from "../../src/lib/eisenhower";

describe("berechneQuadrant", () => {
  it("ordnet die vier Kombinationen korrekt zu", () => {
    expect(berechneQuadrant(true, true)).toBe(1); // wichtig + dringend
    expect(berechneQuadrant(true, false)).toBe(2); // wichtig, nicht dringend
    expect(berechneQuadrant(false, true)).toBe(3); // dringend, nicht wichtig
    expect(berechneQuadrant(false, false)).toBe(4); // weder noch
  });
});

describe("EISENHOWER_QUADRANTEN", () => {
  it("hat genau vier Quadranten mit Werten 1..4", () => {
    expect(EISENHOWER_QUADRANTEN.map((q) => q.wert)).toEqual([1, 2, 3, 4]);
  });

  it("Meta-Flags stimmen mit berechneQuadrant ueberein (Single-Source-Konsistenz)", () => {
    for (const q of EISENHOWER_QUADRANTEN) {
      expect(berechneQuadrant(q.important, q.urgent)).toBe(q.wert);
    }
  });

  it("quadrantMeta liefert das passende Meta-Objekt", () => {
    expect(quadrantMeta(1).aktion).toBe("Tun");
    expect(quadrantMeta(2).aktion).toBe("Planen");
    expect(quadrantMeta(3).aktion).toBe("Delegieren");
    expect(quadrantMeta(4).aktion).toBe("Eliminieren");
  });
});

describe("istKiVorschlagOffen", () => {
  it("false ohne Vorschlag", () => {
    expect(istKiVorschlagOffen({ aiQuadrantSuggestion: null, important: false, urgent: false })).toBe(false);
  });

  it("false wenn Vorschlag dem manuellen Quadranten entspricht", () => {
    // important+urgent => Quadrant 1; Vorschlag 1 => nichts zu entscheiden.
    expect(istKiVorschlagOffen({ aiQuadrantSuggestion: 1, important: true, urgent: true })).toBe(false);
  });

  it("true wenn Vorschlag abweicht", () => {
    // important=false,urgent=false => Quadrant 4; Vorschlag 2 weicht ab.
    expect(istKiVorschlagOffen({ aiQuadrantSuggestion: 2, important: false, urgent: false })).toBe(true);
  });

  it("false bei ungueltigem Vorschlagswert", () => {
    expect(istKiVorschlagOffen({ aiQuadrantSuggestion: 0, important: false, urgent: false })).toBe(false);
    expect(istKiVorschlagOffen({ aiQuadrantSuggestion: 5, important: false, urgent: false })).toBe(false);
  });
});
