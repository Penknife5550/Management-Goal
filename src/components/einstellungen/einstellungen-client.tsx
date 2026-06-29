"use client";

// ============================================================
// Einstellungen-Shell: Token-Gate + Tab-Navigation (SMTP, Vorlagen, Protokoll).
// Die einzelnen Tabs liegen in eigenen Dateien; gemeinsame Bausteine in shared.tsx.
// Uebergangs-Schutz per Admin-Token-Gate (bis RBAC, Phase 4).
// ============================================================
import { Mail, ScrollText, Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { adminFetch, clearAdminToken } from "@/lib/admin-client";
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

  // Beim Mount pruefen, ob das hinterlegte Token gilt.
  const pruefe = useCallback(async () => {
    try {
      await adminFetch("/api/settings/smtp", "GET");
      setAutorisiert(true);
    } catch (e) {
      // Netzwerk-/Serverfehler nicht als Token-Fehlschlag werten.
      setAutorisiert((e as Error).message === "UNAUTHORIZED" ? false : true);
    }
  }, []);

  useEffect(() => {
    void pruefe();
  }, [pruefe]);

  // Token verwerfen und Gate erneut zeigen (bei UNAUTHORIZED aus einem Tab).
  const reGate = useCallback(() => {
    clearAdminToken();
    setAutorisiert(false);
  }, []);

  if (autorisiert === null) return <Skeleton className="h-40 w-full" />;
  if (!autorisiert) return <TokenGate onOk={() => void pruefe()} />;

  return (
    <ReGateContext.Provider value={reGate}>
      <ReminderSwitch />
      <nav className="mb-6 flex gap-1 border-b border-border">
        <TabButton aktiv={tab === "smtp"} onClick={() => setTab("smtp")} icon={<Mail className="h-4 w-4" />}>
          SMTP
        </TabButton>
        <TabButton aktiv={tab === "vorlagen"} onClick={() => setTab("vorlagen")} icon={<Send className="h-4 w-4" />}>
          Vorlagen
        </TabButton>
        <TabButton aktiv={tab === "protokoll"} onClick={() => setTab("protokoll")} icon={<ScrollText className="h-4 w-4" />}>
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
