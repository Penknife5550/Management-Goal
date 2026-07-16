"use client";

import { Archive, ArrowUp, History, Layers, RotateCcw } from "lucide-react";
import { ZOMBIE_TAGE } from "@/lib/constants";
import { tageSeit } from "@/lib/insights";
import type { ZielDTO } from "@/lib/types";

interface Props {
  backlogZiele: ZielDTO[];
  onFokusOeffnen: (ziel: ZielDTO) => void;
  onArchiv: (id: string) => void;
  onBehalten: (id: string) => void;
}

// Backlog = Lager (nicht Arbeitsflaeche). Von hier zieht man WIGs nach oben.
// Zombie-Killer (Drucker): Ziele, die seit ZOMBIE_TAGE unbewegt sind, werden
// aktiv markiert - entweder streichen (Archiv) oder bewusst behalten (Uhr zuruecksetzen).
export function ZielBacklogListe({ backlogZiele, onFokusOeffnen, onArchiv, onBehalten }: Props) {
  const jetzt = new Date();

  return (
    <section aria-labelledby="backlog-titel">
      <div className="mb-3 flex items-center gap-2">
        <Layers size={18} className="text-accent" aria-hidden="true" />
        <h2 id="backlog-titel" className="text-base font-medium">
          Backlog
        </h2>
        <span className="text-sm text-muted-foreground">{backlogZiele.length} geparkt</span>
      </div>

      {backlogZiele.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Backlog ist leer. Lege oben neue Ziele an – sie landen zuerst hier.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {backlogZiele.map((ziel) => {
            const tage = tageSeit(new Date(ziel.updatedAt), jetzt);
            const veraltet = tage >= ZOMBIE_TAGE;
            return (
              <li
                key={ziel.id}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                  veraltet ? "border-status-gelb/50 bg-status-gelb/10" : "border-border bg-card"
                }`}
              >
                <span className="flex-1 truncate text-sm" title={ziel.titel}>
                  {ziel.titel}
                </span>
                {veraltet && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-status-gelb/20 px-2 py-0.5 text-xs text-foreground"
                    title={`Seit ${tage} Tagen unbewegt – streichen oder bewusst behalten?`}
                  >
                    <History size={12} aria-hidden="true" /> veraltet
                  </span>
                )}
                {veraltet && (
                  <button
                    type="button"
                    onClick={() => onBehalten(ziel.id)}
                    aria-label={`Ziel behalten (Uhr zurücksetzen): ${ziel.titel}`}
                    title="Bewusst behalten – setzt die Veraltet-Uhr zurück"
                    className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                  >
                    <RotateCcw size={13} aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onFokusOeffnen(ziel)}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-accent hover:bg-muted"
                >
                  <ArrowUp size={13} aria-hidden="true" /> In Fokus
                </button>
                <button
                  type="button"
                  onClick={() => onArchiv(ziel.id)}
                  aria-label={`Ziel archivieren: ${ziel.titel}`}
                  className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                >
                  <Archive size={13} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
