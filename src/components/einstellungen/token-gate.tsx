"use client";

// Admin-Token-Gate (Uebergangs-Schutz bis RBAC, Phase 4).
import { Lock } from "lucide-react";
import { useState } from "react";
import { setAdminToken } from "@/lib/admin-client";
import { BTN, INPUT } from "./shared";

export function TokenGate({ onOk }: { onOk: () => void }) {
  const [token, setToken] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);

  function bestaetigen() {
    if (!token.trim()) {
      setFehler("Bitte das Admin-Token eingeben.");
      return;
    }
    setAdminToken(token.trim());
    setFehler(null);
    onOk();
  }

  return (
    <form
      className="mx-auto max-w-md rounded-lg border bg-card p-6"
      onSubmit={(e) => {
        e.preventDefault();
        bestaetigen();
      }}
    >
      <div className="mb-3 flex items-center gap-2 text-foreground">
        <Lock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-base font-medium">Geschuetzter Bereich</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Die Einstellungen sind bis zur echten Nutzerverwaltung (Phase 4) mit einem Admin-Token
        geschuetzt. Bitte das in der Umgebung hinterlegte Token eingeben.
      </p>
      <input
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Admin-Token"
        aria-label="Admin-Token"
        className={INPUT}
        autoFocus
      />
      {fehler && <p className="mt-2 text-sm text-credo-rot">{fehler}</p>}
      <button type="submit" className={`${BTN} mt-4 w-full`}>
        Entsperren
      </button>
    </form>
  );
}
