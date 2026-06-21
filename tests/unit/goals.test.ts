// ============================================================
// tests/unit/goals.test.ts
// Unit-Tests der Domaenenlogik: WIG-Limit, Status-Uebergaenge,
// Outcome-Pflicht, Countdown-Pacing.
// ============================================================
import { describe, expect, it } from "vitest";
import { WIG_LIMIT } from "../../src/lib/constants";
import {
  berechneCountdown,
  istStatusUebergangErlaubt,
  outcomePflichtErfuellt,
  pruefeFokusHebung,
} from "../../src/lib/goals";

describe("istStatusUebergangErlaubt", () => {
  it("erlaubt BACKLOG -> FOKUS", () => {
    expect(istStatusUebergangErlaubt("BACKLOG", "FOKUS")).toBe(true);
  });

  it("erlaubt FOKUS -> ERREICHT und FOKUS -> BACKLOG", () => {
    expect(istStatusUebergangErlaubt("FOKUS", "ERREICHT")).toBe(true);
    expect(istStatusUebergangErlaubt("FOKUS", "BACKLOG")).toBe(true);
  });

  it("verbietet BACKLOG -> ERREICHT (kein Direktsprung)", () => {
    expect(istStatusUebergangErlaubt("BACKLOG", "ERREICHT")).toBe(false);
  });

  it("ARCHIVIERT ist terminal", () => {
    expect(istStatusUebergangErlaubt("ARCHIVIERT", "FOKUS")).toBe(false);
    expect(istStatusUebergangErlaubt("ARCHIVIERT", "BACKLOG")).toBe(false);
  });

  it("gleicher Status ist idempotent erlaubt", () => {
    expect(istStatusUebergangErlaubt("FOKUS", "FOKUS")).toBe(true);
  });
});

describe("outcomePflichtErfuellt", () => {
  it("FOKUS ohne Outcome ist nicht erfuellt", () => {
    expect(outcomePflichtErfuellt("FOKUS", "")).toBe(false);
    expect(outcomePflichtErfuellt("FOKUS", "   ")).toBe(false);
    expect(outcomePflichtErfuellt("FOKUS", null)).toBe(false);
    expect(outcomePflichtErfuellt("FOKUS", undefined)).toBe(false);
  });

  it("FOKUS mit Outcome ist erfuellt", () => {
    expect(outcomePflichtErfuellt("FOKUS", "Vorstand entscheidet fundiert")).toBe(true);
  });

  it("BACKLOG braucht kein Outcome", () => {
    expect(outcomePflichtErfuellt("BACKLOG", null)).toBe(true);
  });
});

describe("pruefeFokusHebung (harte WIG-Grenze)", () => {
  it("erlaubt das Heben unterhalb des Limits mit Outcome", () => {
    const ergebnis = pruefeFokusHebung(WIG_LIMIT - 1, "Klares Outcome");
    expect(ergebnis.erlaubt).toBe(true);
  });

  it("blockiert das Heben am Limit", () => {
    const ergebnis = pruefeFokusHebung(WIG_LIMIT, "Klares Outcome");
    expect(ergebnis.erlaubt).toBe(false);
    expect(ergebnis.grund).toContain(String(WIG_LIMIT));
  });

  it("blockiert das Heben ohne Outcome trotz freiem Slot", () => {
    const ergebnis = pruefeFokusHebung(0, "");
    expect(ergebnis.erlaubt).toBe(false);
    expect(ergebnis.grund).toMatch(/Outcome/i);
  });
});

describe("berechneCountdown (Pacing, keine Drohuhr)", () => {
  const jetzt = new Date("2026-06-21T10:00:00Z");

  it("ohne Frist -> Ton 'ohne'", () => {
    const info = berechneCountdown(null, jetzt);
    expect(info.ton).toBe("ohne");
    expect(info.tageVerbleibend).toBeNull();
  });

  it("ferne Frist -> neutral", () => {
    const info = berechneCountdown(new Date("2026-07-21T10:00:00Z"), jetzt);
    expect(info.ton).toBe("neutral");
    expect(info.tageVerbleibend).toBe(30);
  });

  it("nahe Frist (<= Warnschwelle) -> warnung", () => {
    const info = berechneCountdown(new Date("2026-06-25T10:00:00Z"), jetzt);
    expect(info.ton).toBe("warnung");
    expect(info.tageVerbleibend).toBe(4);
  });

  it("heute faellig -> warnung", () => {
    const info = berechneCountdown(new Date("2026-06-21T23:00:00Z"), jetzt);
    expect(info.ton).toBe("warnung");
    expect(info.tageVerbleibend).toBe(0);
  });

  it("ueberschrittene Frist -> ueberfaellig", () => {
    const info = berechneCountdown(new Date("2026-06-18T10:00:00Z"), jetzt);
    expect(info.ton).toBe("ueberfaellig");
    expect(info.tageVerbleibend).toBe(-3);
  });
});
