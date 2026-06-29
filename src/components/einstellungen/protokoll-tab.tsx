"use client";

// Tab: Versandprotokoll (letzte 100 Eintraege).
import { useContext, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { adminFetch } from "@/lib/admin-client";
import { Banner, behandleFehler, type LogRow, ReGateContext, StatusBadge } from "./shared";

export function ProtokollTab() {
  const reGate = useContext(ReGateContext);
  const [logs, setLogs] = useState<LogRow[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    adminFetch<LogRow[]>("/api/settings/email-log", "GET")
      .then(setLogs)
      .catch((e) => behandleFehler(e, reGate, setFehler));
  }, [reGate]);

  if (fehler) return <Banner ton="fehler">{fehler}</Banner>;
  if (!logs) return <Skeleton className="h-64 w-full" />;
  if (logs.length === 0)
    return <p className="text-sm text-muted-foreground">Noch keine Versand-Eintraege.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="border-b border-border">
            <th className="py-2 pr-3">Zeit</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2 pr-3">Empfaenger</th>
            <th className="py-2 pr-3">Betreff</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id} className="border-b border-border/60 align-top">
              <td className="py-2 pr-3 whitespace-nowrap text-xs text-muted-foreground">
                {new Date(l.createdAt).toLocaleString("de-DE")}
              </td>
              <td className="py-2 pr-3">
                <StatusBadge status={l.status} />
                {l.detail && <p className="mt-1 text-xs text-muted-foreground">{l.detail}</p>}
              </td>
              <td className="py-2 pr-3 text-xs">{l.recipient || "—"}</td>
              <td className="py-2 pr-3 text-xs">
                {l.isTest && <span className="mr-1 text-muted-foreground">[Test]</span>}
                {l.subject}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
