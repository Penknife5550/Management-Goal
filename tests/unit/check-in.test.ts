// ============================================================
// tests/unit/check-in.test.ts
// Reine Check-in-Faelligkeitslogik (Stale-Badge / Reminder-Schwelle).
// ============================================================
import { describe, expect, it } from "vitest";
import { CHECKIN_FAELLIG_TAGE } from "../../src/lib/constants";
import { berechneWin, istCheckinFaellig, pruefeCheckinScope, tageSeitCheckin } from "../../src/lib/check-in";

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

describe("berechneWin (Small-Wins)", () => {
  const ohneLeads = { leads: [] as { beschreibung: string; zielwert: number; istwertAlt: number; istwertNeu: number }[] };

  it("zaehlt nur positiven Fortschritts-Zuwachs", () => {
    expect(berechneWin({ ampelAlt: "GELB", ampelNeu: "GELB", fortschrittAlt: 20, fortschrittNeu: 60, ...ohneLeads }).fortschrittDelta).toBe(40);
    expect(berechneWin({ ampelAlt: "GELB", ampelNeu: "GELB", fortschrittAlt: 60, fortschrittNeu: 40, ...ohneLeads }).fortschrittDelta).toBe(0);
  });

  it("erkennt verbesserte Ampel (ROT->GELB->GRUEN), nicht aber Verschlechterung", () => {
    expect(berechneWin({ ampelAlt: "ROT", ampelNeu: "GRUEN", fortschrittAlt: 0, fortschrittNeu: 0, ...ohneLeads }).ampelVerbessert).toBe(true);
    expect(berechneWin({ ampelAlt: "GRUEN", ampelNeu: "ROT", fortschrittAlt: 0, fortschrittNeu: 0, ...ohneLeads }).ampelVerbessert).toBe(false);
    expect(berechneWin({ ampelAlt: "GELB", ampelNeu: "GELB", fortschrittAlt: 0, fortschrittNeu: 0, ...ohneLeads }).ampelVerbessert).toBe(false);
  });

  it("listet in diesem Check-in NEU erfuellte Lead Measures", () => {
    const w = berechneWin({
      ampelAlt: "GELB", ampelNeu: "GELB", fortschrittAlt: 0, fortschrittNeu: 0,
      leads: [
        { beschreibung: "Neu erfuellt", zielwert: 5, istwertAlt: 3, istwertNeu: 5 },
        { beschreibung: "Schon vorher erfuellt", zielwert: 2, istwertAlt: 2, istwertNeu: 2 },
        { beschreibung: "Noch offen", zielwert: 5, istwertAlt: 1, istwertNeu: 3 },
      ],
    });
    expect(w.leadsErfuellt).toEqual(["Neu erfuellt"]);
  });

  it("hatFortschritt nur, wenn irgendeine Dimension zulegt", () => {
    expect(berechneWin({ ampelAlt: "GELB", ampelNeu: "GELB", fortschrittAlt: 50, fortschrittNeu: 50, ...ohneLeads }).hatFortschritt).toBe(false);
    expect(berechneWin({ ampelAlt: "GELB", ampelNeu: "GRUEN", fortschrittAlt: 50, fortschrittNeu: 50, ...ohneLeads }).hatFortschritt).toBe(true);
  });
});

describe("pruefeCheckinScope (IDOR-Barriere)", () => {
  const fokus = [
    { id: "g1", leadIds: ["l1", "l2"] },
    { id: "g2", leadIds: [] },
  ];

  it("laesst eigene FOKUS-WIGs mit eigenen Leads durch", () => {
    const r = pruefeCheckinScope([{ goalId: "g1", leads: [{ id: "l1" }] }, { goalId: "g2", leads: [] }], fokus);
    expect(r.ok).toBe(true);
  });

  it("lehnt fremde/nicht-aktive WIG ab", () => {
    const r = pruefeCheckinScope([{ goalId: "fremd", leads: [] }], fokus);
    expect(r).toEqual({ ok: false, fehler: "Ungueltige oder nicht aktive WIG." });
  });

  it("lehnt fremde Lead-ID (anderer WIG) ab", () => {
    const r = pruefeCheckinScope([{ goalId: "g2", leads: [{ id: "l1" }] }], fokus);
    expect(r).toEqual({ ok: false, fehler: "Lead Measure gehoert nicht zur WIG." });
  });
});
