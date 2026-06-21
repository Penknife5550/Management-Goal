"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { LeadMeasureDTO } from "@/lib/types";

interface Props {
  leadMeasures: LeadMeasureDTO[];
  onAnlegen: (beschreibung: string, zielwert: number) => void;
  onIstwert: (id: string, istwert: number) => void;
  onLoeschen: (id: string) => void;
}

// Lead Measures (4DX): steuerbare Fruehindikatoren je WIG.
export function LeadMeasureListe({ leadMeasures, onAnlegen, onIstwert, onLoeschen }: Props) {
  const [beschreibung, setBeschreibung] = useState("");
  const [zielwert, setZielwert] = useState("5");
  const [formOffen, setFormOffen] = useState(false);

  function absenden(event: React.FormEvent) {
    event.preventDefault();
    const ziel = Number.parseInt(zielwert, 10);
    if (beschreibung.trim().length === 0 || Number.isNaN(ziel) || ziel < 1) return;
    onAnlegen(beschreibung.trim(), ziel);
    setBeschreibung("");
    setZielwert("5");
    setFormOffen(false);
  }

  return (
    <div className="mt-3">
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">Lead Measures (Hebel)</p>

      {leadMeasures.length === 0 && !formOffen && (
        <p className="text-xs text-muted-foreground">
          Noch kein Frühindikator. Was kannst du diese Woche steuern?
        </p>
      )}

      <ul className="flex flex-col gap-1.5">
        {leadMeasures.map((lm) => {
          const erfuellt = lm.istwert >= lm.zielwert;
          return (
            <li key={lm.id} className="flex items-center gap-2 text-sm">
              <span className="flex-1 truncate" title={lm.beschreibung}>
                {lm.beschreibung}
              </span>
              <span
                className={`tabular-nums text-xs ${erfuellt ? "text-status-gruen" : "text-muted-foreground"}`}
              >
                {lm.istwert}/{lm.zielwert}
              </span>
              <button
                type="button"
                onClick={() => onIstwert(lm.id, Math.min(lm.istwert + 1, lm.zielwert))}
                disabled={erfuellt}
                aria-label={`Fortschritt erhöhen: ${lm.beschreibung}`}
                className="rounded-md border border-border px-1.5 py-0.5 text-accent hover:bg-muted disabled:opacity-40"
              >
                {erfuellt ? (
                  <Check size={14} aria-hidden="true" />
                ) : (
                  <Plus size={14} aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                onClick={() => onLoeschen(lm.id)}
                aria-label={`Lead Measure löschen: ${lm.beschreibung}`}
                className="rounded-md border border-border px-1.5 py-0.5 text-muted-foreground hover:bg-muted"
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>

      {formOffen ? (
        <form onSubmit={absenden} className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={beschreibung}
            onChange={(e) => setBeschreibung(e.target.value)}
            placeholder="z. B. 5 Standorte interviewt"
            aria-label="Beschreibung der Lead Measure"
            className="min-w-0 flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
            autoFocus
          />
          <input
            type="number"
            min={1}
            value={zielwert}
            onChange={(e) => setZielwert(e.target.value)}
            aria-label="Zielwert"
            className="w-16 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-accent px-2.5 py-1.5 text-sm text-accent-foreground"
          >
            Hinzufügen
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setFormOffen(true)}
          className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline"
        >
          <Plus size={13} aria-hidden="true" /> Lead Measure
        </button>
      )}
    </div>
  );
}
