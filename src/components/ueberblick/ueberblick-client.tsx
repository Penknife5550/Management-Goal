"use client";

import { AlertCircle, AlertTriangle, Target, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { senden } from "@/lib/client";
import { AMPEL_META } from "@/lib/goals";
import type { TagesTon } from "@/lib/heute";
import type { NutzerUeberblick, UeberblickDTO } from "@/lib/ueberblick";

// Ton des Tagesurteils -> Badge-Klasse + Label (CREDO-Status-Theme).
const TON_META: Record<TagesTon, { label: string; klasse: string }> = {
  gruen: { label: "Auf Kurs", klasse: "bg-status-gruen-text text-white" },
  gelb: { label: "Wackelig", klasse: "bg-status-gelb text-foreground" },
  rot: { label: "Kritisch", klasse: "bg-status-rot text-white" },
  leer: { label: "Kein Fokus", klasse: "bg-muted text-muted-foreground" },
};

export function UeberblickClient() {
  const [daten, setDaten] = useState<UeberblickDTO | null>(null);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    senden<UeberblickDTO>("/api/ueberblick", "GET")
      .then(setDaten)
      .catch((e: Error) => setFehler(e.message))
      .finally(() => setLaedt(false));
  }, []);

  if (laedt) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true" aria-label="Überblick wird geladen">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (fehler) {
    return (
      <div
        role="alert"
        className="flex items-center gap-2 rounded-lg border border-status-rot/40 bg-status-rot/10 px-4 py-3 text-sm"
      >
        <AlertCircle size={18} className="text-status-rot" aria-hidden="true" />
        <span>{fehler}</span>
      </div>
    );
  }
  if (!daten) return null;

  const { rollup, nutzer } = daten;

  return (
    <div className="flex flex-col gap-6">
      {/* Roll-up */}
      <section
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        aria-label="Zusammenfassung Rechtseinheit"
      >
        <Kennzahl label="Personen" wert={rollup.anzahlNutzer} icon={<Users size={16} />} />
        <Kennzahl label="Fokus-Ziele" wert={rollup.anzahlWigs} icon={<Target size={16} />} />
        <Kennzahl label="Kritisch" wert={rollup.kritisch} farbe="text-status-rot" />
        <Kennzahl label="Auf Kurs" wert={rollup.aufKurs} farbe="text-status-gruen-text" />
      </section>

      {/* Personen */}
      {nutzer.length === 0 ? (
        <p className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Keine aktiven Personen in deiner Rechtseinheit.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {nutzer.map((n) => (
            <NutzerKarte key={n.id} nutzer={n} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Kennzahl({
  label,
  wert,
  farbe = "text-foreground",
  icon,
}: {
  label: string;
  wert: number;
  farbe?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${farbe}`}>{wert}</p>
    </div>
  );
}

function NutzerKarte({ nutzer }: { nutzer: NutzerUeberblick }) {
  const ton = TON_META[nutzer.urteilTon];
  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">{nutzer.name}</h3>
          {nutzer.anzahlWarnungen > 0 && (
            <span
              className="inline-flex items-center gap-1 text-xs text-status-rot"
              title={`${nutzer.anzahlWarnungen} Warnung(en)`}
            >
              <AlertTriangle size={13} aria-hidden="true" /> {nutzer.anzahlWarnungen}
            </span>
          )}
        </div>
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ton.klasse}`}
        >
          {ton.label}
        </span>
      </div>

      {nutzer.wigs.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">Keine Fokus-Ziele.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {nutzer.wigs.map((w) => {
            const ampel = AMPEL_META.find((a) => a.wert === w.ampel);
            return (
              <li key={w.id} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{w.titel}</p>
                  <div
                    className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuenow={w.fortschritt}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Fortschritt ${w.titel}: ${w.fortschritt}%`}
                  >
                    <div
                      className="h-full rounded-full bg-status-gruen"
                      style={{ width: `${w.fortschritt}%` }}
                      aria-hidden="true"
                    />
                  </div>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {w.fortschritt}%
                </span>
                {ampel && (
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${ampel.klasse}`}
                  >
                    {ampel.label}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
