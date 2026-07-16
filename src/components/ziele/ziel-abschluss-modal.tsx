"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useState } from "react";
import type { ZielDTO } from "@/lib/types";

interface Props {
  ziel: ZielDTO | null; // null = geschlossen
  onAbbrechen: () => void;
  onBestaetigen: (tatsaechlich: string) => void;
}

// Feedback-Analyse (Drucker): beim Abschluss das tatsaechliche Ergebnis dem
// urspruenglich Erwarteten gegenueberstellen - so entsteht Lernen statt nur Haken.
export function ZielAbschlussModal({ ziel, onAbbrechen, onBestaetigen }: Props) {
  const [tatsaechlich, setTatsaechlich] = useState("");
  const offen = ziel !== null;
  const erwartet = ziel?.learningLog?.erwartet?.trim();

  function absenden(event: React.FormEvent) {
    event.preventDefault();
    onBestaetigen(tatsaechlich.trim());
    setTatsaechlich("");
  }

  return (
    <Dialog.Root
      open={offen}
      onOpenChange={(o) => {
        if (!o) {
          setTatsaechlich("");
          onAbbrechen();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-foreground/30" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(92vw,30rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-5 shadow-lg focus:outline-none">
          <div className="mb-3 flex items-start justify-between gap-3">
            <Dialog.Title className="text-base font-medium">Ziel abschließen</Dialog.Title>
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

          <form onSubmit={absenden} className="flex flex-col gap-3">
            {erwartet && (
              <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                <span className="font-medium">Damals erwartet:</span>{" "}
                <span className="text-muted-foreground">{erwartet}</span>
              </div>
            )}

            <div>
              <label htmlFor="tatsaechlich" className="mb-1 block text-sm font-medium">
                Was ist tatsächlich eingetreten?{" "}
                <span className="font-normal text-muted-foreground">(optional, fürs Lernen)</span>
              </label>
              <textarea
                id="tatsaechlich"
                value={tatsaechlich}
                onChange={(e) => setTatsaechlich(e.target.value)}
                placeholder={
                  erwartet
                    ? "Passte es zur Erwartung? Was war anders – und was nimmst du mit?"
                    : "Was ist herausgekommen? Was nimmst du fürs nächste Ziel mit?"
                }
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                autoFocus
              />
            </div>

            <div className="mt-1 flex justify-end gap-2">
              <Dialog.Close className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">
                Abbrechen
              </Dialog.Close>
              <button
                type="submit"
                className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground hover:opacity-90"
              >
                Abschließen
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
