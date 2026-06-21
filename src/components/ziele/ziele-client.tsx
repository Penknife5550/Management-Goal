"use client";

import { AlertCircle, PartyPopper, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { senden } from "@/lib/client";
import { WIG_LIMIT } from "@/lib/constants";
import type { Ampel } from "@/lib/goals";
import type { LeadMeasureDTO, ZielDTO } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { WigScoreboard } from "./wig-scoreboard";
import { ZielAufFokusModal } from "./ziel-auf-fokus-modal";
import { ZielBacklogListe } from "./ziel-backlog-liste";
import { ZielQuickAdd } from "./ziel-quick-add";
import { ZieleEmptyState } from "./ziele-empty-state";

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

  const fokusZiele = ziele.filter((z) => z.status === "FOKUS");
  const backlogZiele = ziele.filter((z) => z.status === "BACKLOG");
  const limitErreicht = fokusZiele.length >= WIG_LIMIT;

  // Optimistisches Update mit Rollback bei Fehler.
  const optimistisch = useCallback(
    async (naechster: ZielDTO[], aufruf: () => Promise<unknown>, vorher: ZielDTO[]) => {
      setZiele(naechster);
      setFehler(null);
      try {
        await aufruf();
      } catch (e) {
        setZiele(vorher);
        setFehler((e as Error).message);
      }
    },
    [],
  );

  function aktualisiereZiel(id: string, teil: Partial<ZielDTO>): ZielDTO[] {
    return ziele.map((z) => (z.id === id ? { ...z, ...teil } : z));
  }

  function onAnlegen(titel: string) {
    const tempId = `temp-${Date.now()}`;
    const temp: ZielDTO = {
      id: tempId,
      titel,
      outcome: null,
      status: "BACKLOG",
      ampel: "GELB",
      fortschritt: 0,
      dueDate: null,
      abhaengig: false,
      leadMeasures: [],
      createdAt: new Date().toISOString(),
    };
    const vorher = ziele;
    setZiele([temp, ...vorher]);
    setFehler(null);
    senden<ZielDTO>("/api/goals", "POST", { titel })
      .then((neu) => setZiele((akt) => akt.map((z) => (z.id === tempId ? neu : z))))
      .catch((e: Error) => {
        setZiele(vorher);
        setFehler(e.message);
      });
  }

  function onFokusBestaetigen(outcome: string, erwartet: string, dueDate: string | null) {
    const ziel = modalZiel;
    setModalZiel(null);
    if (!ziel) return;
    const naechster = aktualisiereZiel(ziel.id, { status: "FOKUS", outcome, dueDate });
    void optimistisch(
      naechster,
      () =>
        senden<ZielDTO>(`/api/goals/${ziel.id}`, "PATCH", {
          status: "FOKUS",
          outcome,
          dueDate,
          ...(erwartet ? { erwartet } : {}),
        }),
      ziele,
    );
  }

  function onErreicht(id: string) {
    const ziel = ziele.find((z) => z.id === id);
    void optimistisch(
      aktualisiereZiel(id, { status: "ERREICHT", fortschritt: 100 }),
      () => senden(`/api/goals/${id}`, "PATCH", { status: "ERREICHT", fortschritt: 100 }),
      ziele,
    );
    setFeier(`Geschafft: „${ziel?.titel ?? "Ziel"}“ ist erreicht.`);
    window.setTimeout(() => setFeier(null), 5000);
  }

  function onZurueck(id: string) {
    void optimistisch(
      aktualisiereZiel(id, { status: "BACKLOG" }),
      () => senden(`/api/goals/${id}`, "PATCH", { status: "BACKLOG" }),
      ziele,
    );
  }

  function onArchiv(id: string) {
    void optimistisch(
      ziele.filter((z) => z.id !== id),
      () => senden(`/api/goals/${id}`, "DELETE"),
      ziele,
    );
  }

  function onFortschritt(id: string, fortschritt: number) {
    void optimistisch(
      aktualisiereZiel(id, { fortschritt }),
      () => senden(`/api/goals/${id}`, "PATCH", { fortschritt }),
      ziele,
    );
  }

  function onAmpel(id: string, ampel: Ampel) {
    void optimistisch(
      aktualisiereZiel(id, { ampel }),
      () => senden(`/api/goals/${id}`, "PATCH", { ampel }),
      ziele,
    );
  }

  function setzeLeadMeasures(zielId: string, leads: LeadMeasureDTO[]): ZielDTO[] {
    return ziele.map((z) => (z.id === zielId ? { ...z, leadMeasures: leads } : z));
  }

  function onLeadAnlegen(zielId: string, beschreibung: string, zielwert: number) {
    const ziel = ziele.find((z) => z.id === zielId);
    if (!ziel) return;
    const tempId = `temp-lm-${Date.now()}`;
    const temp: LeadMeasureDTO = { id: tempId, beschreibung, zielwert, istwert: 0 };
    const vorher = ziele;
    setZiele(setzeLeadMeasures(zielId, [...ziel.leadMeasures, temp]));
    setFehler(null);
    senden<LeadMeasureDTO>(`/api/goals/${zielId}/lead-measures`, "POST", { beschreibung, zielwert })
      .then((neu) =>
        setZiele((akt) =>
          akt.map((z) =>
            z.id === zielId
              ? { ...z, leadMeasures: z.leadMeasures.map((lm) => (lm.id === tempId ? neu : lm)) }
              : z,
          ),
        ),
      )
      .catch((e: Error) => {
        setZiele(vorher);
        setFehler(e.message);
      });
  }

  function onLeadIstwert(zielId: string, leadId: string, istwert: number) {
    const ziel = ziele.find((z) => z.id === zielId);
    if (!ziel) return;
    const leads = ziel.leadMeasures.map((lm) => (lm.id === leadId ? { ...lm, istwert } : lm));
    void optimistisch(
      setzeLeadMeasures(zielId, leads),
      () => senden(`/api/lead-measures/${leadId}`, "PATCH", { istwert }),
      ziele,
    );
  }

  function onLeadLoeschen(zielId: string, leadId: string) {
    const ziel = ziele.find((z) => z.id === zielId);
    if (!ziel) return;
    const leads = ziel.leadMeasures.filter((lm) => lm.id !== leadId);
    void optimistisch(
      setzeLeadMeasures(zielId, leads),
      () => senden(`/api/lead-measures/${leadId}`, "DELETE"),
      ziele,
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
          <PartyPopper size={18} className="text-status-gruen" aria-hidden="true" />
          <span>{feier}</span>
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
