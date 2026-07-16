"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { senden } from "@/lib/client";

// Abmelden-Knopf fuer die Kopf-Navigation (Muster der anderen Nav-Links:
// Icon immer, Label erst ab sm). Nach dem Logout hart auf /login wechseln,
// damit kein Client-State der Session uebrig bleibt.
export function LogoutButton() {
  const [laeuft, setLaeuft] = useState(false);

  async function abmelden() {
    if (laeuft) return;
    setLaeuft(true);
    try {
      await senden("/api/auth/login", "DELETE");
    } catch {
      // Auch bei Fehler zur Login-Seite: die Middleware raeumt ungueltige Cookies auf.
    }
    window.location.assign("/login");
  }

  return (
    <button
      type="button"
      onClick={abmelden}
      disabled={laeuft}
      aria-label="Abmelden"
      className="inline-flex items-center gap-1 py-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-60"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">{laeuft ? "Wird abgemeldet …" : "Abmelden"}</span>
    </button>
  );
}
