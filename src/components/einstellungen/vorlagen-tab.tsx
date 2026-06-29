"use client";

// Tab: E-Mail-Vorlagen je Event bearbeiten + Testversand.
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { adminFetch } from "@/lib/admin-client";
import { Banner, BTN, BTN_SEK, behandleFehler, Feld, INPUT, type TemplateRow, useAdminAction } from "./shared";

export function VorlagenTab() {
  const { reGate, fehler, setFehler, erfolg, laeuft, run } = useAdminAction();
  const [rows, setRows] = useState<TemplateRow[] | null>(null);
  const [aktiv, setAktiv] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");

  useEffect(() => {
    adminFetch<TemplateRow[]>("/api/settings/email-templates", "GET")
      .then((r) => {
        setRows(r);
        setAktiv(r[0]?.event ?? null);
      })
      .catch((e) => behandleFehler(e, reGate, setFehler));
  }, [reGate, setFehler]);

  const row = rows?.find((r) => r.event === aktiv) ?? null;

  function patch(p: Partial<TemplateRow>) {
    setRows((rs) => rs?.map((r) => (r.event === aktiv ? { ...r, ...p } : r)) ?? rs);
  }

  function speichern() {
    if (!row) return;
    void run(
      "speichern",
      async () => {
        await adminFetch("/api/settings/email-templates", "PUT", {
          event: row.event,
          name: row.name,
          subject: row.subject,
          bodyHtml: row.bodyHtml,
          bodyText: row.bodyText || null,
          recipientTo: row.recipientTo,
          recipientCc: row.recipientCc,
          recipientBcc: row.recipientBcc,
          recipientReplyTo: row.recipientReplyTo,
          isActive: row.isActive,
        });
        patch({ source: "db" });
      },
      "Vorlage gespeichert.",
    );
  }

  function testen() {
    if (!row) return;
    void run(
      "test",
      () => adminFetch("/api/settings/email-templates/test", "POST", { event: row.event, testEmail }),
      `Test-Mail an ${testEmail} ausgeloest.`,
    );
  }

  if (!rows) return <Skeleton className="h-64 w-full" />;
  if (!row) return <p className="text-sm text-muted-foreground">Keine Vorlagen vorhanden.</p>;

  return (
    <div className="space-y-5">
      {rows.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {rows.map((r) => (
            <button
              key={r.event}
              onClick={() => setAktiv(r.event)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                r.event === aktiv ? "bg-accent text-accent-foreground" : "border border-input"
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}

      {fehler && <Banner ton="fehler">{fehler}</Banner>}
      {erfolg && <Banner ton="erfolg">{erfolg}</Banner>}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Empfaenger: {row.recipientHint} ·{" "}
          <span className={row.source === "db" ? "text-foreground" : ""}>
            Quelle: {row.source === "db" ? "gespeichert" : "Code-Default"}
          </span>
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={row.isActive} onChange={(e) => patch({ isActive: e.target.checked })} />
          aktiv
        </label>
      </div>

      <Feld label="Betreff">
        <input className={INPUT} value={row.subject} onChange={(e) => patch({ subject: e.target.value })} />
      </Feld>

      <div className="grid gap-4 sm:grid-cols-2">
        <Feld label="An (leer = Standard)">
          <input className={INPUT} value={row.recipientTo} onChange={(e) => patch({ recipientTo: e.target.value })} placeholder={row.defaultRecipientTo} />
        </Feld>
        <Feld label="Antwort-an (optional)">
          <input className={INPUT} value={row.recipientReplyTo} onChange={(e) => patch({ recipientReplyTo: e.target.value })} />
        </Feld>
      </div>

      <Feld label="HTML-Inhalt">
        <textarea className={`${INPUT} h-48 font-mono text-xs`} value={row.bodyHtml} onChange={(e) => patch({ bodyHtml: e.target.value })} />
      </Feld>
      <Feld label="Text-Inhalt (Fallback, optional)">
        <textarea className={`${INPUT} h-24 font-mono text-xs`} value={row.bodyText} onChange={(e) => patch({ bodyText: e.target.value })} />
      </Feld>

      <div className="rounded-lg border bg-muted p-3">
        <p className="mb-1 text-xs font-medium">Verfuegbare Variablen</p>
        <div className="flex flex-wrap gap-2">
          {row.variables.map((v) => (
            <span key={v.key} className="rounded bg-background px-2 py-0.5 text-xs" title={v.description}>
              {v.key}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button onClick={speichern} disabled={laeuft !== null} className={BTN}>
          {laeuft === "speichern" ? "Speichert…" : "Vorlage speichern"}
        </button>
        <div className="flex flex-1 gap-2">
          <input
            className={`${INPUT} flex-1`}
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="Test an…"
            aria-label="Test-Empfaenger"
          />
          <button onClick={testen} disabled={laeuft !== null || !testEmail} className={BTN_SEK}>
            {laeuft === "test" ? "Sendet…" : "Testversand"}
          </button>
        </div>
      </div>
    </div>
  );
}
