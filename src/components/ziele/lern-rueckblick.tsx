"use client";

import { GraduationCap } from "lucide-react";
import type { ZielDTO } from "@/lib/types";

interface Props {
  ziele: ZielDTO[]; // abgeschlossene Ziele mit ausgefuelltem tatsaechlich
}

// Feedback-Analyse (Drucker): erwartet vs. tatsaechlich der abgeschlossenen
// Ziele nebeneinander - der eigentliche Lern-Effekt strategischer Arbeit.
export function LernRueckblick({ ziele }: Props) {
  if (ziele.length === 0) return null;

  return (
    <section aria-labelledby="rueckblick-titel">
      <div className="mb-3 flex items-center gap-2">
        <GraduationCap size={18} className="text-accent" aria-hidden="true" />
        <h2 id="rueckblick-titel" className="text-base font-medium">
          Lern-Rückblick
        </h2>
        <span className="text-sm text-muted-foreground">{ziele.length} abgeschlossen</span>
      </div>

      <ul className="flex flex-col gap-2">
        {ziele.map((z) => (
          <li key={z.id} className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-medium">{z.titel}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div className="rounded-md bg-muted/40 p-2.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Erwartet
                </p>
                <p className="mt-0.5 text-sm">
                  {z.learningLog?.erwartet?.trim() || (
                    <span className="text-muted-foreground">— nichts festgehalten</span>
                  )}
                </p>
              </div>
              <div className="rounded-md bg-status-gruen/10 p-2.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Tatsächlich
                </p>
                <p className="mt-0.5 text-sm">
                  {z.learningLog?.tatsaechlich?.trim() || (
                    <span className="text-muted-foreground">— nichts festgehalten</span>
                  )}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
