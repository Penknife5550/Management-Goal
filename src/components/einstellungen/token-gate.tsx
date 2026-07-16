"use client";

// Rollen-Gate der Einstellungen: Hinweis-Karte fuer Nicht-Administratoren.
// (Frueher Admin-Token-Eingabe; die Rollen-Pruefung macht einstellungen-client
// via GET /api/auth/session, serverseitig schuetzt withAdmin die Endpunkte.)
import { Lock } from "lucide-react";

export function TokenGate() {
  return (
    <div className="mx-auto max-w-md rounded-lg border bg-card p-6">
      <div className="mb-3 flex items-center gap-2 text-foreground">
        <Lock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-base font-medium">Nur fuer Administratoren.</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Die Einstellungen sind Administratoren vorbehalten. Bitte mit einem Administrator-Konto
        anmelden.
      </p>
    </div>
  );
}
