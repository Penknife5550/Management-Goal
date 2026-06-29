import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EinstellungenClient } from "@/components/einstellungen/einstellungen-client";

// Einstellungen: SMTP-Versand, E-Mail-Vorlagen, Versandprotokoll (Phase 2).
export default function EinstellungenPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <Link
          href="/ziele"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurueck zum Cockpit
        </Link>
        <h1 className="text-xl font-medium">Einstellungen</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          E-Mail-Versand (SMTP), Vorlagen und Versandprotokoll.
        </p>
        <div className="credo-linie mt-4" aria-hidden="true">
          <span className="!flex-[4]" style={{ background: "var(--color-muted-foreground)" }} />
          <span style={{ background: "var(--color-credo-gelb)" }} />
          <span style={{ background: "var(--color-credo-gruen)" }} />
          <span style={{ background: "var(--color-credo-rot)" }} />
          <span style={{ background: "var(--color-credo-blau)" }} />
        </div>
      </header>

      <EinstellungenClient />
    </main>
  );
}
