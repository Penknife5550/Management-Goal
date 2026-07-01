"use client";

// ============================================================
// Aufgaben / Eisenhower-Matrix: Aufgaben nach wichtig x dringend einsortieren.
// Anlegen, Quadrant wechseln (Wichtig/Dringend-Toggle), erledigen, loeschen.
// Kein Drag-and-Drop (kein neuer Tech-Stack) – Toggles sind tastatur-zugaenglich.
// KI-Quadranten-Vorschlag folgt in Schritt 5 (DTO-Felder sind bereits da).
// ============================================================
import { Check, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { senden } from "@/lib/client";
import { berechneQuadrant, EISENHOWER_QUADRANTEN, type Quadrant } from "@/lib/eisenhower";
import type { TaskDTO, ZielDTO } from "@/lib/types";

const INPUT = "rounded-lg border border-input bg-background px-3 py-2 text-sm";

interface WigOption {
  id: string;
  titel: string;
}

const LEER = { titel: "", important: false, urgent: false, goalId: "" };

export function AufgabenClient() {
  const [tasks, setTasks] = useState<TaskDTO[] | null>(null);
  const [wigs, setWigs] = useState<WigOption[]>([]);
  const [form, setForm] = useState({ ...LEER });
  const [fehler, setFehler] = useState<string | null>(null);
  const [speichert, setSpeichert] = useState(false);

  useEffect(() => {
    senden<TaskDTO[]>("/api/tasks", "GET")
      .then(setTasks)
      .catch((e: Error) => setFehler(e.message));
    senden<ZielDTO[]>("/api/goals", "GET")
      .then((z) =>
        setWigs(z.filter((g) => g.status === "FOKUS").map((g) => ({ id: g.id, titel: g.titel }))),
      )
      .catch(() => setWigs([]));
  }, []);

  function setF<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function laden() {
    setTasks(await senden<TaskDTO[]>("/api/tasks", "GET"));
  }

  async function anlegen() {
    if (!form.titel.trim()) {
      setFehler("Bitte einen Titel angeben.");
      return;
    }
    setSpeichert(true);
    setFehler(null);
    try {
      await senden("/api/tasks", "POST", {
        titel: form.titel.trim(),
        important: form.important,
        urgent: form.urgent,
        goalId: form.goalId || null,
      });
      setForm({ ...LEER });
      await laden();
    } catch (e) {
      setFehler((e as Error).message);
    } finally {
      setSpeichert(false);
    }
  }

  // Optimistisches Patchen eines Felds, Rollback bei Fehler.
  async function patchen(id: string, aenderung: Partial<TaskDTO>) {
    setTasks((ts) => ts?.map((t) => (t.id === id ? { ...t, ...aenderung } : t)) ?? ts);
    try {
      await senden(`/api/tasks/${id}`, "PATCH", aenderung);
      await laden();
    } catch (e) {
      setFehler((e as Error).message);
      await laden(); // Rollback auf Serverstand
    }
  }

  async function loeschen(id: string) {
    setTasks((ts) => ts?.filter((t) => t.id !== id) ?? ts);
    try {
      await senden(`/api/tasks/${id}`, "DELETE");
    } catch (e) {
      setFehler((e as Error).message);
      await laden();
    }
  }

  if (!tasks) return <Skeleton className="h-64 w-full" />;

  const offen = tasks.filter((t) => t.status !== "DONE");
  const erledigt = tasks.filter((t) => t.status === "DONE");

  return (
    <div className="space-y-6">
      {/* Quick-Add */}
      <div className="rounded-lg border bg-card p-4">
        <p className="mb-3 text-sm font-medium">Neue Aufgabe</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Titel</span>
            <input
              className={`${INPUT} w-full`}
              value={form.titel}
              onChange={(e) => setF("titel", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") anlegen();
              }}
              placeholder="z. B. Angebot fuer Kunde X schreiben"
            />
          </label>
          <label className="block sm:w-48">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">WIG (optional)</span>
            <select
              className={`${INPUT} w-full`}
              value={form.goalId}
              onChange={(e) => setF("goalId", e.target.value)}
            >
              <option value="">— keine —</option>
              {wigs.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.titel}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <FlagToggle aktiv={form.important} onClick={() => setF("important", !form.important)} label="Wichtig" />
          <FlagToggle aktiv={form.urgent} onClick={() => setF("urgent", !form.urgent)} label="Dringend" />
          <button
            onClick={anlegen}
            disabled={speichert}
            className="ml-auto inline-flex items-center gap-1 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
          >
            <Plus size={16} aria-hidden="true" />
            {speichert ? "Speichert…" : "Hinzufuegen"}
          </button>
        </div>
        {fehler && <p className="mt-3 text-sm text-credo-rot">{fehler}</p>}
      </div>

      {/* Matrix */}
      {offen.length === 0 && erledigt.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
          Noch keine Aufgaben. Lege oben deine erste an – und entscheide bewusst,
          ob sie wirklich wichtig oder nur dringend ist.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {EISENHOWER_QUADRANTEN.map((q) => (
            <QuadrantBox
              key={q.wert}
              meta={q}
              tasks={offen.filter((t) => berechneQuadrant(t.important, t.urgent) === q.wert)}
              onToggleImportant={(t) => patchen(t.id, { important: !t.important })}
              onToggleUrgent={(t) => patchen(t.id, { urgent: !t.urgent })}
              onErledigt={(t) => patchen(t.id, { status: "DONE" })}
              onLoeschen={(t) => loeschen(t.id)}
            />
          ))}
        </div>
      )}

      {/* Erledigt */}
      {erledigt.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Erledigt ({erledigt.length})</h2>
          <ul className="flex flex-col gap-1.5">
            {erledigt.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
              >
                <Check size={15} className="shrink-0 text-credo-gruen" aria-hidden="true" />
                <span className="flex-1 text-muted-foreground line-through">{t.titel}</span>
                <button
                  onClick={() => patchen(t.id, { status: "TODO" })}
                  className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                >
                  Wieder offen
                </button>
                <button
                  onClick={() => loeschen(t.id)}
                  aria-label={`Loeschen: ${t.titel}`}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// --- Teilkomponenten -------------------------------------------------------

function FlagToggle({ aktiv, onClick, label }: { aktiv: boolean; onClick: () => void; label: string }) {
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

interface QuadrantBoxProps {
  meta: (typeof EISENHOWER_QUADRANTEN)[number];
  tasks: TaskDTO[];
  onToggleImportant: (t: TaskDTO) => void;
  onToggleUrgent: (t: TaskDTO) => void;
  onErledigt: (t: TaskDTO) => void;
  onLoeschen: (t: TaskDTO) => void;
}

function QuadrantBox({ meta, tasks, onToggleImportant, onToggleUrgent, onErledigt, onLoeschen }: QuadrantBoxProps) {
  return (
    <section className="flex min-h-32 flex-col rounded-lg border bg-card p-3">
      <header className="mb-2 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.akzentBg}`} aria-hidden="true" />
        <h2 className="text-sm font-medium">{meta.titel}</h2>
        <span className={`ml-auto text-xs font-semibold ${meta.akzentText}`}>{meta.aktion}</span>
      </header>
      {tasks.length === 0 ? (
        <p className="my-auto py-4 text-center text-xs text-muted-foreground">{meta.beschreibung}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {tasks.map((t) => (
            <li key={t.id} className="rounded-md border border-border bg-background px-2.5 py-2">
              <div className="flex items-start gap-2">
                <button
                  onClick={() => onErledigt(t)}
                  aria-label={`Erledigt: ${t.titel}`}
                  className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-input hover:border-accent"
                >
                  <Check size={11} className="text-transparent" aria-hidden="true" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">{t.titel}</p>
                  {t.goalTitel && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">WIG: {t.goalTitel}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <MiniToggle aktiv={t.important} onClick={() => onToggleImportant(t)} label="Wichtig" />
                    <MiniToggle aktiv={t.urgent} onClick={() => onToggleUrgent(t)} label="Dringend" />
                    <button
                      onClick={() => onLoeschen(t)}
                      aria-label={`Loeschen: ${t.titel}`}
                      className="ml-auto rounded p-1 text-muted-foreground hover:bg-muted"
                    >
                      <Trash2 size={13} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MiniToggle({ aktiv, onClick, label }: { aktiv: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktiv}
      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
        aktiv
          ? "border-accent bg-accent text-accent-foreground"
          : "border-input bg-background text-muted-foreground hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}
