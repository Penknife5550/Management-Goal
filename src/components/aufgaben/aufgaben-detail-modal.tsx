"use client";

// ============================================================
// Detail-Modal einer Aufgabe: Titel, Beschreibung (mehr Textplatz),
// Unteraufgaben-Checkliste, Wichtig/Dringend, WIG, Frist, Zeit und KI.
// Die Karte in der Matrix ist nur noch die Uebersicht; hier passiert alles.
// Textfelder committen onBlur (optimistisch via onPatch), Toggles sofort.
// ============================================================
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { type Quadrant, quadrantMeta } from "@/lib/eisenhower";
import type { TaskDTO } from "@/lib/types";

export interface WigOption {
  id: string;
  titel: string;
}

interface Props {
  task: TaskDTO | null; // null = geschlossen
  wigs: WigOption[];
  kiLaeuft: boolean;
  onClose: () => void;
  onPatch: (id: string, aenderung: Partial<TaskDTO>) => void;
  onLoeschen: (id: string) => void;
  onSubtaskAnlegen: (taskId: string, titel: string) => Promise<void> | void;
  onSubtaskPatch: (subId: string, aenderung: { titel?: string; erledigt?: boolean }) => void;
  onSubtaskLoeschen: (subId: string) => void;
  onKlassifizieren: (id: string) => void;
  onUebernehmen: (id: string) => void;
  onVerwerfen: (id: string) => void;
}

const FELD = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

export function AufgabenDetailModal({
  task,
  wigs,
  kiLaeuft,
  onClose,
  onPatch,
  onLoeschen,
  onSubtaskAnlegen,
  onSubtaskPatch,
  onSubtaskLoeschen,
  onKlassifizieren,
  onUebernehmen,
  onVerwerfen,
}: Props) {
  const [titel, setTitel] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [zeitGeplant, setZeitGeplant] = useState("");
  const [zeitIst, setZeitIst] = useState("");
  const [neueUnter, setNeueUnter] = useState("");

  // Lokale Felder neu aufsetzen, wenn eine andere Aufgabe geoeffnet wird.
  useEffect(() => {
    if (!task) return;
    setTitel(task.titel);
    setBeschreibung(task.beschreibung ?? "");
    setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
    setZeitGeplant(task.zeitGeplantMin?.toString() ?? "");
    setZeitIst(task.zeitIstMin?.toString() ?? "");
    setNeueUnter("");
  }, [task?.id]);

  if (!task) return null;
  const aktiv = task; // ab hier nicht null

  function commitTitel() {
    const t = titel.trim();
    if (t && t !== aktiv.titel) onPatch(aktiv.id, { titel: t });
    else if (!t) setTitel(aktiv.titel); // leer nicht speichern -> zuruecksetzen
  }
  function commitBeschreibung() {
    const b = beschreibung.trim();
    if (b !== (aktiv.beschreibung ?? "")) onPatch(aktiv.id, { beschreibung: b || null });
  }
  function commitDueDate() {
    const alt = aktiv.dueDate ? aktiv.dueDate.slice(0, 10) : "";
    if (dueDate !== alt) onPatch(aktiv.id, { dueDate: dueDate || null });
  }
  function commitZeit(feld: "zeitGeplantMin" | "zeitIstMin", wert: string) {
    const zahl = wert === "" ? null : Math.max(0, Math.round(Number(wert)));
    if (wert !== "" && Number.isNaN(Number(wert))) return;
    if (zahl !== (aktiv[feld] ?? null)) onPatch(aktiv.id, { [feld]: zahl } as Partial<TaskDTO>);
  }
  async function unterHinzufuegen() {
    const t = neueUnter.trim();
    if (!t) return;
    setNeueUnter("");
    await onSubtaskAnlegen(aktiv.id, t);
  }

  const erledigteUnter = aktiv.subtasks.filter((s) => s.erledigt).length;

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-foreground/30" />
        <Dialog.Content className="fixed left-1/2 top-1/2 max-h-[90vh] w-[min(94vw,40rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-card p-5 shadow-lg focus:outline-none">
          <div className="mb-4 flex items-start justify-between gap-3">
            <Dialog.Title className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Aufgabe bearbeiten
            </Dialog.Title>
            <Dialog.Close
              className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              aria-label="Schliessen"
            >
              <X size={18} aria-hidden="true" />
            </Dialog.Close>
          </div>

          {/* Titel */}
          <input
            className={`${FELD} mb-3 text-base font-medium`}
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            onBlur={commitTitel}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            placeholder="Titel der Aufgabe"
            aria-label="Titel"
          />

          {/* Wichtig / Dringend */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Toggle
              aktiv={aktiv.important}
              onClick={() => onPatch(aktiv.id, { important: !aktiv.important })}
              label="Wichtig"
            />
            <Toggle
              aktiv={aktiv.urgent}
              onClick={() => onPatch(aktiv.id, { urgent: !aktiv.urgent })}
              label="Dringend"
            />
            <span
              className={`ml-auto text-xs font-semibold ${quadrantMeta(aktiv.quadrant as Quadrant).akzentText}`}
            >
              {quadrantMeta(aktiv.quadrant as Quadrant).titel} ·{" "}
              {quadrantMeta(aktiv.quadrant as Quadrant).aktion}
            </span>
          </div>

          {/* Beschreibung */}
          <label className="mb-4 block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Beschreibung
            </span>
            <textarea
              className={`${FELD} min-h-28`}
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
              onBlur={commitBeschreibung}
              placeholder="Notizen, Kontext, Details …"
            />
          </label>

          {/* Unteraufgaben */}
          <div className="mb-4">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              Unteraufgaben
              {aktiv.subtasks.length > 0 && ` (${erledigteUnter}/${aktiv.subtasks.length})`}
            </p>
            {aktiv.subtasks.length > 0 && (
              <ul className="mb-2 flex flex-col gap-1">
                {aktiv.subtasks.map((s) => (
                  <li key={s.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSubtaskPatch(s.id, { erledigt: !s.erledigt })}
                      aria-label={s.erledigt ? "Als offen markieren" : "Als erledigt markieren"}
                      aria-pressed={s.erledigt}
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        s.erledigt
                          ? "border-credo-gruen bg-credo-gruen"
                          : "border-input hover:border-accent"
                      }`}
                    >
                      <Check
                        size={11}
                        className={s.erledigt ? "text-white" : "text-transparent"}
                        aria-hidden="true"
                      />
                    </button>
                    <input
                      defaultValue={s.titel}
                      onBlur={(e) => {
                        const t = e.target.value.trim();
                        if (t && t !== s.titel) onSubtaskPatch(s.id, { titel: t });
                        else if (!t) e.target.value = s.titel;
                      }}
                      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                      className={`flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-input focus:border-input focus:outline-none ${
                        s.erledigt ? "text-muted-foreground line-through" : ""
                      }`}
                      aria-label="Unteraufgabe"
                    />
                    <button
                      type="button"
                      onClick={() => onSubtaskLoeschen(s.id)}
                      aria-label={`Unteraufgabe loeschen: ${s.titel}`}
                      className="rounded p-1 text-muted-foreground hover:bg-muted"
                    >
                      <Trash2 size={13} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center gap-2">
              <input
                className={FELD}
                value={neueUnter}
                onChange={(e) => setNeueUnter(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && unterHinzufuegen()}
                placeholder="Unteraufgabe hinzufuegen …"
                aria-label="Neue Unteraufgabe"
              />
              <button
                type="button"
                onClick={unterHinzufuegen}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                <Plus size={15} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* WIG + Frist + Zeit */}
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                WIG (optional)
              </span>
              <select
                className={FELD}
                value={aktiv.goalId ?? ""}
                onChange={(e) => onPatch(aktiv.id, { goalId: e.target.value || null })}
              >
                <option value="">— keine —</option>
                {wigs.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.titel}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Frist</span>
              <input
                type="date"
                className={FELD}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                onBlur={commitDueDate}
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  Zeit geplant (Min)
                </span>
                <input
                  type="number"
                  min={0}
                  className={FELD}
                  value={zeitGeplant}
                  onChange={(e) => setZeitGeplant(e.target.value)}
                  onBlur={() => commitZeit("zeitGeplantMin", zeitGeplant)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  Zeit ist (Min)
                </span>
                <input
                  type="number"
                  min={0}
                  className={FELD}
                  value={zeitIst}
                  onChange={(e) => setZeitIst(e.target.value)}
                  onBlur={() => commitZeit("zeitIstMin", zeitIst)}
                />
              </label>
            </div>
          </div>

          {/* KI */}
          <div className="mb-4 rounded-md border border-border bg-muted/30 p-3">
            <KiBereich
              task={aktiv}
              laeuft={kiLaeuft}
              onKlassifizieren={() => onKlassifizieren(aktiv.id)}
              onUebernehmen={() => onUebernehmen(aktiv.id)}
              onVerwerfen={() => onVerwerfen(aktiv.id)}
            />
          </div>

          {/* Loeschen */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                onLoeschen(aktiv.id);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-status-rot/40 px-3 py-2 text-sm font-medium text-status-rot hover:bg-status-rot/10"
            >
              <Trash2 size={15} aria-hidden="true" />
              Aufgabe loeschen
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Toggle({ aktiv, onClick, label }: { aktiv: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktiv}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        aktiv
          ? "border-accent bg-accent text-accent-foreground"
          : "border-input bg-background text-muted-foreground hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}

// KI-Bereich der Aufgabe: "KI fragen", "denkt…"-Zustand oder der eingetroffene
// Vorschlag mit Uebernehmen/Verwerfen. KI ueberschreibt nie automatisch.
function KiBereich({
  task,
  laeuft,
  onKlassifizieren,
  onUebernehmen,
  onVerwerfen,
}: {
  task: TaskDTO;
  laeuft: boolean;
  onKlassifizieren: () => void;
  onUebernehmen: () => void;
  onVerwerfen: () => void;
}) {
  if (task.aiQuadrantSuggestion == null) {
    if (laeuft) {
      return (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles size={14} className="animate-pulse" aria-hidden="true" />
          KI denkt nach…
        </p>
      );
    }
    return (
      <button
        type="button"
        onClick={onKlassifizieren}
        className="inline-flex items-center gap-1.5 rounded-full border border-input px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
      >
        <Sparkles size={14} aria-hidden="true" />
        KI nach Quadrant fragen
      </button>
    );
  }

  const meta = quadrantMeta(task.aiQuadrantSuggestion as Quadrant);
  const prozent = task.aiConfidence != null ? Math.round(task.aiConfidence * 100) : null;

  if (!task.kiVorschlagOffen) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Sparkles size={14} className="text-credo-gruen" aria-hidden="true" />
          KI stimmt zu{prozent != null && ` (${prozent} %)`}
        </span>
        <button
          type="button"
          onClick={onVerwerfen}
          className="rounded px-1.5 py-0.5 hover:bg-muted"
        >
          OK
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs">
        <Sparkles size={14} className={meta.akzentText} aria-hidden="true" />
        <span>
          KI schlaegt vor: <span className={`font-semibold ${meta.akzentText}`}>{meta.titel}</span>
          {prozent != null && <span className="text-muted-foreground"> ({prozent} %)</span>}
        </span>
      </p>
      {task.aiReasoning && <p className="mt-1 text-xs text-muted-foreground">{task.aiReasoning}</p>}
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onUebernehmen}
          className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-accent-foreground"
        >
          Uebernehmen
        </button>
        <button
          type="button"
          onClick={onVerwerfen}
          className="rounded-md border border-input px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
        >
          Verwerfen
        </button>
      </div>
    </div>
  );
}
