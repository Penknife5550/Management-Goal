"use client";

import { Sparkles, Target } from "lucide-react";

interface Props {
  onBeispielUebernehmen: (titel: string) => void;
}

const BEISPIEL_TITEL = "Onboarding-Prozess für alle Einrichtungen standardisieren";

// First-Run: nie ein leeres Cockpit. Beispiel-WIG als Startvorlage.
export function ZieleEmptyState({ onBeispielUebernehmen }: Props) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/40 p-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-card">
        <Target size={24} className="text-accent" aria-hidden="true" />
      </div>
      <h2 className="text-base font-medium">Dein Cockpit ist startklar</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Lege oben dein erstes Ziel an. Sammle ruhig viele Ideen im Backlog – aber hol dir nur 1–3
        wirklich wichtige Ziele (WIGs) in den Fokus. Fokus schlägt Vollständigkeit.
      </p>

      <div className="mx-auto mt-4 max-w-md rounded-lg border border-border bg-card p-4 text-left">
        <p className="mb-1 text-xs font-medium text-muted-foreground">Beispiel</p>
        <p className="text-sm font-medium">{BEISPIEL_TITEL}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Outcome (beim Heben in den Fokus): „Alle Standortleitungen führen neue Mitarbeiter nach
          einem einheitlichen Standard ein.“
        </p>
        <button
          type="button"
          onClick={() => onBeispielUebernehmen(BEISPIEL_TITEL)}
          className="mt-3 inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-sm text-accent-foreground hover:opacity-90"
        >
          <Sparkles size={14} aria-hidden="true" /> Beispiel-Ziel übernehmen
        </button>
      </div>
    </div>
  );
}
