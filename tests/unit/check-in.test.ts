// ============================================================
// tests/unit/check-in.test.ts
// Reine Check-in-Faelligkeitslogik (Stale-Badge / Reminder-Schwelle).
// ============================================================
import { describe, expect, it } from "vitest";
import { CHECKIN_FAELLIG_TAGE } from "../../src/lib/constants";
import { istCheckinFaellig, tageSeitCheckin } from "../../src/lib/check-in";

const JETZT = new Date("2026-06-29T12:00:00.000Z");
const vorTagen = (n: number) => new Date(JETZT.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

describe("tageSeitCheckin", () => {
  it("zaehlt ganze Tage seit dem letzten Check-in", () => {
    expect(tageSeitCheckin(vorTagen(10), vorTagen(40), JETZT)).toBe(10);
  });

  it("nutzt createdAt, wenn noch nie eingecheckt wurde", () => {
    expect(tageSeitCheckin(null, vorTagen(3), JETZT)).toBe(3);
  });
});

describe("istCheckinFaellig", () => {
  it("faellig ab der Schwelle (>= CHECKIN_FAELLIG_TAGE)", () => {
    expect(istCheckinFaellig(vorTagen(CHECKIN_FAELLIG_TAGE), vorTagen(40), JETZT)).toBe(true);
    expect(istCheckinFaellig(vorTagen(CHECKIN_FAELLIG_TAGE + 5), vorTagen(40), JETZT)).toBe(true);
  });

  it("nicht faellig knapp darunter", () => {
    expect(istCheckinFaellig(vorTagen(CHECKIN_FAELLIG_TAGE - 1), vorTagen(40), JETZT)).toBe(false);
  });

  it("frisch eingecheckt ist nicht faellig", () => {
    expect(istCheckinFaellig(vorTagen(0), vorTagen(40), JETZT)).toBe(false);
  });

  it("neu angelegte WIG ohne Check-in ist erst nach der Schwelle faellig", () => {
    expect(istCheckinFaellig(null, vorTagen(2), JETZT)).toBe(false);
    expect(istCheckinFaellig(null, vorTagen(CHECKIN_FAELLIG_TAGE), JETZT)).toBe(true);
  });
});
