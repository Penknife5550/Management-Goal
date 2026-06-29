"use client";

import { AlertCircle, PartyPopper, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { senden } from "@/lib/client";
import { WIG_LIMIT } from "@/lib/constants";
import type { Ampel } from "@/lib/goals";
import type { ZielDTO } from "@/lib/types";
import { WigScoreboard } from "./wig-scoreboard";
import { ZielAufFokusModal } from "./ziel-auf-fokus-modal";
import { ZielBacklogListe } from "./ziel-backlog-liste";
import { ZielQuickAdd } from "./ziel-quick-add";
import { ZieleEmptyState } from "./ziele-empty-state";

const FEIER_DAUER_MS = 8000;

export function ZieleClient() {
  const [ziele, setZiele] = useState<ZielDTO[]>([]);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);
  const [modalZiel, setModalZiel] = useState<ZielDTO | null>(null);
  const [feier, setFeier] = useState<string | null>(null);

  useEffect(() => {
    senden<ZielDTO[]>("/api/goals", "GET")
      .then(setZiele)
      .catch((e: Error) => setFehler(e.message))
      .finally(() => setLaedt(false));
  }, []);

  // Feier-Meldung nach einer Weile automatisch ausblenden (mit Cleanup).
  useEffect(() => {
    if (!feier) return;
    const t = window.setTimeout(() => setFeier(null), FEIER_DAUER_MS);
    return () => window.clearTimeout(t);
  }, [feier]);

  const fokusZiele = ziele.filter((z) => z.status === "FOKUS");
  const backlogZiele = ziele.filter((z) => z.status === "BACKLOG");
  const limitErreicht = fokusZiele.length >= WIG_LIMIT;

  // Lade den Serverstand neu (sauberer Rollback statt Stale-Snapshot).
  async function ladeNeu() {
    try {
      setZiele(await senden<ZielDTO[]>("/api/goals", "GET"));
    } catch {
      // Sekundaerfehler bewusst ignorieren - die Primaermeldung steht bereits.
    }
  }

  // Optimistisches Update; bei Fehler Meldung + Resync vom Server.
  async function mutiere(updater: (z: ZielDTO[]) => ZielDTO[], aufruf: () => Promise<unknown>) {
    setFehler(null);
    setZiele((prev) => updater(prev));
    try {
      await aufruf();
    } catch (e) {
      setFehler((e as Error).message);
      await ladeNeu();
    }
  }

  async function onAnlegen(titel: string) {
    const tempId = `temp-${crypto.randomUUID()}`;
    const temp: ZielDTO = {
      id: tempId,
      titel,
      outcome: null,
      status: "BACKLOG",
      ampel: "GELB",
      fortschritt: 0,
      dueDate: null,
      abhaengig: false,
      lastCheckinAt: null,
      leadMeasures: [],
      createdAt: new Date().toISOString(),
    };
    setFehler(null);
    setZiele((prev) => [temp, ...prev]);
    try {
      const neu = await senden<ZielDTO>("/api/goals", "POST", { titel });
      setZiele((prev) => prev.map((z) => (z.id === tempId ? neu : z)));
    } catch (e) {
      setFehler((e as Error).message);
      setZiele((prev) => prev.filter((z) => z.id !== tempId));
    }
  }

  async function onFokusBestaetigen(outcome: string, erwartet: string, dueDate: string | null) {
    const ziel = modalZiel;
    setModalZiel(null);
    if (!ziel) return;
    await mutiere(
      (prev) =>
        prev.map((z) => (z.id === ziel.id ? { ...z, status: "FOKUS", outcome, dueDate } : z)),
      () =>
        senden(`/api/goals/${ziel.id}`, "PATCH", {
          status: "FOKUS",
          outcome,
          dueDate,
          ...(erwartet ? { erwartet } : {}),
        }),
    );
  }

  async function onErreicht(id: string) {
    const titel = ziele.find((z) => z.id === id)?.titel ?? "Ziel";
    setFehler(null);
    setZiele((prev) =>
      prev.map((z) => (z.id === id ? { ...z, status: "ERREICHT", fortschritt: 100 } : z)),
    );
    try {
      await senden(`/api/goals/${id}`, "PATCH", { status: "ERREICHT", fortschritt: 100 });
      setFeier(`Geschafft: „${titel}“ ist erreicht.`);
    } catch (e) {
      setFehler((e as Error).message);
      await ladeNeu();
    }
  }

  function onZurueck(id: string) {
    void mutiere(
      (prev) => prev.map((z) => (z.id === id ? { ...z, status: "BACKLOG" } : z)),
      () => senden(`/api/goals/${id}`, "PATCH", { status: "BACKLOG" }),
    );
  }

  function onArchiv(id: string) {
    void mutiere(
      (prev) => prev.filter((z) => z.id !== id),
      () => senden(`/api/goals/${id}`, "DELETE"),
    );
  }

  function onFortschritt(id: string, fortschritt: number) {
    void mutiere(
      (prev) => prev.map((z) => (z.id === id ? { ...z, fortschritt } : z)),
      () => senden(`/api/goals/${id}`, "PATCH", { fortschritt }),
    );
  }

  function onAmpel(id: string, ampel: Ampel) {
    void mutiere(
      (prev) => prev.map((z) => (z.id === id ? { ...z, ampel } : z)),
      () => senden(`/api/goals/${id}`, "PATCH", { ampel }),
    );
  }

  async function onLeadAnlegen(zielId: string, beschreibung: string, zielwert: number) {
    const tempId = `temp-lm-${crypto.randomUUID()}`;
    setFehler(null);
    setZiele((prev) =>
      prev.map((z) =>
        z.id === zielId
          ? {
              ...z,
              leadMeasures: [...z.leadMeasures, { id: tempId, beschreibung, zielwert, istwert: 0 }],
            }
          : z,
      ),
    );
    try {
      const neu = await senden<{
        id: string;
        beschreibung: string;
        zielwert: number;
        istwert: number;
      }>(`/api/goals/${zielId}/lead-measures`, "POST", { beschreibung, zielwert });
      setZiele((prev) =>
        prev.map((z) =>
          z.id === zielId
            ? { ...z, leadMeasures: z.leadMeasures.map((lm) => (lm.id === tempId ? neu : lm)) }
            : z,
        ),
      );
    } catch (e) {
      setFehler((e as Error).message);
      setZiele((prev) =>
        prev.map((z) =>
          z.id === zielId
            ? { ...z, leadMeasures: z.leadMeasures.filter((lm) => lm.id !== tempId) }
            : z,
        ),
      );
    }
  }

  function onLeadIstwert(zielId: string, leadId: string, istwert: number) {
    void mutiere(
      (prev) =>
        prev.map((z) =>
          z.id === zielId
            ? {
                ...z,
                leadMeasures: z.leadMeasures.map((lm) =>
                  lm.id === leadId ? { ...lm, istwert } : lm,
                ),
              }
            : z,
        ),
      () => senden(`/api/lead-measures/${leadId}`, "PATCH", { istwert }),
    );
  }

  function onLeadLoeschen(zielId: string, leadId: string) {
    void mutiere(
      (prev) =>
        prev.map((z) =>
          z.id === zielId
            ? { ...z, leadMeasures: z.leadMeasures.filter((lm) => lm.id !== leadId) }
            : z,
        ),
      () => senden(`/api/lead-measures/${leadId}`, "DELETE"),
    );
  }

  const aktionen = {
    onFortschritt,
    onAmpel,
    onErreicht,
    onZurueck,
    onArchiv,
    onLeadAnlegen,
    onLeadIstwert,
    onLeadLoeschen,
  };

  if (laedt) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true" aria-label="Ziele werden geladen">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {feier && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-status-gruen/40 bg-status-gruen/10 px-4 py-3 text-sm"
        >
          <PartyPopper size={18} className="text-status-gruen-text" aria-hidden="true" />
          <span className="flex-1">{feier}</span>
          <button
            type="button"
            onClick={() => setFeier(null)}
            aria-label="Meldung schließen"
            className="rounded-md p-1 hover:bg-muted"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {fehler && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-status-rot/40 bg-status-rot/10 px-4 py-3 text-sm"
        >
          <AlertCircle size={18} className="text-status-rot" aria-hidden="true" />
          <span className="flex-1">{fehler}</span>
          <button
            type="button"
            onClick={() => setFehler(null)}
            aria-label="Meldung schließen"
            className="rounded-md p-1 hover:bg-muted"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      <ZielQuickAdd onAnlegen={onAnlegen} />

      {ziele.length === 0 ? (
        <ZieleEmptyState onBeispielUebernehmen={onAnlegen} />
      ) : (
        <>
          <WigScoreboard fokusZiele={fokusZiele} {...aktionen} />
          <ZielBacklogListe
            backlogZiele={backlogZiele}
            onFokusOeffnen={setModalZiel}
            onArchiv={onArchiv}
          />
        </>
      )}

      <ZielAufFokusModal
        ziel={modalZiel}
        limitErreicht={limitErreicht}
        onAbbrechen={() => setModalZiel(null)}
        onBestaetigen={onFokusBestaetigen}
      />
    </div>
  );
}
