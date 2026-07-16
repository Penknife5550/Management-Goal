"use client";

import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CircleCheck,
  Coffee,
  Lightbulb,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { senden } from "@/lib/client";
import { TOP_INSIGHTS_ANZAHL } from "@/lib/constants";
import { quadrantMeta } from "@/lib/eisenhower";
import { AMPEL_META, berechneCountdown } from "@/lib/goals";
import { bewerteTag, type TagesTon } from "@/lib/heute";
import type { Insight, InsightSchwere } from "@/lib/insights";
import type { TaskDTO, ZielDTO } from "@/lib/types";

// --- Darstellungs-Metadaten (nur UI, kein Domaenenwissen) ---

// Ton des Tagesurteils -> Rahmen/Flaeche/Icon aus dem CREDO-Status-Theme.
const URTEIL_STIL: Record<TagesTon, { klasse: string; icon: typeof CircleCheck }> = {
  gruen: { klasse: "border-status-gruen/40 bg-status-gruen/10", icon: CircleCheck },
  gelb: { klasse: "border-status-gelb/40 bg-status-gelb/20", icon: AlertTriangle },
  rot: { klasse: "border-status-rot/40 bg-status-rot/10", icon: AlertCircle },
  leer: { klasse: "border-border bg-muted", icon: Target },
};

// Schwere eines Insights -> Textfarbe des Aufzaehlungspunkts.
const SCHWERE_PUNKT: Record<InsightSchwere, string> = {
  warnung: "text-status-rot",
  hinweis: "text-status-gelb",
  info: "text-muted-foreground",
};

export function HeuteClient() {
  const [ziele, setZiele] = useState<ZielDTO[]>([]);
  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    // Drei read-only-Quellen parallel: kein eigener Aggregat-Endpoint noetig.
    Promise.all([
      senden<ZielDTO[]>("/api/goals", "GET"),
      senden<TaskDTO[]>("/api/tasks", "GET"),
      senden<Insight[]>("/api/insights", "GET"),
    ])
      .then(([g, t, i]) => {
        setZiele(g);
        setTasks(t);
        setInsights(i);
      })
      .catch((e: Error) => setFehler(e.message))
      .finally(() => setLaedt(false));
  }, []);

  if (laedt) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true" aria-label="Startseite wird geladen">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
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

  const fokusZiele = ziele.filter((z) => z.status === "FOKUS");
  const q1 = tasks.filter((t) => t.status !== "DONE" && t.quadrant === 1);
  const q2 = tasks.filter((t) => t.status !== "DONE" && t.quadrant === 2);
  const topInsights = insights.slice(0, TOP_INSIGHTS_ANZAHL);

  const urteil = bewerteTag({ fokusAmpeln: fokusZiele.map((z) => z.ampel), insights });
  const stil = URTEIL_STIL[urteil.ton];
  const UrteilIcon = stil.icon;

  return (
    <div className="flex flex-col gap-8">
      {/* Tagesurteil: "Gewinne ich?" auf einen Blick */}
      <section className={`rounded-lg border p-5 ${stil.klasse}`} aria-label="Tagesurteil">
        <div className="flex items-start gap-3">
          <UrteilIcon className="mt-0.5 h-6 w-6 shrink-0 text-foreground" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold leading-tight">{urteil.titel}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{urteil.text}</p>
          </div>
        </div>
      </section>

      {/* WIG-Ampeln: Stand der Fokus-Ziele */}
      <section aria-label="Fokus-Ziele">
        <SektionKopf titel="Deine Fokus-Ziele" href="/ziele" linkText="Zu den Zielen" />
        {fokusZiele.length === 0 ? (
          <LeerHinweis text="Keine Fokus-Ziele. Hebe im Backlog 1–3 Ziele in den Fokus." />
        ) : (
          <ul className="flex flex-col gap-2">
            {fokusZiele.map((z) => (
              <WigZeile key={z.id} ziel={z} />
            ))}
          </ul>
        )}
      </section>

      {/* Heutige wichtige Aufgaben: Q1 (Tun) + Q2 (Planen) */}
      <section aria-label="Wichtige Aufgaben heute">
        <SektionKopf titel="Heute wichtig" href="/aufgaben" linkText="Zu den Aufgaben" />
        {q1.length === 0 && q2.length === 0 ? (
          <LeerHinweis
            icon={Coffee}
            text="Keine wichtigen Aufgaben offen. Kopf frei für die eigentliche Arbeit."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {q1.length > 0 && <TaskGruppe quadrant={1} tasks={q1} />}
            {q2.length > 0 && <TaskGruppe quadrant={2} tasks={q2} />}
          </div>
        )}
      </section>

      {/* Top-Insights aus dem Insight-Motor (AP 1) */}
      <section aria-label="Wichtigste Insights">
        <SektionKopf titel="Was auffällt" />
        {topInsights.length === 0 ? (
          <LeerHinweis
            icon={Lightbulb}
            text="Nichts Auffälliges. Keine Watermelons, Fokus-Lecks oder Zombies erkannt."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {topInsights.map((i, idx) => (
              <InsightZeile key={`${i.typ}-${i.goalId ?? idx}`} insight={i} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// --- kleine, rein praesentationale Bausteine ---

function SektionKopf({
  titel,
  href,
  linkText,
}: {
  titel: string;
  href?: string;
  linkText?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {titel}
      </h2>
      {href && linkText && (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {linkText}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

function LeerHinweis({
  text,
  icon: Icon = CircleCheck,
}: {
  text: string;
  icon?: typeof CircleCheck;
}) {
  return (
    <p className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {text}
    </p>
  );
}

function WigZeile({ ziel }: { ziel: ZielDTO }) {
  const ampel = AMPEL_META.find((a) => a.wert === ziel.ampel);
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{ziel.titel}</p>
        <div
          className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={ziel.fortschritt}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Fortschritt ${ziel.titel}: ${ziel.fortschritt}%`}
        >
          <div
            className="h-full rounded-full bg-status-gruen"
            style={{ width: `${ziel.fortschritt}%` }}
            aria-hidden="true"
          />
        </div>
      </div>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {ziel.fortschritt}%
      </span>
      {ampel && (
        <span
          className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${ampel.klasse}`}
        >
          {ampel.label}
        </span>
      )}
    </li>
  );
}

function TaskGruppe({ quadrant, tasks }: { quadrant: 1 | 2; tasks: TaskDTO[] }) {
  const meta = quadrantMeta(quadrant);
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${meta.akzentBg}`} aria-hidden="true" />
        <span className="text-xs font-medium text-foreground">{meta.aktion}</span>
        <span className="text-xs text-muted-foreground">
          {meta.titel} · {tasks.length}
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {tasks.map((t) => (
          <TaskZeile key={t.id} task={t} />
        ))}
      </ul>
    </div>
  );
}

function TaskZeile({ task }: { task: TaskDTO }) {
  const countdown = task.dueDate ? berechneCountdown(new Date(task.dueDate), new Date()) : null;
  const zeigeFrist = countdown && (countdown.ton === "warnung" || countdown.ton === "ueberfaellig");
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{task.titel}</p>
        {task.goalTitel && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">↳ {task.goalTitel}</p>
        )}
      </div>
      {zeigeFrist && countdown && (
        <span
          className={`inline-flex shrink-0 items-center gap-1 text-xs ${
            countdown.ton === "ueberfaellig" ? "text-status-rot" : "text-muted-foreground"
          }`}
        >
          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
          {countdown.text}
        </span>
      )}
    </li>
  );
}

function InsightZeile({ insight }: { insight: Insight }) {
  return (
    <li className="flex items-start gap-2.5 rounded-lg border border-border bg-card px-4 py-3">
      <Lightbulb
        className={`mt-0.5 h-4 w-4 shrink-0 ${SCHWERE_PUNKT[insight.schwere]}`}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="text-sm font-medium">{insight.titel}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{insight.detail}</p>
      </div>
    </li>
  );
}
