"use client";

// ============================================================
// Gefuehrter Wochen-Check-in: WIG fuer WIG Ampel/Fortschritt/Lead-Istwerte
// pruefen und aktualisieren. Schreibt am Ende lastCheckinAt + History-Snapshot.
// ============================================================
import { ArrowLeft, ArrowRight, CheckCircle2, Minus, PartyPopper, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { senden } from "@/lib/client";
import { AMPEL_META, type Ampel } from "@/lib/goals";
import type { ZielDTO } from "@/lib/types";

interface LeadEdit {
  id: string;
  beschreibung: string;
  zielwert: number;
  istwert: number;
}
interface WigEdit {
  goalId: string;
  titel: string;
  outcome: string | null;
  ampel: Ampel;
  fortschritt: number;
  leads: LeadEdit[];
}

// Small-Win je WIG (vom Server berechnet: Delta dieses Check-ins).
interface WigWin {
  titel: string;
  fortschrittDelta: number;
  ampelVerbessert: boolean;
  leadsErfuellt: string[];
  hatFortschritt: boolean;
}

function ausDTO(z: ZielDTO): WigEdit {
  return {
    goalId: z.id,
    titel: z.titel,
    outcome: z.outcome,
    ampel: z.ampel,
    fortschritt: z.fortschritt,
    leads: z.leadMeasures.map((l) => ({
      id: l.id,
      beschreibung: l.beschreibung,
      zielwert: l.zielwert,
      istwert: l.istwert,
    })),
  };
}

export function CheckInClient() {
  const [wigs, setWigs] = useState<WigEdit[] | null>(null);
  const [schritt, setSchritt] = useState(0);
  const [fehler, setFehler] = useState<string | null>(null);
  const [speichert, setSpeichert] = useState(false);
  const [wins, setWins] = useState<WigWin[] | null>(null);

  useEffect(() => {
    senden<ZielDTO[]>("/api/goals", "GET")
      .then((ziele) => setWigs(ziele.filter((z) => z.status === "FOKUS").map(ausDTO)))
      .catch((e: Error) => setFehler(e.message));
  }, []);

  function aktualisiereAktuelle(patch: Partial<WigEdit>) {
    setWigs((ws) => ws?.map((w, i) => (i === schritt ? { ...w, ...patch } : w)) ?? ws);
  }

  function setLeadIstwert(leadId: string, istwert: number) {
    setWigs(
      (ws) =>
        ws?.map((w, i) =>
          i === schritt
            ? { ...w, leads: w.leads.map((l) => (l.id === leadId ? { ...l, istwert } : l)) }
            : w,
        ) ?? ws,
    );
  }

  async function abschliessen() {
    if (!wigs) return;
    setSpeichert(true);
    setFehler(null);
    try {
      const res = await senden<{ wins: WigWin[] }>("/api/check-in", "POST", {
        items: wigs.map((w) => ({
          goalId: w.goalId,
          ampel: w.ampel,
          fortschritt: w.fortschritt,
          leads: w.leads.map((l) => ({ id: l.id, istwert: l.istwert })),
        })),
      });
      setWins(res.wins);
    } catch (e) {
      setFehler((e as Error).message);
    } finally {
      setSpeichert(false);
    }
  }

  if (fehler && !wigs) return <p className="text-sm text-credo-rot">{fehler}</p>;
  if (!wigs) return <Skeleton className="h-72 w-full" />;

  // Abschluss-Moment (Peak-End) mit Small-Wins / Progress-Feedback (Amabile).
  if (wins) {
    const echteWins = wins.filter((w) => w.hatFortschritt);
    const gefeiert = echteWins.length > 0;
    return (
      <div
        className={`rounded-lg border p-8 text-center ${
          gefeiert ? "border-status-gruen bg-status-gruen/10" : "border-border bg-muted/40"
        }`}
      >
        {gefeiert ? (
          <PartyPopper className="mx-auto h-10 w-10 text-status-gruen-text" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
        )}
        <h2 className="mt-3 text-lg font-medium">Check-in abgeschlossen</h2>

        {gefeiert ? (
          <>
            <p className="mt-1 text-sm text-muted-foreground">Diese Woche geschafft:</p>
            <ul className="mx-auto mt-3 max-w-sm space-y-2 text-left">
              {echteWins.map((w) => (
                <li key={w.titel} className="rounded-md bg-card px-3 py-2">
                  <p className="text-sm font-medium leading-snug">{w.titel}</p>
                  <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-status-gruen-text">
                    {w.fortschrittDelta > 0 && <span>+{w.fortschrittDelta}% Fortschritt</span>}
                    {w.ampelVerbessert && <span>Ampel verbessert</span>}
                    {w.leadsErfuellt.map((b) => (
                      <span key={b}>Lead „{b}“ erfüllt</span>
                    ))}
                  </p>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Kein neuer Fortschritt diese Woche – auch Dranbleiben zählt. Nächste Woche wieder.
          </p>
        )}

        <Link
          href="/ziele"
          className="mt-5 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
        >
          Zurück zum Cockpit
        </Link>
      </div>
    );
  }

  // Keine aktiven WIGs
  if (wigs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/40 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Keine aktiven WIGs im Fokus. Hol dir im Cockpit 1–3 wirklich wichtige Ziele nach oben –
          dann führt dich der Check-in durch.
        </p>
        <Link
          href="/ziele"
          className="mt-4 inline-block rounded-lg border border-input px-4 py-2 text-sm font-medium"
        >
          Zum Cockpit
        </Link>
      </div>
    );
  }

  const w = wigs[schritt]!;
  const istLetzte = schritt === wigs.length - 1;

  return (
    <div>
      {/* Fortschritt durch die WIGs */}
      <div
        className="mb-4 flex items-center gap-2"
        aria-label={`WIG ${schritt + 1} von ${wigs.length}`}
      >
        {wigs.map((_, i) => (
          <span
            key={i}
            aria-hidden="true"
            className={`h-1.5 flex-1 rounded-full ${i <= schritt ? "bg-accent" : "bg-muted"}`}
          />
        ))}
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        WIG {schritt + 1} von {wigs.length}
      </p>

      <article className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-base font-medium leading-snug">{w.titel}</h2>
        {w.outcome && (
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-medium">Outcome:</span> {w.outcome}
          </p>
        )}

        {/* Ampel */}
        <div className="mt-4">
          <p className="mb-1.5 text-sm font-medium">Wie steht die WIG?</p>
          <div className="flex gap-1.5" role="group" aria-label="Status-Ampel">
            {AMPEL_META.map((a) => {
              const aktiv = w.ampel === a.wert;
              return (
                <button
                  key={a.wert}
                  type="button"
                  onClick={() => aktualisiereAktuelle({ ampel: a.wert })}
                  aria-pressed={aktiv}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    aktiv ? a.klasse : "bg-muted text-muted-foreground hover:bg-border"
                  }`}
                >
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Fortschritt */}
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-sm">
            <label htmlFor="checkin-fortschritt" className="font-medium">
              Fortschritt
            </label>
            <span className="font-medium tabular-nums">{w.fortschritt}%</span>
          </div>
          <input
            id="checkin-fortschritt"
            type="range"
            min={0}
            max={100}
            step={5}
            value={w.fortschritt}
            onChange={(e) =>
              aktualisiereAktuelle({ fortschritt: Math.round(Number(e.target.value)) })
            }
            className="w-full accent-[var(--color-accent)]"
            aria-label={`Fortschritt von ${w.titel} in Prozent`}
          />
        </div>

        {/* Lead Measures */}
        <div className="mt-4">
          <p className="mb-1.5 text-sm font-medium">Lead Measures (Hebel)</p>
          {w.leads.length === 0 ? (
            <p className="text-xs text-muted-foreground">Keine Frühindikatoren für diese WIG.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {w.leads.map((l) => {
                const erfuellt = l.istwert >= l.zielwert;
                return (
                  <li key={l.id} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 truncate" title={l.beschreibung}>
                      {l.beschreibung}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLeadIstwert(l.id, Math.max(l.istwert - 1, 0))}
                      disabled={l.istwert <= 0}
                      aria-label={`Verringern: ${l.beschreibung}`}
                      className="rounded-md border border-border px-1.5 py-0.5 text-accent hover:bg-muted disabled:opacity-40"
                    >
                      <Minus size={14} aria-hidden="true" />
                    </button>
                    <span
                      className={`w-10 text-center text-xs tabular-nums ${erfuellt ? "text-status-gruen-text" : "text-muted-foreground"}`}
                    >
                      {l.istwert}/{l.zielwert}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLeadIstwert(l.id, Math.min(l.istwert + 1, l.zielwert))}
                      disabled={erfuellt}
                      aria-label={`Erhöhen: ${l.beschreibung}`}
                      className="rounded-md border border-border px-1.5 py-0.5 text-accent hover:bg-muted disabled:opacity-40"
                    >
                      <Plus size={14} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </article>

      {fehler && <p className="mt-3 text-sm text-credo-rot">{fehler}</p>}

      {/* Navigation */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setSchritt((s) => Math.max(s - 1, 0))}
          disabled={schritt === 0}
          className="inline-flex items-center gap-1 rounded-lg border border-input px-4 py-2 text-sm font-medium disabled:opacity-40"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Zurück
        </button>

        {istLetzte ? (
          <button
            type="button"
            onClick={abschliessen}
            disabled={speichert}
            className="inline-flex items-center gap-1 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
          >
            <CheckCircle2 size={16} aria-hidden="true" />
            {speichert ? "Speichert…" : "Check-in abschließen"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setSchritt((s) => Math.min(s + 1, wigs.length - 1))}
            className="inline-flex items-center gap-1 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
          >
            Weiter <ArrowRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
