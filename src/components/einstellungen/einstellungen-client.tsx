"use client";

// ============================================================
// Einstellungen-Shell: Rollen-Gate + Tab-Navigation (SMTP, Vorlagen, Protokoll).
// Die einzelnen Tabs liegen in eigenen Dateien; gemeinsame Bausteine in shared.tsx.
// Zugriff nur fuer Administratoren (Rollen-Check via GET /api/auth/session;
// serverseitig schuetzt withAdmin die Endpunkte).
// ============================================================
import { Mail, ScrollText, Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProtokollTab } from "./protokoll-tab";
import { ReminderSwitch } from "./reminder-switch";
import { ReGateContext } from "./shared";
import { SmtpTab } from "./smtp-tab";
import { TokenGate } from "./token-gate";
import { VorlagenTab } from "./vorlagen-tab";

type Tab = "smtp" | "vorlagen" | "protokoll";

export function EinstellungenClient() {
  const [autorisiert, setAutorisiert] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("smtp");

  // Beim Mount die Session-Rolle pruefen (nur Administratoren sehen die Tabs).
  const pruefe = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      const json = (await res.json().catch(() => null)) as { data?: { rolle?: string } } | null;
      if (res.ok) {
        setAutorisiert(json?.data?.rolle === "ADMIN");
      } else {
        // 401 = nicht angemeldet -> Gate; andere Serverfehler nicht als Verbot werten.
        setAutorisiert(res.status !== 401);
      }
    } catch {
      // Netzwerkfehler nicht als fehlende Berechtigung werten (Server schuetzt ohnehin).
      setAutorisiert(true);
    }
  }, []);

  useEffect(() => {
    void pruefe();
  }, [pruefe]);

  // Gate erneut zeigen (bei UNAUTHORIZED aus einem Tab, z.B. Session abgelaufen).
  const reGate = useCallback(() => {
    setAutorisiert(false);
  }, []);

  if (autorisiert === null) return <Skeleton className="h-40 w-full" />;
  if (!autorisiert) return <TokenGate />;

  return (
    <ReGateContext.Provider value={reGate}>
      <ReminderSwitch />
      <nav className="mb-6 flex gap-1 border-b border-border">
        <TabButton
          aktiv={tab === "smtp"}
          onClick={() => setTab("smtp")}
          icon={<Mail className="h-4 w-4" />}
        >
          SMTP
        </TabButton>
        <TabButton
          aktiv={tab === "vorlagen"}
          onClick={() => setTab("vorlagen")}
          icon={<Send className="h-4 w-4" />}
        >
          Vorlagen
        </TabButton>
        <TabButton
          aktiv={tab === "protokoll"}
          onClick={() => setTab("protokoll")}
          icon={<ScrollText className="h-4 w-4" />}
        >
          Protokoll
        </TabButton>
      </nav>

      {tab === "smtp" && <SmtpTab />}
      {tab === "vorlagen" && <VorlagenTab />}
      {tab === "protokoll" && <ProtokollTab />}
    </ReGateContext.Provider>
  );
}

function TabButton({
  aktiv,
  onClick,
  icon,
  children,
}: {
  aktiv: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={aktiv ? "true" : undefined}
      className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium ${
        aktiv ? "border-accent text-foreground" : "border-transparent text-muted-foreground"
      }`}
    >
      <span aria-hidden="true">{icon}</span>
      {children}
    </button>
  );
}
