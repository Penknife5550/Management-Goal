"use client";

import { Target } from "lucide-react";
import { WIG_LIMIT } from "@/lib/constants";
import type { ZielAktionen, ZielDTO } from "@/lib/types";
import { WigKarte } from "./wig-karte";

type Props = { fokusZiele: ZielDTO[] } & ZielAktionen;

// Strategie-Scoreboard: die aktiven WIGs auf einen Blick.
export function WigScoreboard({ fokusZiele, ...aktionen }: Props) {
  const aufKurs = fokusZiele.filter((z) => z.ampel === "GRUEN").length;

  return (
    <section aria-labelledby="scoreboard-titel">
      <div className="mb-3 flex items-center gap-2">
        <Target size={18} className="text-accent" aria-hidden="true" />
        <h2 id="scoreboard-titel" className="text-base font-medium">
          Im Fokus
        </h2>
        <span className="text-sm text-muted-foreground">
          {fokusZiele.length} / {WIG_LIMIT} · {aufKurs} auf Kurs
        </span>
      </div>

      {fokusZiele.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Noch kein Ziel im Fokus. Hol dir aus dem Backlog 1–3 wirklich wichtige Ziele (WIGs) nach
          oben – mehr nicht. Fokus schlägt Vollständigkeit.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {fokusZiele.map((ziel) => (
            <WigKarte key={ziel.id} ziel={ziel} {...aktionen} />
          ))}
        </div>
      )}
    </section>
  );
}
