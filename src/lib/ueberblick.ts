// ============================================================
// src/lib/ueberblick.ts
// GF-Aggregat (AP5): reine Typen + Roll-up-Verdichtung fuer den read-only
// Fuehrungs-Ueberblick ueber alle Nutzer einer Rechtseinheit. Prisma-frei ->
// die Verdichtung ist isoliert testbar (Ladelogik liegt in ueberblick-data.ts).
// ============================================================
import type { Ampel } from "./goals";
import type { TagesTon } from "./heute";

export interface UeberblickWig {
  id: string;
  titel: string;
  ampel: Ampel;
  fortschritt: number;
}

// Verdichtung EINES Nutzers: Tagesurteil (aus bewerteTag) + seine WIGs.
export interface NutzerUeberblick {
  id: string;
  name: string;
  urteilTon: TagesTon; // gruen | gelb | rot | leer
  urteilTitel: string;
  wigs: UeberblickWig[];
  anzahlWarnungen: number; // Insight-Warnungen (Schwere "warnung")
}

export interface UeberblickRollup {
  anzahlNutzer: number;
  anzahlWigs: number;
  aufKurs: number; // Ton gruen
  wackelig: number; // Ton gelb
  kritisch: number; // Ton rot
  ohneFokus: number; // Ton leer (keine WIG)
}

export interface UeberblickDTO {
  rollup: UeberblickRollup;
  nutzer: NutzerUeberblick[];
}

/** Verdichtet die Einzel-Uebersichten zum Roll-up (rein, testbar). */
export function fasseZusammen(nutzer: NutzerUeberblick[]): UeberblickRollup {
  return {
    anzahlNutzer: nutzer.length,
    anzahlWigs: nutzer.reduce((n, u) => n + u.wigs.length, 0),
    aufKurs: nutzer.filter((u) => u.urteilTon === "gruen").length,
    wackelig: nutzer.filter((u) => u.urteilTon === "gelb").length,
    kritisch: nutzer.filter((u) => u.urteilTon === "rot").length,
    ohneFokus: nutzer.filter((u) => u.urteilTon === "leer").length,
  };
}
