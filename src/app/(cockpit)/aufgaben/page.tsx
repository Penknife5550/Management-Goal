import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AufgabenClient } from "@/components/aufgaben/aufgaben-client";

// Aufgaben-Ebene: Eisenhower-Matrix (wichtig x dringend). Operative Ergaenzung
// zur strategischen Ziel-Ebene; spaeter mit KI-Quadranten-Vorschlag (Schritt 5).
export default function AufgabenPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <Link
          href="/heute"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurueck zur Startseite
        </Link>
        <h1 className="text-xl font-medium">Aufgaben (Eisenhower)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sortiere nach <strong>wichtig</strong> und <strong>dringend</strong> – und schütze die
          wichtige, nicht dringende Zone (Q2) vor dem Tagesgeschäft.
        </p>
        <div className="credo-linie mt-4" aria-hidden="true">
          <span className="!flex-[4]" style={{ background: "var(--color-muted-foreground)" }} />
          <span style={{ background: "var(--color-credo-gelb)" }} />
          <span style={{ background: "var(--color-credo-gruen)" }} />
          <span style={{ background: "var(--color-credo-rot)" }} />
          <span style={{ background: "var(--color-credo-blau)" }} />
        </div>
      </header>

      <AufgabenClient />
    </main>
  );
}
