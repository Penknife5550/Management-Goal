"use client";

// ============================================================
// Einstellungen: SMTP, E-Mail-Vorlagen, Versandprotokoll.
// Uebergangs-Schutz per Admin-Token-Gate (bis RBAC, Phase 4).
// ============================================================
import { AlertCircle, CheckCircle2, Lock, Mail, ScrollText, Send } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { adminFetch, clearAdminToken, setAdminToken } from "@/lib/admin-client";

type Tab = "smtp" | "vorlagen" | "protokoll";

// Wird aufgerufen, wenn ein Tab-Request nach dem Mount UNAUTHORIZED liefert
// (Token abgelaufen/geaendert): Token verwerfen und zurueck zum Gate.
const ReGateContext = createContext<() => void>(() => {});

// Zentrale Fehlerbehandlung der Tabs: bei UNAUTHORIZED zurueck zum Gate,
// sonst die deutsche Server-Meldung anzeigen.
function behandleFehler(e: unknown, reGate: () => void, setFehler: (s: string | null) => void): void {
  if (e instanceof Error && e.message === "UNAUTHORIZED") {
    reGate();
    return;
  }
  setFehler(e instanceof Error ? e.message : "Aktion fehlgeschlagen.");
}

interface SmtpConfig {
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

interface TemplateRow {
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

interface LogRow {
  id: string;
  event: string;
  recipient: string;
  subject: string;
  status: string;
  detail: string | null;
  isTest: boolean;
  createdAt: string;
}

const INPUT = "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm";
const BTN = "rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50";
const BTN_SEK = "rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium disabled:opacity-50";

export function EinstellungenClient() {
  const [autorisiert, setAutorisiert] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("smtp");

  // Beim Mount pruefen, ob das hinterlegte Token gilt.
  const pruefe = useCallback(async () => {
    try {
      await adminFetch<SmtpConfig>("/api/settings/smtp", "GET");
      setAutorisiert(true);
    } catch (e) {
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
      <nav className="mb-6 flex gap-1 border-b border-border" role="tablist">
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
      role="tab"
      aria-selected={aktiv}
      onClick={onClick}
      className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium ${
        aktiv ? "border-accent text-foreground" : "border-transparent text-muted-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

// =============================================
// Token-Gate
// =============================================
function TokenGate({ onOk }: { onOk: () => void }) {
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
    <div className="mx-auto max-w-md rounded-lg border bg-card p-6">
      <div className="mb-3 flex items-center gap-2 text-foreground">
        <Lock className="h-5 w-5 text-muted-foreground" />
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
        onKeyDown={(e) => e.key === "Enter" && bestaetigen()}
        placeholder="Admin-Token"
        className={INPUT}
        autoFocus
      />
      {fehler && <p className="mt-2 text-sm text-credo-rot">{fehler}</p>}
      <button onClick={bestaetigen} className={`${BTN} mt-4 w-full`}>
        Entsperren
      </button>
    </div>
  );
}

// =============================================
// Reminder-Kill-Switch (global)
// =============================================
function ReminderSwitch() {
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
          enabled ? "bg-status-gruen text-white" : "bg-input text-foreground"
        }`}
      >
        {enabled ? "Aktiv" : "Pausiert"}
      </button>
    </div>
  );
}

// =============================================
// Tab: SMTP
// =============================================
function SmtpTab() {
  const reGate = useContext(ReGateContext);
  const [config, setConfig] = useState<SmtpConfig | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [erfolg, setErfolg] = useState<string | null>(null);
  const [speichert, setSpeichert] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testet, setTestet] = useState(false);

  useEffect(() => {
    adminFetch<SmtpConfig>("/api/settings/smtp", "GET")
      .then(setConfig)
      .catch((e) => behandleFehler(e, reGate, setFehler));
  }, [reGate]);

  function set<K extends keyof SmtpConfig>(key: K, value: SmtpConfig[K]) {
    setConfig((c) => (c ? { ...c, [key]: value } : c));
  }

  async function speichern() {
    if (!config) return;
    setSpeichert(true);
    setFehler(null);
    setErfolg(null);
    try {
      const gespeichert = await adminFetch<SmtpConfig>("/api/settings/smtp", "PUT", config);
      setConfig(gespeichert);
      setErfolg("SMTP-Konfiguration gespeichert.");
    } catch (e) {
      behandleFehler(e, reGate, setFehler);
    } finally {
      setSpeichert(false);
    }
  }

  async function testen() {
    setTestet(true);
    setFehler(null);
    setErfolg(null);
    try {
      await adminFetch("/api/settings/smtp/test", "POST", { testEmail });
      setErfolg(`Test-Mail an ${testEmail} ausgeloest.`);
    } catch (e) {
      behandleFehler(e, reGate, setFehler);
    } finally {
      setTestet(false);
    }
  }

  if (!config) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-5">
      {!config.encryptionConfigured && (
        <Banner ton="warnung">
          ENCRYPTION_KEY fehlt — ein SMTP-Passwort kann nicht sicher gespeichert werden.
        </Banner>
      )}
      {!config.isActive && (
        <Banner ton="warnung">
          SMTP ist nicht aktiv — es werden derzeit keine E-Mails versendet.
        </Banner>
      )}
      {fehler && <Banner ton="fehler">{fehler}</Banner>}
      {erfolg && <Banner ton="erfolg">{erfolg}</Banner>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Feld label="Host">
          <input className={INPUT} value={config.host} onChange={(e) => set("host", e.target.value)} placeholder="mail.example.org" />
        </Feld>
        <Feld label="Port">
          <input className={INPUT} type="number" value={config.port} onChange={(e) => set("port", Number(e.target.value))} />
        </Feld>
        <Feld label="Benutzername">
          <input className={INPUT} value={config.username} onChange={(e) => set("username", e.target.value)} autoComplete="off" />
        </Feld>
        <Feld label="Passwort">
          <input className={INPUT} type="password" value={config.password} onChange={(e) => set("password", e.target.value)} placeholder="unveraendert lassen = leer" autoComplete="new-password" />
        </Feld>
        <Feld label="Absender-Adresse (From)">
          <input className={INPUT} value={config.fromEmail} onChange={(e) => set("fromEmail", e.target.value)} placeholder="cockpit@credo-gruppe.de" />
        </Feld>
        <Feld label="Absender-Name">
          <input className={INPUT} value={config.fromName} onChange={(e) => set("fromName", e.target.value)} />
        </Feld>
        <Feld label="Antwort-an (Reply-To, optional)">
          <input className={INPUT} value={config.replyToEmail} onChange={(e) => set("replyToEmail", e.target.value)} />
        </Feld>
        <Feld label="Verschluesselung">
          <label className="flex items-center gap-2 py-2.5 text-sm">
            <input type="checkbox" checked={config.secure} onChange={(e) => set("secure", e.target.checked)} />
            SSL (Port 465) — sonst STARTTLS
          </label>
        </Feld>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={config.isActive} onChange={(e) => set("isActive", e.target.checked)} />
        SMTP aktiv (E-Mail-Versand eingeschaltet)
      </label>

      <div className="flex items-center gap-3">
        <button onClick={speichern} disabled={speichert} className={BTN}>
          {speichert ? "Speichert…" : "Speichern"}
        </button>
      </div>

      <div className="rounded-lg border bg-muted p-4">
        <p className="mb-2 text-sm font-medium">Verbindung testen</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input className={`${INPUT} flex-1`} value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="test@empfaenger.de" />
          <button onClick={testen} disabled={testet || !testEmail} className={BTN_SEK}>
            {testet ? "Sendet…" : "Test-Mail senden"}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================
// Tab: Vorlagen
// =============================================
function VorlagenTab() {
  const reGate = useContext(ReGateContext);
  const [rows, setRows] = useState<TemplateRow[] | null>(null);
  const [aktiv, setAktiv] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [erfolg, setErfolg] = useState<string | null>(null);
  const [speichert, setSpeichert] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  useEffect(() => {
    adminFetch<TemplateRow[]>("/api/settings/email-templates", "GET")
      .then((r) => {
        setRows(r);
        setAktiv(r[0]?.event ?? null);
      })
      .catch((e) => behandleFehler(e, reGate, setFehler));
  }, [reGate]);

  const row = rows?.find((r) => r.event === aktiv) ?? null;

  function patch(p: Partial<TemplateRow>) {
    setRows((rs) => rs?.map((r) => (r.event === aktiv ? { ...r, ...p } : r)) ?? rs);
  }

  async function speichern() {
    if (!row) return;
    setSpeichert(true);
    setFehler(null);
    setErfolg(null);
    try {
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
      setErfolg("Vorlage gespeichert.");
    } catch (e) {
      behandleFehler(e, reGate, setFehler);
    } finally {
      setSpeichert(false);
    }
  }

  async function testen() {
    if (!row) return;
    setFehler(null);
    setErfolg(null);
    try {
      await adminFetch("/api/settings/email-templates/test", "POST", { event: row.event, testEmail });
      setErfolg(`Test-Mail an ${testEmail} ausgeloest.`);
    } catch (e) {
      behandleFehler(e, reGate, setFehler);
    }
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
        <button onClick={speichern} disabled={speichert} className={BTN}>
          {speichert ? "Speichert…" : "Vorlage speichern"}
        </button>
        <div className="flex flex-1 gap-2">
          <input className={`${INPUT} flex-1`} value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="Test an…" />
          <button onClick={testen} disabled={!testEmail} className={BTN_SEK}>
            Testversand
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================
// Tab: Protokoll
// =============================================
function ProtokollTab() {
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    SENT: "bg-status-gruen text-white",
    FAILED: "bg-status-rot text-white",
    SKIPPED: "bg-status-gelb text-foreground",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] ?? "bg-input"}`}>
      {status}
    </span>
  );
}

// =============================================
// Kleine UI-Bausteine
// =============================================
function Feld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function Banner({ ton, children }: { ton: "warnung" | "fehler" | "erfolg"; children: React.ReactNode }) {
  const stil: Record<string, string> = {
    warnung: "border-credo-gelb bg-credo-gelb/10 text-foreground",
    fehler: "border-credo-rot bg-credo-rot/10 text-foreground",
    erfolg: "border-status-gruen bg-status-gruen/10 text-foreground",
  };
  const Icon = ton === "erfolg" ? CheckCircle2 : AlertCircle;
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${stil[ton]}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
