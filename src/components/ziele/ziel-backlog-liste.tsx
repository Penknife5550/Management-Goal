"use client";

import { Archive, ArrowUp, Layers } from "lucide-react";
import type { ZielDTO } from "@/lib/types";

interface Props {
  backlogZiele: ZielDTO[];
  onFokusOeffnen: (ziel: ZielDTO) => void;
  onArchiv: (id: string) => void;
}

// Backlog = Lager (nicht Arbeitsflaeche). Von hier zieht man WIGs nach oben.
export function ZielBacklogListe({ backlogZiele, onFokusOeffnen, onArchiv }: Props) {
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
          {backlogZiele.map((ziel) => (
            <li
              key={ziel.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2"
            >
              <span className="flex-1 truncate text-sm" title={ziel.titel}>
                {ziel.titel}
              </span>
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
          ))}
        </ul>
      )}
    </section>
  );
}
