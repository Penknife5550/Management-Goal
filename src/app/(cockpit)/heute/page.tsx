import { CalendarCheck, CalendarClock, ListTodo, Settings, Target } from "lucide-react";
import Link from "next/link";
import { HeuteClient } from "@/components/heute/heute-client";

// Startseite (AP 2): "Gewinne ich?" auf einen Blick - Tagesurteil, WIG-Ampeln,
// heutige Q1/Q2-Aufgaben und die wichtigsten Insights (AP 1). Rein lesend.
export default function HeutePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-medium">Heute</h1>
          {/* Auf schmalen Screens nur Icons (flex-wrap + hidden sm:inline),
              aria-label haelt die Links fuer Screenreader benannt. */}
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link
              href="/ziele"
              aria-label="Ziele"
              className="inline-flex items-center gap-1 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <Target className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Ziele</span>
            </Link>
            <Link
              href="/aufgaben"
              aria-label="Aufgaben"
              className="inline-flex items-center gap-1 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ListTodo className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Aufgaben</span>
            </Link>
            <Link
              href="/check-in"
              aria-label="Check-in"
              className="inline-flex items-center gap-1 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <CalendarCheck className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Check-in</span>
            </Link>
            <Link
              href="/fokuszeit"
              aria-label="Fokuszeit"
              className="inline-flex items-center gap-1 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Fokuszeit</span>
            </Link>
            <Link
              href="/einstellungen"
              aria-label="Einstellungen"
              className="inline-flex items-center gap-1 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Einstellungen</span>
            </Link>
          </div>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Gewinne ich? Dein Tag auf einen Blick – Fokus-Ziele, wichtige Aufgaben, was auffällt.
        </p>
        <div className="credo-linie mt-4" aria-hidden="true">
          <span className="!flex-[4]" style={{ background: "var(--color-muted-foreground)" }} />
          <span style={{ background: "var(--color-credo-gelb)" }} />
          <span style={{ background: "var(--color-credo-gruen)" }} />
          <span style={{ background: "var(--color-credo-rot)" }} />
          <span style={{ background: "var(--color-credo-blau)" }} />
        </div>
      </header>

      <HeuteClient />
    </main>
  );
}
