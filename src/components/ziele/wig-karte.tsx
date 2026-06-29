"use client";

import { Archive, CalendarClock, CircleCheck, CornerDownLeft, Link2 } from "lucide-react";
import type { Ampel } from "@/lib/goals";
import { berechneCountdown } from "@/lib/goals";
import type { ZielAktionen, ZielDTO } from "@/lib/types";
import { LeadMeasureListe } from "./lead-measure-liste";

type Props = { ziel: ZielDTO } & ZielAktionen;

const AMPELN: { wert: Ampel; klasse: string; label: string }[] = [
  { wert: "GRUEN", klasse: "bg-status-gruen text-white", label: "Auf Kurs" },
  { wert: "GELB", klasse: "bg-status-gelb text-foreground", label: "Wackelig" },
  { wert: "ROT", klasse: "bg-status-rot text-white", label: "Kritisch" },
];

export function WigKarte({
  ziel,
  onFortschritt,
  onAmpel,
  onErreicht,
  onZurueck,
  onArchiv,
  onLeadAnlegen,
  onLeadIstwert,
  onLeadLoeschen,
}: Props) {
  const countdown = berechneCountdown(ziel.dueDate ? new Date(ziel.dueDate) : null, new Date());
  const countdownKlasse =
    countdown.ton === "ueberfaellig" ? "text-status-rot" : "text-muted-foreground";

  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-2">
        <h3 className="flex-1 text-sm font-medium leading-snug">{ziel.titel}</h3>
        {ziel.abhaengig && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            aria-label="Abhängig von Dritten"
            title="Abhängig von Dritten"
          >
            <Link2 size={12} aria-hidden="true" /> abhängig
          </span>
        )}
      </div>

      {ziel.outcome && (
        <p className="mt-1 text-xs text-muted-foreground">
          <span className="font-medium">Outcome:</span> {ziel.outcome}
        </p>
      )}

      {/* Ampel-Auswahl */}
      <div className="mt-3 flex gap-1.5" role="group" aria-label="Status-Ampel">
        {AMPELN.map((a) => {
          const aktiv = ziel.ampel === a.wert;
          return (
            <button
              key={a.wert}
              type="button"
              onClick={() => onAmpel(ziel.id, a.wert)}
              aria-pressed={aktiv}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                aktiv ? a.klasse : "bg-muted text-muted-foreground hover:bg-border"
              }`}
            >
              {a.label}
            </button>
          );
        })}
      </div>

      {/* Fortschritt (Lag) */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <label htmlFor={`fortschritt-${ziel.id}`}>Fortschritt</label>
          <span className="font-medium tabular-nums text-foreground">{ziel.fortschritt}%</span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={ziel.fortschritt}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Fortschritt: ${ziel.fortschritt}%`}
        >
          <div
            className="h-full rounded-full bg-status-gruen transition-all"
            style={{ width: `${ziel.fortschritt}%` }}
            aria-hidden="true"
          />
        </div>
        <input
          id={`fortschritt-${ziel.id}`}
          type="range"
          min={0}
          max={100}
          step={5}
          value={ziel.fortschritt}
          onChange={(e) => onFortschritt(ziel.id, Math.round(Number(e.target.value)))}
          className="mt-1 w-full accent-[var(--color-accent)]"
          aria-label={`Fortschritt von ${ziel.titel} in Prozent`}
        />
      </div>

      {/* Countdown als Pacing (keine Drohuhr) */}
      <p className={`mt-2 inline-flex items-center gap-1 text-xs ${countdownKlasse}`}>
        <CalendarClock size={13} aria-hidden="true" /> {countdown.text}
      </p>

      <LeadMeasureListe
        leadMeasures={ziel.leadMeasures}
        onAnlegen={(b, z) => onLeadAnlegen(ziel.id, b, z)}
        onIstwert={(id, wert) => onLeadIstwert(ziel.id, id, wert)}
        onLoeschen={(id) => onLeadLoeschen(ziel.id, id)}
      />

      {/* Aktionen */}
      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={() => onErreicht(ziel.id)}
          className="inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1.5 text-xs text-accent-foreground hover:opacity-90"
        >
          <CircleCheck size={14} aria-hidden="true" /> Als erreicht abschließen
        </button>
        <button
          type="button"
          onClick={() => onZurueck(ziel.id)}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground hover:bg-muted"
        >
          <CornerDownLeft size={14} aria-hidden="true" /> Zurück ins Backlog
        </button>
        <button
          type="button"
          onClick={() => onArchiv(ziel.id)}
          aria-label={`Ziel archivieren: ${ziel.titel}`}
          className="ml-auto inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted"
        >
          <Archive size={14} aria-hidden="true" /> Archivieren
        </button>
      </div>
    </article>
  );
}
