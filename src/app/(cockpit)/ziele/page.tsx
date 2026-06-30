import { CalendarCheck, CalendarClock, Settings } from "lucide-react";
import Link from "next/link";
import { ZieleClient } from "@/components/ziele/ziele-client";

// Strategische Ebene: Ziel-Backlog + aktive WIGs (Scoreboard).
export default function ZielePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-medium">Strategische Ziele</h1>
          <div className="flex items-center gap-3">
            <Link
              href="/check-in"
              className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground"
            >
              <CalendarCheck className="h-4 w-4" aria-hidden="true" />
              Wochen-Check-in
            </Link>
            <Link
              href="/fokuszeit"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
              Fokuszeit
            </Link>
            <Link
              href="/einstellungen"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              aria-label="Einstellungen"
            >
              <Settings className="h-4 w-4" />
              Einstellungen
            </Link>
          </div>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Sammle Ideen im Backlog – arbeite an 1–3 wirklich wichtigen Zielen (WIGs).
        </p>
        <div className="credo-linie mt-4" aria-hidden="true">
          <span className="!flex-[4]" style={{ background: "var(--color-muted-foreground)" }} />
          <span style={{ background: "var(--color-credo-gelb)" }} />
          <span style={{ background: "var(--color-credo-gruen)" }} />
          <span style={{ background: "var(--color-credo-rot)" }} />
          <span style={{ background: "var(--color-credo-blau)" }} />
        </div>
      </header>

      <ZieleClient />
    </main>
  );
}
