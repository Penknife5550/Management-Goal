// ============================================================
// src/lib/constants.ts
// Zentrale Konstanten (CLAUDE.md: Constants zentral halten).
// ============================================================

// Harte WIG-Grenze: max. so viele Ziele duerfen gleichzeitig im FOKUS sein.
// Begruendung: 4DX/Collins/OKR-Forschung (siehe RECHERCHE Abschnitt 3).
export const WIG_LIMIT = 3;

// Hartcodierter Test-Kontext (kein Multi-User in diesem Slice, Phase 4 folgt).
export const TEST_USER_ID = "test-user-fuehrungskraft";
export const TEST_RECHTSEINHEIT_ID = "test-rechtseinheit-verwaltung";

// Schwelle, ab der der Countdown sanft hervorgehoben wird (Pacing, keine Drohuhr).
export const COUNTDOWN_WARN_TAGE = 7;

// Eine WIG gilt als "faellig" fuer den Wochen-Check-in, wenn ihr letzter Check-in
// (ersatzweise die Anlage) so viele Tage zurueckliegt. Einzige Quelle fuer UI
// (Stale-Badge) und Server (Reminder-Auswahl).
export const CHECKIN_FAELLIG_TAGE = 7;

// Retention: Aufbewahrung der Mail-/Reminder-Protokolle (DSGVO + unbegrenztes
// Wachstum vermeiden). EmailLog enthaelt personenbezogene Empfaenger-Adressen.
// CheckIn-Historie wird bewusst NICHT bereinigt (Adoptions-Trends, Phase 3).
export const RETENTION_EMAILLOG_TAGE = 180;
export const RETENTION_DISPATCH_TAGE = 90;

// Idempotenz-Keys der KI-Callbacks muessen nur so lange leben, dass sie
// verspaetete n8n-Retries abfangen. 30 Tage sind grosszuegig.
export const RETENTION_IDEMPOTENCY_TAGE = 30;

// ---- Insight-Motor (AP 1): Schwellenwerte der deterministischen Regeln ----
// Watermelon: ein FOKUS-Ziel wirkt aussen gut (Fortschritt >= MIN oder Ampel
// gruen), aber die steuerbaren Lead Measures sind unter MAX erfuellt.
export const WATERMELON_FORTSCHRITT_MIN = 70;
export const WATERMELON_LEAD_MAX = 0.4;
// Fokus-Leck: Anteil in Q3 (dringend, nicht wichtig), ab dem gewarnt wird.
export const FOKUSLECK_Q3_WARN = 0.3;
// Zombie: Backlog-Ziel so viele Tage unveraendert -> Streich-Kandidat (Drucker).
export const ZOMBIE_TAGE = 90;

// Startseite /heute (AP 2): so viele der wichtigsten Insights werden angezeigt
// (nach Schwere sortiert). Der Rest bleibt im /api/insights-Vollbild.
export const TOP_INSIGHTS_ANZAHL = 4;
