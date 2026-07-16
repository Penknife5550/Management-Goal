"use client";

// Tab: SMTP-Konfiguration + Verbindungstest.
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { adminFetch } from "@/lib/admin-client";
import {
  Banner,
  BTN,
  BTN_SEK,
  behandleFehler,
  Feld,
  INPUT,
  type SmtpConfig,
  useAdminAction,
} from "./shared";

export function SmtpTab() {
  const { reGate, fehler, setFehler, erfolg, laeuft, run } = useAdminAction();
  const [config, setConfig] = useState<SmtpConfig | null>(null);
  const [testEmail, setTestEmail] = useState("");

  useEffect(() => {
    adminFetch<SmtpConfig>("/api/settings/smtp", "GET")
      .then(setConfig)
      .catch((e) => behandleFehler(e, reGate, setFehler));
  }, [reGate, setFehler]);

  function set<K extends keyof SmtpConfig>(key: K, value: SmtpConfig[K]) {
    setConfig((c) => (c ? { ...c, [key]: value } : c));
  }

  function speichern() {
    if (!config) return;
    void run(
      "speichern",
      async () => setConfig(await adminFetch<SmtpConfig>("/api/settings/smtp", "PUT", config)),
      "SMTP-Konfiguration gespeichert.",
    );
  }

  function testen() {
    void run(
      "test",
      () => adminFetch("/api/settings/smtp/test", "POST", { testEmail }),
      `Test-Mail an ${testEmail} ausgeloest.`,
    );
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
          <input
            className={INPUT}
            value={config.host}
            onChange={(e) => set("host", e.target.value)}
            placeholder="mail.example.org"
          />
        </Feld>
        <Feld label="Port">
          <input
            className={INPUT}
            type="number"
            min={1}
            max={65535}
            value={config.port}
            onChange={(e) => set("port", Number(e.target.value) || 0)}
          />
        </Feld>
        <Feld label="Benutzername">
          <input
            className={INPUT}
            value={config.username}
            onChange={(e) => set("username", e.target.value)}
            autoComplete="off"
          />
        </Feld>
        <Feld label="Passwort">
          <input
            className={INPUT}
            type="password"
            value={config.password}
            onChange={(e) => set("password", e.target.value)}
            placeholder="unveraendert lassen = leer"
            autoComplete="new-password"
          />
        </Feld>
        <Feld label="Absender-Adresse (From)">
          <input
            className={INPUT}
            type="email"
            value={config.fromEmail}
            onChange={(e) => set("fromEmail", e.target.value)}
            placeholder="cockpit@credo-gruppe.de"
          />
        </Feld>
        <Feld label="Absender-Name">
          <input
            className={INPUT}
            value={config.fromName}
            onChange={(e) => set("fromName", e.target.value)}
          />
        </Feld>
        <Feld label="Antwort-an (Reply-To, optional)">
          <input
            className={INPUT}
            type="email"
            value={config.replyToEmail}
            onChange={(e) => set("replyToEmail", e.target.value)}
          />
        </Feld>
        <Feld label="Verschluesselung">
          <label className="flex items-center gap-2 py-2.5 text-sm">
            <input
              type="checkbox"
              checked={config.secure}
              onChange={(e) => set("secure", e.target.checked)}
            />
            SSL (Port 465) — sonst STARTTLS
          </label>
        </Feld>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={config.isActive}
          onChange={(e) => set("isActive", e.target.checked)}
        />
        SMTP aktiv (E-Mail-Versand eingeschaltet)
      </label>

      <div className="flex items-center gap-3">
        <button onClick={speichern} disabled={laeuft !== null} className={BTN}>
          {laeuft === "speichern" ? "Speichert…" : "Speichern"}
        </button>
      </div>

      <div className="rounded-lg border bg-muted p-4">
        <p className="mb-2 text-sm font-medium">Verbindung testen</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className={`${INPUT} flex-1`}
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="test@empfaenger.de"
            aria-label="Test-Empfaenger"
          />
          <button onClick={testen} disabled={laeuft !== null || !testEmail} className={BTN_SEK}>
            {laeuft === "test" ? "Sendet…" : "Test-Mail senden"}
          </button>
        </div>
      </div>
    </div>
  );
}
