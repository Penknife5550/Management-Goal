"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { WIG_LIMIT } from "@/lib/constants";
import type { ZielDTO } from "@/lib/types";

interface Props {
  ziel: ZielDTO | null; // null = geschlossen
  limitErreicht: boolean;
  onAbbrechen: () => void;
  onBestaetigen: (outcome: string, erwartet: string, dueDate: string | null) => void;
}

// Heben ins FOKUS erzwingt einen Outcome (Drucker: Beitrag statt Aktivitaet).
export function ZielAufFokusModal({ ziel, limitErreicht, onAbbrechen, onBestaetigen }: Props) {
  const [outcome, setOutcome] = useState("");
  const [erwartet, setErwartet] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);

  const offen = ziel !== null;

  function absenden(event: React.FormEvent) {
    event.preventDefault();
    if (outcome.trim().length === 0) {
      setFehler("Bitte formuliere den angestrebten Outcome (den Beitrag), keine reine Aktivität.");
      return;
    }
    onBestaetigen(outcome.trim(), erwartet.trim(), dueDate ? dueDate : null);
    zuruecksetzen();
  }

  function zuruecksetzen() {
    setOutcome("");
    setErwartet("");
    setDueDate("");
    setFehler(null);
  }

  return (
    <Dialog.Root
      open={offen}
      onOpenChange={(o) => {
        if (!o) {
          zuruecksetzen();
          onAbbrechen();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-foreground/30" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(92vw,30rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-5 shadow-lg focus:outline-none">
          <div className="mb-3 flex items-start justify-between gap-3">
            <Dialog.Title className="text-base font-medium">Ins Fokus heben</Dialog.Title>
            <Dialog.Close
              className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              aria-label="Schließen"
            >
              <X size={18} aria-hidden="true" />
            </Dialog.Close>
          </div>

          <Dialog.Description className="mb-4 text-sm text-muted-foreground">
            {ziel?.titel}
          </Dialog.Description>

          {limitErreicht ? (
            <div className="flex items-start gap-2 rounded-md border border-status-rot/40 bg-status-rot/10 p-3 text-sm">
              <AlertTriangle size={18} className="text-status-rot" aria-hidden="true" />
              <p>
                Es sind bereits {WIG_LIMIT} Ziele im Fokus. Schließe zuerst ein aktives Ziel ab oder
                stelle es zurück – Fokus schlägt Vollständigkeit.
              </p>
            </div>
          ) : (
            <form onSubmit={absenden} className="flex flex-col gap-3">
              <div>
                <label htmlFor="outcome" className="mb-1 block text-sm font-medium">
                  Outcome (Pflicht) <span className="text-status-rot">*</span>
                </label>
                <textarea
                  id="outcome"
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  placeholder="Welcher Beitrag soll entstehen? z. B. „Standortleitungen wenden das neue Onboarding sicher an.“"
                  className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  aria-required="true"
                  aria-invalid={fehler !== null}
                  aria-describedby={fehler ? "outcome-fehler" : undefined}
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="erwartet" className="mb-1 block text-sm font-medium">
                  Erwartetes Ergebnis{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional, fürs Lern-Log)
                  </span>
                </label>
                <input
                  id="erwartet"
                  type="text"
                  value={erwartet}
                  onChange={(e) => setErwartet(e.target.value)}
                  placeholder="Woran erkennst du in 6 Monaten den Erfolg?"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label htmlFor="dueDate" className="mb-1 block text-sm font-medium">
                  Frist <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              {fehler && (
                <p id="outcome-fehler" role="alert" className="text-sm text-status-rot">
                  {fehler}
                </p>
              )}

              <div className="mt-1 flex justify-end gap-2">
                <Dialog.Close className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">
                  Abbrechen
                </Dialog.Close>
                <button
                  type="submit"
                  className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground hover:opacity-90"
                >
                  Ins Fokus heben
                </button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
