import { CalendarClock, Home, ListTodo, Settings, Target } from "lucide-react";
import Link from "next/link";
import { UeberblickClient } from "@/components/ueberblick/ueberblick-client";

// GF-Aggregat (AP5): read-only Fuehrungs-Ueberblick ueber die Rechtseinheit.
// Nur fuer ADMIN (Middleware-Gate + withAdmin in der API).
export default function UeberblickPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-medium">Führungs-Überblick</h1>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link
              href="/heute"
              aria-label="Heute"
              className="inline-flex items-center gap-1 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <Home className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Heute</span>
            </Link>
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
          Wie steht die Rechtseinheit? Pro Person das Wochenurteil und die Fokus-Ziele – rein
          lesend.
        </p>
        <div className="credo-linie mt-4" aria-hidden="true">
          <span className="!flex-[4]" style={{ background: "var(--color-muted-foreground)" }} />
          <span style={{ background: "var(--color-credo-gelb)" }} />
          <span style={{ background: "var(--color-credo-gruen)" }} />
          <span style={{ background: "var(--color-credo-rot)" }} />
          <span style={{ background: "var(--color-credo-blau)" }} />
        </div>
      </header>

      <UeberblickClient />
    </main>
  );
}
