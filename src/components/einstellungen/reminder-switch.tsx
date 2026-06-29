"use client";

// Globaler Kill-Switch fuer alle automatischen Reminder-Mails.
import { useContext, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-client";
import { behandleFehler, ReGateContext } from "./shared";

export function ReminderSwitch() {
  const reGate = useContext(ReGateContext);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [speichert, setSpeichert] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    adminFetch<{ enabled: boolean }>("/api/settings/reminders", "GET")
      .then((d) => setEnabled(d.enabled))
      .catch((e) => behandleFehler(e, reGate, () => setEnabled(null)));
  }, [reGate]);

  async function umschalten() {
    if (enabled === null) return;
    const neu = !enabled;
    setSpeichert(true);
    setFehler(null);
    setEnabled(neu);
    try {
      await adminFetch("/api/settings/reminders", "PUT", { enabled: neu });
    } catch (e) {
      setEnabled(!neu); // Rollback
      behandleFehler(e, reGate, () => setFehler("Konnte nicht gespeichert werden."));
    } finally {
      setSpeichert(false);
    }
  }

  if (enabled === null) return null;

  return (
    <div className="mb-6 flex items-center justify-between rounded-lg border bg-muted px-4 py-3">
      <div>
        <p className="text-sm font-medium">Wochen-Reminder global</p>
        <p className="text-xs text-muted-foreground">
          Globaler Schalter fuer alle automatischen Erinnerungs-Mails.
        </p>
        {fehler && <p className="mt-1 text-xs text-credo-rot">{fehler}</p>}
      </div>
      <button
        onClick={umschalten}
        disabled={speichert}
        aria-pressed={enabled}
        aria-label="Wochen-Reminder global umschalten"
        className={`rounded-full px-3 py-1 text-xs font-medium ${
          enabled ? "bg-status-gruen-text text-white" : "bg-input text-foreground"
        }`}
      >
        {enabled ? "Aktiv" : "Pausiert"}
      </button>
    </div>
  );
}
