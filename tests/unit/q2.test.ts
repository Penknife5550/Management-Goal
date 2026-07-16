// ============================================================
// tests/unit/q2.test.ts
// Q2-Schutz: Zeitumrechnung, naechstes Wochentag-Vorkommen, ICS-Erzeugung.
// ============================================================
import { describe, expect, it } from "vitest";
import { baueICS, hhmmZuMinuten, minutenZuHHMM, naechstesDatum } from "../../src/lib/q2";

// Montag, 29.06.2026, 08:00 lokal (Bezugspunkt fuer die Datumstests).
const MO_0800 = new Date(2026, 5, 29, 8, 0, 0);

describe("Zeitumrechnung", () => {
  it("minutenZuHHMM", () => {
    expect(minutenZuHHMM(0)).toBe("00:00");
    expect(minutenZuHHMM(540)).toBe("09:00");
    expect(minutenZuHHMM(1439)).toBe("23:59");
  });

  it("hhmmZuMinuten ist die Umkehrung", () => {
    expect(hhmmZuMinuten("09:00")).toBe(540);
    expect(hhmmZuMinuten(minutenZuHHMM(615))).toBe(615);
  });
});

describe("naechstesDatum", () => {
  it("naechster anderer Wochentag liegt diese Woche", () => {
    expect(naechstesDatum(2, 540, MO_0800)).toEqual({ y: 2026, m: 6, d: 30 }); // Di 30.06.
  });

  it("heute, Startzeit noch nicht vorbei -> heute", () => {
    expect(naechstesDatum(1, 540, MO_0800)).toEqual({ y: 2026, m: 6, d: 29 }); // 09:00 > 08:00
  });

  it("heute, Startzeit bereits vorbei -> naechste Woche", () => {
    expect(naechstesDatum(1, 420, MO_0800)).toEqual({ y: 2026, m: 7, d: 6 }); // 07:00 < 08:00
  });
});

describe("baueICS", () => {
  const block = {
    id: "abc",
    titel: "Strategie-Fokus",
    wochentag: 2,
    startMinute: 540,
    dauerMin: 90,
    goalTitel: "Onboarding",
  };

  it("erzeugt ein gueltiges VCALENDAR mit woechentlicher Wiederholung", () => {
    const ics = baueICS([block], MO_0800);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("RRULE:FREQ=WEEKLY;BYDAY=TU");
    expect(ics).toContain("SUMMARY:Q2: Strategie-Fokus");
    expect(ics).toContain("DESCRIPTION:WIG: Onboarding");
    // Di 30.06.2026, 09:00–10:30 (floating local)
    expect(ics).toContain("DTSTART:20260630T090000");
    expect(ics).toContain("DTEND:20260630T103000");
  });

  it("escaped Sonderzeichen im Titel (RFC 5545)", () => {
    const ics = baueICS([{ ...block, titel: "A, B; C", goalTitel: null }], MO_0800);
    expect(ics).toContain("SUMMARY:Q2: A\\, B\\; C");
    expect(ics).not.toContain("DESCRIPTION:"); // keine WIG -> keine Beschreibung
  });
});
