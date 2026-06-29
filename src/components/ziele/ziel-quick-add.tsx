"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

interface Props {
  onAnlegen: (titel: string) => Promise<void> | void;
}

// Quick-Add: eine Zeile, Enter genuegt (Tastatur-First, minimale Reibung).
export function ZielQuickAdd({ onAnlegen }: Props) {
  const [titel, setTitel] = useState("");
  const [wirdGesendet, setWirdGesendet] = useState(false);

  async function absenden(event: React.FormEvent) {
    event.preventDefault();
    const wert = titel.trim();
    if (wert.length === 0 || wirdGesendet) return;
    setWirdGesendet(true);
    try {
      await onAnlegen(wert);
      setTitel("");
    } finally {
      setWirdGesendet(false);
    }
  }

  return (
    <form onSubmit={absenden} className="flex items-center gap-2">
      <input
        type="text"
        value={titel}
        onChange={(e) => setTitel(e.target.value)}
        placeholder="Neues Ziel … (Enter zum Anlegen)"
        aria-label="Neues Ziel anlegen"
        disabled={wirdGesendet}
        className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={wirdGesendet}
        className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        <Plus size={16} aria-hidden="true" /> Anlegen
      </button>
    </form>
  );
}
