"use client";

// ============================================================
// Gemeinsame Bausteine der Einstellungs-Tabs: Typen, Styles, Re-Gate-Context,
// Fehlerbehandlung, der useAdminAction-Hook und kleine UI-Primitiven.
// ============================================================
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { createContext, useCallback, useContext, useState } from "react";

// ---- Typen ----
export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  replyToEmail: string;
  isActive: boolean;
  encryptionConfigured: boolean;
}

export interface TemplateRow {
  event: string;
  name: string;
  recipientHint: string;
  defaultRecipientTo: string;
  variables: { key: string; description: string }[];
  source: "db" | "default";
  subject: string;
  bodyHtml: string;
  bodyText: string;
  recipientTo: string;
  recipientCc: string;
  recipientBcc: string;
  recipientReplyTo: string;
  isActive: boolean;
}

export interface LogRow {
  id: string;
  event: string;
  recipient: string;
  subject: string;
  status: string;
  detail: string | null;
  isTest: boolean;
  createdAt: string;
}

// ---- Styles (CREDO-Standard, siehe CLAUDE.md) ----
export const INPUT = "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm";
export const BTN =
  "rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50";
export const BTN_SEK =
  "rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium disabled:opacity-50";

// ---- Re-Gate bei UNAUTHORIZED nach dem Mount ----
export const ReGateContext = createContext<() => void>(() => {});

// Zentrale Fehlerbehandlung: bei UNAUTHORIZED zurueck zum Token-Gate,
// sonst die deutsche Server-Meldung setzen.
export function behandleFehler(
  e: unknown,
  reGate: () => void,
  setFehler: (s: string | null) => void,
): void {
  if (e instanceof Error && e.message === "UNAUTHORIZED") {
    reGate();
    return;
  }
  setFehler(e instanceof Error ? e.message : "Aktion fehlgeschlagen.");
}

// ---- useAdminAction: kapselt fehler/erfolg/laeuft + try/catch/finally ----
// `laeuft` haelt die Kennung der gerade laufenden Aktion (oder null), damit pro
// Tab mehrere Buttons (Speichern/Test) unabhaengige Lade-Zustaende zeigen.
export function useAdminAction() {
  const reGate = useContext(ReGateContext);
  const [fehler, setFehler] = useState<string | null>(null);
  const [erfolg, setErfolg] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState<string | null>(null);

  const run = useCallback(
    async (kennung: string, fn: () => Promise<void>, erfolgsText?: string) => {
      setFehler(null);
      setErfolg(null);
      setLaeuft(kennung);
      try {
        await fn();
        if (erfolgsText) setErfolg(erfolgsText);
      } catch (e) {
        behandleFehler(e, reGate, setFehler);
      } finally {
        setLaeuft(null);
      }
    },
    [reGate],
  );

  return { reGate, fehler, setFehler, erfolg, setErfolg, laeuft, run };
}

// ---- UI-Primitiven ----
export function Feld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

export function Banner({
  ton,
  children,
}: {
  ton: "warnung" | "fehler" | "erfolg";
  children: React.ReactNode;
}) {
  const stil: Record<string, string> = {
    warnung: "border-credo-gelb bg-credo-gelb/10 text-foreground",
    fehler: "border-credo-rot bg-credo-rot/10 text-foreground",
    erfolg: "border-status-gruen bg-status-gruen/10 text-foreground",
  };
  const Icon = ton === "erfolg" ? CheckCircle2 : AlertCircle;
  // aria-live, damit Screen-Reader Erfolg/Fehler nach einer Aktion mitbekommen.
  return (
    <div
      role={ton === "fehler" ? "alert" : "status"}
      aria-live={ton === "fehler" ? "assertive" : "polite"}
      className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${stil[ton]}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  SENT: "Gesendet",
  FAILED: "Fehlgeschlagen",
  SKIPPED: "Uebersprungen",
};

export function StatusBadge({ status }: { status: string }) {
  // Dunkleres Gruen (--color-status-gruen-text) fuer ausreichenden Kontrast zu Weiss (WCAG AA).
  const stil: Record<string, string> = {
    SENT: "bg-status-gruen-text text-white",
    FAILED: "bg-status-rot text-white",
    SKIPPED: "bg-status-gelb text-foreground",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${stil[status] ?? "bg-input"}`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
