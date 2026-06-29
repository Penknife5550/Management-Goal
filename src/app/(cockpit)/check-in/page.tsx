import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CheckInClient } from "@/components/check-in/check-in-client";

// Gefuehrter Wochen-Check-in (Phase 2): das 4DX-Kadenzritual.
export default function CheckInPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6">
        <Link
          href="/ziele"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurueck zum Cockpit
        </Link>
        <h1 className="text-xl font-medium">Wochen-Check-in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          In wenigen Minuten durch deine WIGs: Ampel, Fortschritt, nächste Hebel.
        </p>
        <div className="credo-linie mt-4" aria-hidden="true">
          <span className="!flex-[4]" style={{ background: "var(--color-muted-foreground)" }} />
          <span style={{ background: "var(--color-credo-gelb)" }} />
          <span style={{ background: "var(--color-credo-gruen)" }} />
          <span style={{ background: "var(--color-credo-rot)" }} />
          <span style={{ background: "var(--color-credo-blau)" }} />
        </div>
      </header>

      <CheckInClient />
    </main>
  );
}
