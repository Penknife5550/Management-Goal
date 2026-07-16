"use client";

// ============================================================
// Q2-Schutz / Fokuszeit: woechentlich wiederkehrende Schutzbloecke fuer die
// Arbeit an den WIGs ("wichtig, nicht dringend"). Anlegen/Bearbeiten/Loeschen
// + ICS-Export fuer den eigenen Kalender.
// ============================================================
import { CalendarDays, Download, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { senden } from "@/lib/client";
import { hhmmZuMinuten, minutenZuHHMM, WOCHENTAGE } from "@/lib/q2";
import type { Q2BlockDTO, ZielDTO } from "@/lib/types";

const INPUT = "rounded-lg border border-input bg-background px-3 py-2 text-sm";

interface WigOption {
  id: string;
  titel: string;
}

const LEER = { titel: "", wochentag: 2, startzeit: "09:00", dauerMin: 90, goalId: "" };

function tagLang(w: number) {
  return WOCHENTAGE.find((t) => t.wert === w)?.lang ?? "";
}

export function FokuszeitClient() {
  const [bloecke, setBloecke] = useState<Q2BlockDTO[] | null>(null);
  const [wigs, setWigs] = useState<WigOption[]>([]);
  const [form, setForm] = useState({ ...LEER });
  const [editId, setEditId] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [speichert, setSpeichert] = useState(false);

  useEffect(() => {
    senden<Q2BlockDTO[]>("/api/q2-blocks", "GET")
      .then(setBloecke)
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
    setBloecke(await senden<Q2BlockDTO[]>("/api/q2-blocks", "GET"));
  }

  async function speichern() {
    if (!form.titel.trim()) {
      setFehler("Bitte einen Titel angeben.");
      return;
    }
    setSpeichert(true);
    setFehler(null);
    const payload = {
      titel: form.titel.trim(),
      wochentag: form.wochentag,
      startMinute: hhmmZuMinuten(form.startzeit),
      dauerMin: form.dauerMin,
      goalId: form.goalId || null,
    };
    try {
      if (editId) {
        await senden(`/api/q2-blocks/${editId}`, "PATCH", payload);
      } else {
        await senden("/api/q2-blocks", "POST", payload);
      }
      setForm({ ...LEER });
      setEditId(null);
      await laden();
    } catch (e) {
      setFehler((e as Error).message);
    } finally {
      setSpeichert(false);
    }
  }

  function bearbeiten(b: Q2BlockDTO) {
    setEditId(b.id);
    setForm({
      titel: b.titel,
      wochentag: b.wochentag,
      startzeit: minutenZuHHMM(b.startMinute),
      dauerMin: b.dauerMin,
      goalId: b.goalId ?? "",
    });
    setFehler(null);
  }

  function abbrechen() {
    setEditId(null);
    setForm({ ...LEER });
    setFehler(null);
  }

  async function loeschen(id: string) {
    setBloecke((bs) => bs?.filter((b) => b.id !== id) ?? bs); // optimistisch
    try {
      await senden(`/api/q2-blocks/${id}`, "DELETE");
    } catch (e) {
      setFehler((e as Error).message);
      await laden(); // Rollback
    }
  }

  if (!bloecke) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      {/* Formular */}
      <div className="rounded-lg border bg-card p-4">
        <p className="mb-3 text-sm font-medium">
          {editId ? "Block bearbeiten" : "Neuen Schutzblock anlegen"}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Titel</span>
            <input
              className={`${INPUT} w-full`}
              value={form.titel}
              onChange={(e) => setF("titel", e.target.value)}
              placeholder="z. B. Strategie-Fokus"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Wochentag</span>
            <select
              className={`${INPUT} w-full`}
              value={form.wochentag}
              onChange={(e) => setF("wochentag", Number(e.target.value))}
            >
              {WOCHENTAGE.map((t) => (
                <option key={t.wert} value={t.wert}>
                  {t.lang}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Beginn</span>
            <input
              type="time"
              className={`${INPUT} w-full`}
              value={form.startzeit}
              onChange={(e) => setF("startzeit", e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Dauer (Minuten)
            </span>
            <input
              type="number"
              min={15}
              max={720}
              step={15}
              className={`${INPUT} w-full`}
              value={form.dauerMin}
              onChange={(e) => setF("dauerMin", Number(e.target.value) || 0)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              WIG (optional)
            </span>
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

        {fehler && <p className="mt-3 text-sm text-credo-rot">{fehler}</p>}

        <div className="mt-4 flex gap-2">
          <button
            onClick={speichern}
            disabled={speichert}
            className="inline-flex items-center gap-1 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
          >
            <Plus size={16} aria-hidden="true" />
            {speichert ? "Speichert…" : editId ? "Speichern" : "Anlegen"}
          </button>
          {editId && (
            <button
              onClick={abbrechen}
              className="inline-flex items-center gap-1 rounded-lg border border-input px-4 py-2 text-sm font-medium"
            >
              <X size={16} aria-hidden="true" /> Abbrechen
            </button>
          )}
        </div>
      </div>

      {/* Liste */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-medium">
            <CalendarDays size={18} className="text-accent" aria-hidden="true" /> Deine Schutzblöcke
          </h2>
          {bloecke.length > 0 && (
            <button
              type="button"
              onClick={() => {
                window.location.href = "/api/q2-blocks/ics";
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-input px-3 py-1.5 text-sm font-medium hover:bg-muted"
            >
              <Download size={15} aria-hidden="true" /> Kalender (.ics)
            </button>
          )}
        </div>

        {bloecke.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            Noch keine Fokuszeit reserviert. Blocke dir feste Zeit für „wichtig, nicht dringend“ –
            sonst frisst das Dringende die Strategie.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {bloecke.map((b) => (
              <li
                key={b.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
              >
                <div className="w-10 shrink-0 text-center">
                  <span className="block text-xs font-medium text-muted-foreground">
                    {WOCHENTAGE.find((t) => t.wert === b.wochentag)?.kurz}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium leading-snug">{b.titel}</p>
                  <p className="text-xs text-muted-foreground">
                    {tagLang(b.wochentag)}, {minutenZuHHMM(b.startMinute)}–
                    {minutenZuHHMM(b.startMinute + b.dauerMin)}
                    {b.goalTitel && <> · WIG: {b.goalTitel}</>}
                  </p>
                </div>
                <button
                  onClick={() => bearbeiten(b)}
                  aria-label={`Bearbeiten: ${b.titel}`}
                  className="rounded-md border border-border p-1.5 text-accent hover:bg-muted"
                >
                  <Pencil size={14} aria-hidden="true" />
                </button>
                <button
                  onClick={() => loeschen(b.id)}
                  aria-label={`Löschen: ${b.titel}`}
                  className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-muted"
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
