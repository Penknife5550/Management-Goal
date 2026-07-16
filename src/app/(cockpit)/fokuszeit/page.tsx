import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { FokuszeitClient } from "@/components/fokuszeit/fokuszeit-client";

// Q2-Schutz (Covey/Drucker): wiederkehrende Zeitbloecke fuer die WIG-Arbeit.
export default function FokuszeitPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6">
        <Link
          href="/heute"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurueck zur Startseite
        </Link>
        <h1 className="text-xl font-medium">Fokuszeit (Q2)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reserviere feste, wiederkehrende Zeit für „wichtig, nicht dringend“ – und exportiere sie
          in deinen Kalender.
        </p>
        <div className="credo-linie mt-4" aria-hidden="true">
          <span className="!flex-[4]" style={{ background: "var(--color-muted-foreground)" }} />
          <span style={{ background: "var(--color-credo-gelb)" }} />
          <span style={{ background: "var(--color-credo-gruen)" }} />
          <span style={{ background: "var(--color-credo-rot)" }} />
          <span style={{ background: "var(--color-credo-blau)" }} />
        </div>
      </header>

      <FokuszeitClient />
    </main>
  );
}
