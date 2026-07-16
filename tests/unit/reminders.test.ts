// ============================================================
// tests/unit/reminders.test.ts
// Unit-Tests der reinen Reminder-Auswahl-Logik (ohne DB):
// Faelligkeit (Signal lastCheckinAt/createdAt) + Buendelung je Owner inkl. Consent.
// ============================================================
import { describe, expect, it } from "vitest";
import { buendleNachOwner, isoWeekKey, istWigFaellig, STALE_TAGE } from "../../src/lib/reminders";

const JETZT = new Date("2026-06-29T08:00:00.000Z");
const vorTagen = (n: number) => new Date(JETZT.getTime() - n * 24 * 60 * 60 * 1000);

describe("istWigFaellig", () => {
  it("nur FOKUS-WIGs sind ueberhaupt faellig", () => {
    expect(
      istWigFaellig(
        { status: "BACKLOG", lastCheckinAt: vorTagen(30), createdAt: vorTagen(30) },
        JETZT,
      ),
    ).toBe(false);
    expect(
      istWigFaellig(
        { status: "ERREICHT", lastCheckinAt: vorTagen(30), createdAt: vorTagen(30) },
        JETZT,
      ),
    ).toBe(false);
  });

  it("faellig, wenn letzter Check-in laenger als STALE_TAGE her ist", () => {
    expect(
      istWigFaellig(
        { status: "FOKUS", lastCheckinAt: vorTagen(STALE_TAGE + 1), createdAt: vorTagen(40) },
        JETZT,
      ),
    ).toBe(true);
  });

  it("nicht faellig, wenn juengst eingecheckt", () => {
    expect(
      istWigFaellig(
        { status: "FOKUS", lastCheckinAt: vorTagen(2), createdAt: vorTagen(40) },
        JETZT,
      ),
    ).toBe(false);
  });

  it("genau an der Grenze (STALE_TAGE Tage) ist faellig", () => {
    expect(
      istWigFaellig(
        { status: "FOKUS", lastCheckinAt: vorTagen(STALE_TAGE), createdAt: vorTagen(40) },
        JETZT,
      ),
    ).toBe(true);
  });

  it("knapp unter der Grenze (STALE_TAGE-1) ist NICHT faellig", () => {
    expect(
      istWigFaellig(
        { status: "FOKUS", lastCheckinAt: vorTagen(STALE_TAGE - 1), createdAt: vorTagen(40) },
        JETZT,
      ),
    ).toBe(false);
  });

  it("ohne Check-in zaehlt createdAt als Bezug", () => {
    expect(
      istWigFaellig({ status: "FOKUS", lastCheckinAt: null, createdAt: vorTagen(10) }, JETZT),
    ).toBe(true);
    expect(
      istWigFaellig({ status: "FOKUS", lastCheckinAt: null, createdAt: vorTagen(3) }, JETZT),
    ).toBe(false);
  });
});

describe("buendleNachOwner", () => {
  const owner = (
    over: Partial<{ email: string; name: string; emailRemindersEnabled: boolean }> = {},
  ) => ({
    email: "fk@credo-gruppe.de",
    name: "Fuehrungskraft",
    emailRemindersEnabled: true,
    ...over,
  });
  const wig = (ownerId: string, titel: string, ownerOver = {}) => ({
    status: "FOKUS",
    lastCheckinAt: vorTagen(10),
    createdAt: vorTagen(40),
    titel,
    ownerId,
    owner: owner(ownerOver),
  });

  it("buendelt mehrere faellige WIGs eines Owners zu EINER Mail", () => {
    const res = buendleNachOwner([wig("u1", "A"), wig("u1", "B")], JETZT);
    expect(res).toHaveLength(1);
    expect(res[0]!.titel).toEqual(["A", "B"]);
  });

  it("respektiert den Pro-User-Consent (emailRemindersEnabled=false)", () => {
    const res = buendleNachOwner([wig("u1", "A", { emailRemindersEnabled: false })], JETZT);
    expect(res).toHaveLength(0);
  });

  it("ueberspringt Owner ohne gueltige Adresse", () => {
    const res = buendleNachOwner([wig("u1", "A", { email: "" })], JETZT);
    expect(res).toHaveLength(0);
  });

  it("nimmt nur faellige WIGs auf", () => {
    const frisch = { ...wig("u1", "frisch"), lastCheckinAt: vorTagen(1) };
    const res = buendleNachOwner([frisch, wig("u1", "alt")], JETZT);
    expect(res[0]!.titel).toEqual(["alt"]);
  });

  it("trennt verschiedene Owner", () => {
    const res = buendleNachOwner([wig("u1", "A"), wig("u2", "B")], JETZT);
    expect(res).toHaveLength(2);
  });
});

describe("isoWeekKey", () => {
  it("liefert das ISO-Wochen-Format YYYY-Www", () => {
    expect(isoWeekKey(new Date("2026-06-29T08:00:00Z"))).toMatch(/^\d{4}-W\d{2}$/);
  });

  it("rechnet bekannte Wochen korrekt (Donnerstag-Regel)", () => {
    expect(isoWeekKey(new Date("2026-01-01T12:00:00Z"))).toBe("2026-W01"); // Do = KW1
    expect(isoWeekKey(new Date("2026-01-05T12:00:00Z"))).toBe("2026-W02"); // Mo = KW2
  });

  it("ist innerhalb derselben Woche stabil (Idempotenz-Periode)", () => {
    const mo = isoWeekKey(new Date("2026-06-29T08:00:00Z"));
    const mi = isoWeekKey(new Date("2026-07-01T20:00:00Z"));
    expect(mo).toBe(mi);
  });
});
