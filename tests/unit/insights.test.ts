// ============================================================
// tests/unit/insights.test.ts
// Insight-Motor (AP 1): jede deterministische Regel + der Aggregator, mit
// den Grenzfaellen (kein Lead-Measure -> kein Urteil, Schwellen, Sortierung).
// ============================================================
import { describe, expect, it } from "vitest";
import {
  ampelTrend,
  berechneFokusLeck,
  berechneInsights,
  erkenneWatermelon,
  findeZombies,
  type InsightCheckIn,
  type InsightGoal,
  type InsightTask,
  leadErfuellung,
  pruefeBeitrag,
  tageSeit,
  verteileQuadranten,
} from "../../src/lib/insights";

const JETZT = new Date("2026-07-13T12:00:00Z");
const vorTagen = (n: number) => new Date(JETZT.getTime() - n * 24 * 60 * 60 * 1000);

function ziel(over: Partial<InsightGoal> = {}): InsightGoal {
  return {
    id: "g1",
    titel: "Beispielziel",
    status: "FOKUS",
    ampel: "GRUEN",
    fortschritt: 0,
    outcome: "Kundenzufriedenheit um 10% erhoeht",
    updatedAt: vorTagen(1),
    leadMeasures: [],
    checkIns: [],
    ...over,
  };
}
const task = (
  important: boolean,
  urgent: boolean,
  zeitIstMin: number | null = null,
): InsightTask => ({
  important,
  urgent,
  zeitIstMin,
});
const checkin = (
  ampel: InsightCheckIn["ampel"],
  fortschritt: number,
  tage: number,
): InsightCheckIn => ({
  ampel,
  fortschritt,
  createdAt: vorTagen(tage),
});

describe("tageSeit", () => {
  it("zaehlt ganze Tage zeitzonenunabhaengig", () => {
    expect(tageSeit(vorTagen(90), JETZT)).toBe(90);
    expect(tageSeit(JETZT, JETZT)).toBe(0);
  });
});

describe("leadErfuellung", () => {
  it("liefert null ohne bewertbare Lead Measures", () => {
    expect(leadErfuellung([])).toBeNull();
    expect(leadErfuellung([{ zielwert: 0, istwert: 5 }])).toBeNull();
  });
  it("summiert ist/soll", () => {
    expect(leadErfuellung([{ zielwert: 10, istwert: 5 }])).toBeCloseTo(0.5);
    expect(
      leadErfuellung([
        { zielwert: 10, istwert: 5 },
        { zielwert: 10, istwert: 10 },
      ]),
    ).toBeCloseTo(0.75);
  });
  it("deckelt Ueber-Erfuellung bei 100%", () => {
    expect(leadErfuellung([{ zielwert: 10, istwert: 30 }])).toBeCloseTo(1);
  });
});

describe("erkenneWatermelon", () => {
  it("meldet gruen aussen, Lead Measures hinten", () => {
    const w = erkenneWatermelon(
      ziel({ ampel: "GRUEN", leadMeasures: [{ zielwert: 10, istwert: 2 }] }),
    );
    expect(w?.typ).toBe("watermelon");
    expect(w?.schwere).toBe("warnung");
    expect(w?.kennzahl).toBe(20);
  });
  it("greift auch ueber hohen Fortschritt bei gelber Ampel", () => {
    const w = erkenneWatermelon(
      ziel({ ampel: "GELB", fortschritt: 80, leadMeasures: [{ zielwert: 10, istwert: 1 }] }),
    );
    expect(w).not.toBeNull();
  });
  it("kein Urteil ohne Lead Measures", () => {
    expect(erkenneWatermelon(ziel({ ampel: "GRUEN", leadMeasures: [] }))).toBeNull();
  });
  it("schweigt, wenn die Lead Measures gut laufen", () => {
    expect(
      erkenneWatermelon(ziel({ ampel: "GRUEN", leadMeasures: [{ zielwert: 10, istwert: 8 }] })),
    ).toBeNull();
  });
  it("schweigt bei niedrigem Fortschritt + gelber Ampel", () => {
    expect(
      erkenneWatermelon(
        ziel({ ampel: "GELB", fortschritt: 50, leadMeasures: [{ zielwert: 10, istwert: 1 }] }),
      ),
    ).toBeNull();
  });
  it("nur fuer FOKUS-Ziele", () => {
    expect(
      erkenneWatermelon(ziel({ status: "BACKLOG", leadMeasures: [{ zielwert: 10, istwert: 1 }] })),
    ).toBeNull();
  });
});

describe("verteileQuadranten / berechneFokusLeck", () => {
  it("faellt ohne Zeit auf Anzahl zurueck und warnt ab 30% Q3", () => {
    const v = verteileQuadranten([task(true, true), task(false, true)]);
    expect(v.basis).toBe("anzahl");
    const fl = berechneFokusLeck([task(true, true), task(false, true)]);
    expect(fl?.kennzahl).toBe(50);
    expect(fl?.schwere).toBe("warnung");
  });
  it("nutzt erfasste Zeit, wenn vorhanden", () => {
    const fl = berechneFokusLeck([task(true, true, 40), task(false, true, 60)]);
    expect(fl?.kennzahl).toBe(60);
    expect(fl?.detail).toContain("Aufgabenzeit");
  });
  it("schweigt unter der Schwelle", () => {
    expect(
      berechneFokusLeck([
        task(false, true),
        task(true, true),
        task(true, true),
        task(true, true),
        task(true, true),
      ]),
    ).toBeNull();
  });
  it("schweigt ohne Aufgaben", () => {
    expect(berechneFokusLeck([])).toBeNull();
  });
});

describe("findeZombies", () => {
  it("meldet nur alte Backlog-Ziele", () => {
    const zombies = findeZombies(
      [
        ziel({ id: "alt", status: "BACKLOG", updatedAt: vorTagen(100) }),
        ziel({ id: "frisch", status: "BACKLOG", updatedAt: vorTagen(10) }),
        ziel({ id: "fokus-alt", status: "FOKUS", updatedAt: vorTagen(200) }),
      ],
      JETZT,
    );
    expect(zombies).toHaveLength(1);
    expect(zombies[0]!.goalId).toBe("alt");
    expect(zombies[0]!.kennzahl).toBe(100);
  });
});

describe("ampelTrend", () => {
  it("meldet gefallene Ampel", () => {
    const t = ampelTrend(ziel({ checkIns: [checkin("GRUEN", 50, 14), checkin("GELB", 50, 7)] }));
    expect(t?.typ).toBe("trend");
    expect(t?.detail).toContain("gefallen");
  });
  it("meldet gesunkenen Fortschritt", () => {
    const t = ampelTrend(ziel({ checkIns: [checkin("GELB", 60, 14), checkin("GELB", 40, 7)] }));
    expect(t?.kennzahl).toBe(-20);
  });
  it("schweigt bei Verbesserung", () => {
    expect(
      ampelTrend(ziel({ checkIns: [checkin("GELB", 40, 14), checkin("GRUEN", 60, 7)] })),
    ).toBeNull();
  });
  it("braucht mindestens zwei Check-ins", () => {
    expect(ampelTrend(ziel({ checkIns: [checkin("ROT", 10, 7)] }))).toBeNull();
  });
});

describe("pruefeBeitrag", () => {
  it("meldet fehlendes Outcome", () => {
    expect(pruefeBeitrag(ziel({ outcome: "" }))?.titel).toContain("Kein Outcome");
  });
  it("markiert Aktivitaets-Formulierungen", () => {
    const b = pruefeBeitrag(ziel({ outcome: "Erstellen einer neuen Ablagestruktur" }));
    expect(b?.typ).toBe("beitrag");
    expect(b?.detail).toContain("Taetigkeit");
  });
  it("akzeptiert echte Beitrags-Formulierungen", () => {
    expect(pruefeBeitrag(ziel({ outcome: "Fluktuation auf unter 5% gesenkt" }))).toBeNull();
  });
  it("nur fuer FOKUS-Ziele", () => {
    expect(pruefeBeitrag(ziel({ status: "BACKLOG", outcome: "" }))).toBeNull();
  });
});

describe("berechneInsights", () => {
  it("fuehrt Regeln zusammen und sortiert Warnungen nach vorne", () => {
    const alle = berechneInsights({
      goals: [
        ziel({ id: "w", ampel: "GRUEN", leadMeasures: [{ zielwert: 10, istwert: 1 }] }), // watermelon (warnung)
        ziel({ id: "z", status: "BACKLOG", updatedAt: vorTagen(120) }), // zombie (hinweis)
      ],
      tasks: [],
      jetzt: JETZT,
    });
    expect(alle.length).toBeGreaterThanOrEqual(2);
    expect(alle[0]!.schwere).toBe("warnung");
    expect(alle[alle.length - 1]!.schwere).toBe("hinweis");
  });
});
