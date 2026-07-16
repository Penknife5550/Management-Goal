"use client";

import { AlertCircle, CheckCircle2, LogIn, Mail, X } from "lucide-react";
import { useState } from "react";
import { senden } from "@/lib/client";

interface Props {
  // true, wenn ein Magic-Link ungueltig/abgelaufen war (?fehler=link).
  linkFehler: boolean;
}

// Anmelde-Formular: Passwort-Login als Hauptweg, darunter dezent der
// Anmelde-Link per E-Mail (nutzt dasselbe E-Mail-Feld).
export function LoginClient({ linkFehler }: Props) {
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [fehler, setFehler] = useState<string | null>(
    linkFehler ? "Der Anmelde-Link ist ungueltig oder abgelaufen." : null,
  );
  const [hinweis, setHinweis] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState<"login" | "link" | null>(null);

  async function anmelden(event: React.FormEvent) {
    event.preventDefault();
    if (laeuft) return;
    setFehler(null);
    setHinweis(null);
    setLaeuft("login");
    try {
      await senden("/api/auth/login", "POST", { email: email.trim(), password: passwort });
      window.location.assign("/heute");
    } catch (e) {
      setFehler(
        e instanceof Error ? e.message : "Anmeldung fehlgeschlagen. Bitte erneut versuchen.",
      );
      setLaeuft(null);
    }
  }

  async function linkAnfordern() {
    if (laeuft) return;
    const adresse = email.trim();
    if (!adresse) {
      setFehler("Bitte zuerst deine E-Mail-Adresse eintragen.");
      return;
    }
    setFehler(null);
    setHinweis(null);
    setLaeuft("link");
    try {
      await senden("/api/auth/magic-link", "POST", { email: adresse });
      setHinweis("Falls ein Konto existiert, wurde ein Link gesendet.");
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Aktion fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setLaeuft(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {fehler && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-status-rot/40 bg-status-rot/10 px-4 py-3 text-sm"
        >
          <AlertCircle size={18} className="text-status-rot" aria-hidden="true" />
          <span className="flex-1">{fehler}</span>
          <button
            type="button"
            onClick={() => setFehler(null)}
            aria-label="Meldung schließen"
            className="rounded-md p-1 hover:bg-muted"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {hinweis && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-status-gruen/40 bg-status-gruen/10 px-4 py-3 text-sm"
        >
          <CheckCircle2 size={18} className="text-status-gruen-text" aria-hidden="true" />
          <span className="flex-1">{hinweis}</span>
        </div>
      )}

      <form onSubmit={anmelden} className="flex flex-col gap-4 rounded-lg border bg-card p-6">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="login-email" className="text-sm font-medium">
            E-Mail
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            maxLength={254}
            disabled={laeuft !== null}
            className="rounded-lg border border-input bg-background px-4 py-2.5 text-sm disabled:opacity-60"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="login-passwort" className="text-sm font-medium">
            Passwort
          </label>
          <input
            id="login-passwort"
            type="password"
            value={passwort}
            onChange={(e) => setPasswort(e.target.value)}
            autoComplete="current-password"
            required
            maxLength={256}
            disabled={laeuft !== null}
            className="rounded-lg border border-input bg-background px-4 py-2.5 text-sm disabled:opacity-60"
          />
        </div>

        <button
          type="submit"
          disabled={laeuft !== null}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          <LogIn size={16} aria-hidden="true" />
          {laeuft === "login" ? "Wird angemeldet …" : "Anmelden"}
        </button>
      </form>

      {/* Dezente Alternative: Einmal-Link per Mail (nutzt das E-Mail-Feld oben). */}
      <div className="text-center text-sm text-muted-foreground">
        Oder{" "}
        <button
          type="button"
          onClick={linkAnfordern}
          disabled={laeuft !== null}
          className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground disabled:opacity-60"
        >
          <Mail size={14} aria-hidden="true" />
          {laeuft === "link" ? "Link wird gesendet …" : "Anmelde-Link per E-Mail"}
        </button>
      </div>
    </div>
  );
}
