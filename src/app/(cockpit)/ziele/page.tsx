import { ZieleClient } from "@/components/ziele/ziele-client";

// Strategische Ebene: Ziel-Backlog + aktive WIGs (Scoreboard).
export default function ZielePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-medium">Strategische Ziele</h1>
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
