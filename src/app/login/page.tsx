import { LoginClient } from "@/components/login/login-client";

// Anmeldeseite (AP6). Bewusst AUSSERHALB der (cockpit)-Group: sie ist die
// einzige oeffentliche Seite (Middleware laesst /login ohne Session durch).
// ?fehler=link kommt vom Magic-Link-Einloesen (ungueltig/abgelaufen).
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string }>;
}) {
  const { fehler } = await searchParams;

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <header className="mb-6">
        <h1 className="text-xl font-medium">Anmelden</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          CREDO Fuehrungs-Cockpit – bitte melde dich an.
        </p>
        <div className="credo-linie mt-4" aria-hidden="true">
          <span className="!flex-[4]" style={{ background: "var(--color-muted-foreground)" }} />
          <span style={{ background: "var(--color-credo-gelb)" }} />
          <span style={{ background: "var(--color-credo-gruen)" }} />
          <span style={{ background: "var(--color-credo-rot)" }} />
          <span style={{ background: "var(--color-credo-blau)" }} />
        </div>
      </header>

      <LoginClient linkFehler={fehler === "link"} />
    </main>
  );
}
