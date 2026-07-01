# STATUS & Übergabe — Führungs-Cockpit

> **AKTUELLER STAND: 2026-07-01 — Phase 2 komplett + Aufgaben-/Eisenhower-Modul (Schritte 1–4).**
> Letzter Commit (lokal = Remote): `e55001a` (Feature-Landung `b6ae939`). Branch `main`. Working Tree sauber.
> GoLive-Status: 🟢 (kein Critical, keine blockierenden Majors).
>
> **Was steht:** Phase 1 (Goal/WIG-Modul) + Phase 2 vollständig — Wochen-Check-in,
> SMTP-Mailer + Wochen-Reminder, Q2-Schutz/Fokuszeit, Small-Wins, plus 2 vollständige
> 7-Agenten-Code-Reviews mit behobenen Blockern und Aufräum-Backlog.
> Details: Abschnitte **8 (SMTP/Reminder) · 9 (Check-in) · 10 (Q2) · 11 (Review+Blocker)
> · 12 (Aufräum M1/M7/M8)**.
>
> **Verifiziert:** `tsc` sauber · Unit-Tests **94/94** · Production-Build grün.
>
> **NEU (2026-06-30): Aufgaben-Modul + Eisenhower-Matrix (manuell) gebaut** — Schritte 1–4
> des KI-Eisenhower-Plans. Siehe **Abschnitt 14**.
> **NEU (2026-07-01): Schritt 5 — KI-Eisenhower, Cockpit-Seite komplett gebaut** (Lib,
> API classify/callback/accept/reject, UI-Badge, Idempotenz-Modell, Tests). `tsc` sauber,
> KI-Tests 16 + Gesamt-Unit grün. Der **n8n-Workflow** liegt importierbar unter `n8n/`
> (`ki-eisenhower.workflow.json` + README). Siehe **Abschnitt 14 → „Schritt 5 (gebaut)"**.
> **NÄCHSTER SCHRITT:** n8n-Workflow importieren + 2 Infra-Punkte klären (Modellwahl,
> Callback-Erreichbarkeit), dann End-to-End-Smoke.
>
> **▶ WIEDEREINSTIEG MORGEN (2026-07-02):**
> - n8n-Workflow ist **live**: `https://n8n.fes-minden.de/webhook/ki-eisenhower` antwortet
>   HTTP 200 (POST leerer Body → PII-Guard stoppt, kein Ollama-Call). Aktiv + erreichbar.
> - Lokale **`.env`** (git-ignored, NICHT im Repo) ist gesetzt: `N8N_EISENHOWER_WEBHOOK_URL`,
>   `AI_CALLBACK_SECRET` (per `openssl rand -hex 24`), `AI_MODEL=qwen2.5:7b`, `APP_URL`.
> - **EINZIGER offener Punkt:** `APP_URL` in der `.env` auf die **öffentliche Cockpit-URL**
>   setzen, die `n8n.fes-minden.de` erreicht (User will Cockpit auf einem Server betreiben —
>   URL steht noch aus). Steht sie, geht der Callback an `<APP_URL>/api/ai/callback`.
> - Dann **E2E-Smoke**: in `/aufgaben` „KI fragen" klicken → n8n → Ollama → Callback →
>   Badge erscheint. Alternativ nur Callback per `curl` testen (Beispiel in `n8n/README.md`).
> - DB starten → `npx prisma migrate dev` wendet `20260701120000_webhook_idempotenz` an.
>
> ---
> _Historie unten: Abschnitte 1–7 beschreiben den Phase-1-Stand (2026-06-21)._

## 1. Wo stehen wir? (historisch — Phase-1-Abschluss)

**Phase 1 (Goal/WIG-Modul, strategische Ebene) ist gebaut, committet und gepusht.**

- Repo: https://github.com/Penknife5550/Management-Goal — Branch `main`
- Eigenes Git-Repo liegt im Ordner `Managemt Software` (getrennt vom Sammelordner `claude_projekte`).
- Letzter Commit (lokal = Remote): `8833e9a`
- Working Tree: sauber.

### Commit-Historie
```
8833e9a test: Entscheidungslogik (409/400) und Countdown-Warnschwelle
82af46a fix(security): CSP/Security-Header, docker-compose haerten
7c39091 fix(ui): A11y, Doppelklick-Schutz, Resync-Rollback, Gruen-Kontrast
88b891a fix(api): DTO-Mapper gegen Feld-Leak, race-sichere WIG-Transaktion, Scope zentralisiert
81a51dc chore: TS-Build-Cache ignorieren
c89e586 docs: README, Strategie-, Recherche- und Bewertungsdokumente
0e9f8b3 test: Unit-Tests (Vitest) und E2E (Playwright)
5efdd77 feat: UI Ziel-Cockpit (Scoreboard, Backlog, Quick-Add, Fokus-Modal)
71fb157 feat: Domaenenlogik (WIG-Limit, Status, Outcome) + REST-API
78a2a27 feat: Datenmodell Goal/WIG (Prisma) + Migration + Seed
ab8b570 chore: Projekt-Fundament, CREDO-Theme und Docker-Setup
```

## 2. Was ist verifiziert / was ist offen

**Grün (verifiziert):**
- TypeScript (`tsc --noEmit`) sauber
- ESLint 0 Fehler, Prettier sauber
- Unit-Tests: **23/23** grün (WIG-Limit, Status-Übergänge, Outcome-Pflicht, Countdown inkl. Grenze, Entscheidungslogik 409/400)
- Webpack-Compile erfolgreich

**Offen (war durch Docker/Speicherdruck blockiert, NACH Reboot nachholen):**
- Finaler `npm run build` (Production) end-to-end
- `npm run test:e2e` (Playwright) Re-Run — 2 Tests, liefen zuvor bereits grün, nur nach den letzten Fixes noch nicht erneut bestätigt

## 3. Nach dem Neustart hochfahren (Schritt für Schritt)

```bash
cd "/Users/dimitririesen/Desktop/claude_projekte/Managemt Software"

# 1) Docker Desktop starten (GUI oder:)
open -a Docker
# warten bis "docker info" ohne Fehler durchläuft

# 2) DB-Container starten (Daten bleiben im Volume cockpit_db_data erhalten)
docker start cockpit-db
# Falls der Container nicht mehr existiert:  docker compose up -d db

# 3) Umgebung setzen
export DATABASE_URL="postgresql://credo:credo_dev_2026@localhost:5433/cockpit?schema=public"

# 4) (nur falls Abhängigkeiten fehlen)  npm install
# 5) (nur bei frischer DB)  npx prisma migrate deploy && npx prisma db seed

# 6) Dev-Server
npm run dev            # -> http://localhost:3000/ziele
```

## 4. Verifikation nachholen
```bash
export DATABASE_URL="postgresql://credo:credo_dev_2026@localhost:5433/cockpit?schema=public"
npm run typecheck && npm run test          # tsc + 23 Unit-Tests
npm run build                              # Production-Build
npx playwright install chromium            # einmalig, falls nötig
npm run test:e2e                           # 2 E2E-Tests
```

## 5. Was man im Dev sieht (`/ziele`)
Header + CREDO-Linie → Quick-Add → First-Run-Empty-State mit Beispiel-Ziel →
nach Anlegen: Backlog ↔ Fokus-Scoreboard (Ampel, Fortschrittsbalken, Countdown-Pacing,
Lead Measures) → „In Fokus"-Modal mit Outcome-Pflicht → „Geschafft"-Delight beim Abschluss.
Visueller Vorgeschmack ohne Backend: die Chat-Mockups `fuehrungs_cockpit_mockup` und
`drucker_cockpit_screens`.

## 6. Bewusst verschobene Review-Punkte (Backlog für später, KEINE Blocker)
- **Perf:** Handler-Memoisierung in `ziele-client.tsx` (useCallback/memo) — relevant erst bei Multi-User-Skalierung.
- **Security/Build:** `npm ci` statt `npm install` + Non-root-Container (`USER node`) im Dockerfile.
- **Tests:** Owner-Scope-404-Integrationstests (brauchen Test-DB-Harness); Lead-Measure-Flow-Tests; E2E für „4. Ziel am WIG-Limit blockiert".
- **UI/Mobile:** Touch-Targets ≥44px, Skip-Link, Mobile-Read-Ansicht — Teil der späteren Mobile-Phase.
- **Arch:** Enum-Single-Source (Prisma/TS/Zod dreifach), Pagination/Virtualisierung des Backlogs bei >mehreren hundert Zielen.
- **DevOps:** Seed aus der Produktions-Startkette nehmen; echte Secrets statt Dev-Default-Passwort.

## 7. Nächster Schritt: PHASE 2 — „Cadence + Delight + erstes KI-Feature"
Macht aus dem Board ein täglich/wöchentlich genutztes Werkzeug (Adoption-Treiber):

1. **Geführter Wochen-Check-in** (Herzstück): ≤20-Min-Flow, der durch jede aktive WIG führt
   (Ampel setzen, Fortschritt, nächste Lead-Measure-Schritte). „stale"-Markierung >7 Tage.
   → **gebaut** (siehe Abschnitt 9).
2. **Benachrichtigungen**: In-App-Center + E-Mail über **eigenes SMTP** (nicht n8n —
   bleibt flexibel, Pattern aus dem HR-Portal übernommen), nutzergesteuert (Frequenz, DND,
   Batching), kein Spam. Erinnerung an Wochen-Check-in.
   → **SMTP-Fundament + Wochen-Reminder bereits gebaut** (siehe Abschnitt 8).
3. **Q2-Schutz**: Funktion, um „wichtig, nicht dringend"-Zeit aktiv zu blocken.
   → **gebaut** (siehe Abschnitt 10).
4. **Small-Wins / Progress-Feedback** (Amabile): sichtbares Feiern kleiner Fortschritte.
   → **gebaut** als Teil des Check-in-Abschlusses (Abschnitt 9).
5. **Erstes KI-Feature: Eisenhower-Vorschlag** im Accept/Reject-Muster mit sichtbarer
   Confidence (KI schlägt vor, überschreibt nie). Anbindung: n8n + Ollama lokal (PII-sicher),
   asynchron, mit 3-Schichten-Webhook-Loop-Schutz (siehe PLAN.md Abschnitt 5).

Grundlagen/Begründung: [PLAN.md](PLAN.md), [RECHERCHE-fuehrungs-cockpit.md](RECHERCHE-fuehrungs-cockpit.md),
[BEWERTUNG-plan-adoption.md](BEWERTUNG-plan-adoption.md).

## 8. Phase 2 — SMTP-Mailer + Wochen-Reminder (gebaut)

Eigener SMTP-Versand statt n8n (Pattern aus dem HR-Portal, auf das Cockpit eingedampft).
Migration: `20260629143848_mail_smtp_phase2`.

**Neue Bausteine**
- DB-Modelle: `SmtpConfig` (Singleton, Passwort AES-256-GCM), `EmailTemplate` (editierbar je Event),
  `EmailLog` (Versandprotokoll), `AppSetting` (globaler Reminder-Kill-Switch).
  Felder: `User.emailRemindersEnabled` (Pro-User-Consent), `Goal.lastCheckinAt` (Reminder-Signal).
- Libs: `encryption.ts`, `mailer.ts`, `email-events.ts`, `default-email-templates.ts`,
  `reminders.ts` (Auswahl + Dispatch), `admin-guard.ts` (Token + Rate-Limit + Cron-Secret).
- API: `/api/settings/smtp` (+`/test`), `/api/settings/email-templates` (+`/test`),
  `/api/settings/email-log`, `/api/settings/reminders`, `/api/cron/reminders`.
- UI: `/einstellungen` (Tabs SMTP · Vorlagen · Protokoll · Reminder-Switch), Token-Gate.

**Neue ENV** (siehe `.env.example`): `ENCRYPTION_KEY`, `ADMIN_TOKEN`, `CRON_SECRET`,
`APP_URL`, `MAIL_DRY_RUN` (Dev: "1" = kein echter Versand).

**Reminder-Logik**: FOKUS-WIG ohne Check-in > 7 Tage → eine gebündelte Mail je Owner
(Consent + globaler Switch respektiert), CTA auf `/ziele`. **Idempotenz race-sicher** über
`ReminderDispatch` mit Unique-Constraint `(recipient, event, periodKey=ISO-Woche)`: vor dem
Versand wird reserviert, ein zweiter (auch paralleler) Lauf läuft in P2002 und überspringt.
Trigger: Host-Cron (Europe/Berlin), z. B. `0 8 * * 1`, ruft `/api/cron/reminders` mit
`Authorization: Bearer $CRON_SECRET`.

**Code-Review-Nachzug (Commit nach 99c8f34)** — 5 GoLive-Blocker behoben:
- C1 Doppelversand: `findFirst`+`create` → atomare `ReminderDispatch`-Reservierung (s. o.).
- C2 XSS/Header-Injection: Betreff CRLF-bereinigt; HTML-Escaping per Unit- **und** End-to-End-Test belegt.
- M1 Relay-Schutz: optionale `MAIL_ALLOWED_DOMAINS`-Allowlist in Empfänger- und `overrideTo`-Pfad.
- M2 Info-Leak: rohe SMTP-Fehler nur ins Server-Log, nach außen kategorisierte deutsche Meldung.
- M3 Auth: UNAUTHORIZED in den Tabs führt zurück zum Token-Gate (statt „UNAUTHORIZED"-Banner).
- Offen (Backlog, kein Blocker): Perf-Skalierung (N+1/Pool/Index), `einstellungen-client.tsx` aufteilen,
  Token-Guards DRY, A11y (ARIA-Tabs/aria-live/Grün-Kontrast), EmailLog-Retention.

**Aufräum-Sprint (Commit nach 68e4968)** — Review-Backlog M4–M7 abgearbeitet:
- M4 Perf: SMTP-Transporter wird gepoolt (signatur-basierter Cache, `pool:true`) statt pro Mail neu.
- M5 Wartbarkeit: `einstellungen-client.tsx` in Shell + `shared.tsx` (Typen/UI/`useAdminAction`-Hook)
  + je Tab eine Datei (smtp/vorlagen/protokoll) + token-gate/reminder-switch aufgeteilt.
- M6: Token-Guards über gemeinsamen `vergleicheSecret`/`pruefeSecret`-Helper entdoppelt.
- M7 A11y: irreführende ARIA-Tab-Rollen entfernt, `aria-live` an Banner, Grün-Kontrast (dunkleres Grün),
  Testversand mit Lade-Status, `type="email"`/Labels an Test-Inputs, deutsche Status-Labels.
- MINOR: `encryption.ts` gehärtet (Key exakt 64, Entschlüsselungs-Fehler werfen statt Klartext),
  `email-log` liefert nur Anzeigefelder, Import-Pfade auf `@/`-Alias.
- Tests: +11 (Encryption-Roundtrip/Mismatch, Validierung) → 57/57 grün.
- Echter Rest-Backlog: EmailLog-Retention/DSGVO; In-Memory-Rate-Limiter zentralisieren (Multi-Instanz).

**Bewusste Grenzen / offene Punkte**
- **Admin-Guard ist ein Übergang**: `ADMIN_TOKEN`-Header statt RBAC. In Phase 4 ersetzen.
- **Pro-User-Reminder-Schalter** existiert als Feld, aber noch ohne eigene Profil-UI (Phase 4).
- **Variablen werden im HTML-Body escaped** (Injection-Schutz).
- **Deliverability offen**: Welcher echte SMTP-Relay? SPF/DKIM/DMARC der Absender-Domain
  müssen passen, sonst landen Mails im Spam. → mit IT klären.
- **EmailLog-Retention** (personenbezogene Empfänger) noch ohne Löschkonzept.

**Verifiziert**: `tsc` sauber · Unit-Tests **33/33** grün (inkl. 10 neue Reminder-Tests)
· Migration angewandt. Offen: Production-Build-Re-Run und manueller Test-Versand mit echtem SMTP.

## 9. Phase 2 — Geführter Wochen-Check-in (gebaut)

Das 4DX-Kadenzritual, das den Reminder-Kreis schließt. Migration: `check_in_historie`.

**Neue Bausteine**
- DB: `CheckIn` (Snapshot je WIG pro Session: `sessionId/ownerId/goalId/ampel/fortschritt`,
  Indizes für Trends/Sessions); `Goal.lastCheckinAt` wird jetzt geschrieben; `lastCheckinAt` im DTO.
- Domäne: `lib/check-in.ts` (`tageSeitCheckin`, `istCheckinFaellig`); Schwelle zentral als
  `CHECKIN_FAELLIG_TAGE` in constants (eine Quelle, auch vom Reminder genutzt → `STALE_TAGE`).
- API: `POST /api/check-in` — eine Transaktion: je WIG Ampel/Fortschritt + Lead-Istwerte +
  `lastCheckinAt=now` + History-Snapshot (sessionId). Owner-/FOKUS-Scope erzwungen.
- UI: Seite `/check-in` + Stepper (`check-in-client.tsx`): WIG für WIG, vorausgefüllt, Abschluss-
  Moment (Peak-End). Einstieg-Button auf `/ziele`. **Stale-Badge** auf WIG-Karten (>7 Tage).
- Reminder-CTA zeigt jetzt auf `/check-in` (Template-HTML+Text, Cron-Link, Sample-Payload).

**Verifiziert**: `tsc` sauber · Tests **63/63** (+6 Check-in) · Build grün · Runtime-Smoke:
Check-in setzt Ampel/Fortschritt/Lead + `lastCheckinAt` + 1 Snapshot; Scope & Validierung → 400.

**Small-Wins / Progress-Feedback** (Amabile, in den Check-in integriert): Der Abschluss-Screen
zeigt den konkreten Fortschritt DIESES Check-ins je WIG — Fortschritts-Plus, verbesserte Ampel,
neu erfüllte Lead Measures (`berechneWin`, Delta gespeicherter Stand → Eingabe). Ehrlich: ohne
Fortschritt ruhige Ermutigung statt Fake-Feier. API liefert `wins` in der Check-in-Antwort.

**Nächste Phase-2-Bausteine** (offen): Q2-Schutz (Zeitblock) · erstes KI-Feature
(Eisenhower-Vorschlag, Accept/Reject).

## 10. Phase 2 — Q2-Schutz / Fokuszeit (gebaut)

Covey/Drucker: wiederkehrende Zeitblöcke für „wichtig, nicht dringend" (WIG-Arbeit),
mit ICS-Export in den eigenen Kalender. Migration: `q2_block`.

**Neue Bausteine**
- DB: `Q2Block` (ownerId, titel, wochentag 1–7, startMinute, dauerMin, optional goalId);
  `Goal.q2Blocks`-Relation (onDelete SetNull).
- Domäne: `lib/q2.ts` (minutenZuHHMM/hhmmZuMinuten, naechstesDatum, **baueICS** — wöchentliche
  RRULE, RFC-5545-Escaping, floating local time Europe/Berlin); `lib/q2-service.ts` (DTO-Mapper).
- API: `GET/POST /api/q2-blocks`, `PATCH/DELETE /api/q2-blocks/[id]`, `GET /api/q2-blocks/ics`
  (text/calendar-Download). Owner-Scope erzwungen; verknüpfte WIG muss dem Nutzer gehören.
- UI: Seite `/fokuszeit` — Anlegen/Bearbeiten/Löschen (Wochentag, Beginn, Dauer, optional WIG),
  Liste, **Kalender-Export (.ics)**. Nav-Link „Fokuszeit" auf `/ziele`.

**Verifiziert**: `tsc` sauber · Tests **74/74** (+7 q2: Zeit, naechstesDatum, ICS) · Build grün ·
Runtime-Smoke: CRUD alle 200, ICS mit korrekten Headern + `RRULE/SUMMARY/DESCRIPTION`,
Validierung & Scope → 400.

**Hinweis ICS**: aktuell Datei-Download (Import in jeden Kalender). Echte Abo-/Sync-URL
(webcal, OAuth) sinnvoll erst mit echter Auth (Phase 4).

**Letzter offener Phase-2-Baustein**: erstes KI-Feature (Eisenhower-Vorschlag, Accept/Reject,
n8n + Ollama) — eigenes, größeres Vorhaben.

## 11. Phase-2-Gesamt-Review + Blocker-Batch (gebaut)

7-Agenten-Review über den kompletten Phase-2-Code (42 Dateien). Ergebnis: 1 CRITICAL,
22 MAJOR (≈8 echte Themen), Rest MINOR/INFO — Fundamente stark, Blocker eng umrissen.

**Behoben (Blocker-Batch)**
- C1 (Error-Handling, CRITICAL): Reminder-Schleife gehärtet — Einzel-DB-Fehler überspringt
  nur den Empfänger (kein `throw`/Lauf-Abbruch); Reservierung wird bei Versand-FAIL wieder
  freigegeben (Retry nächster Lauf, weiter doppelversand-sicher via Unique-Constraint).
- M3 (Security): `fromName` CRLF-bereinigt (Header-Injection) in `smtpConfigSchema`.
- M5 (UI/CodeQuality): zentrales `AMPEL_META` in `goals.ts`; Grün-Kontrast in `wig-karte`
  auf `bg-status-gruen-text` (WCAG AA), AMPELN-Duplikat entfernt.
- M4 (Performance/DSGVO): Retention — `/api/cron/cleanup` (CRON_SECRET) löscht alte EmailLog
  (>180 T) / ReminderDispatch (>90 T); `@@index([createdAt])` auf reminder_dispatch. CheckIn bleibt.
- M6 (Testing): +12 Tests — `dispatchWeeklyReminders` (Prisma-Mock: Kill-Switch/P2002/FAILED-
  Rollback/Einzelfehler), `pruefeCheckinScope` (IDOR), `mapSmtpError` (Leak-Schutz), Empfänger-
  Allowlist To/Cc/Bcc. Außerdem Check-in-Scope als reine Funktion extrahiert (auch M7-Konsistenz).

**M2 war ein False-Positive**: CSP/Security-Header existieren bereits via `next.config.ts`
`headers()` (Phase 1, Commit 82af46a) — der Agent suchte nur nach `middleware.ts`. Runtime
bestätigt: CSP inkl. `connect-src 'self'`/`frame-ancestors 'none'` auf allen Seiten. Ein
testweise angelegtes `src/middleware.ts` ließ den Next-15.5-Build/Runtime hängen
(`e.adapter is not a function`) → wieder entfernt; `next.config`-Weg ist der robuste.

**Verifiziert**: `tsc` sauber · Tests **86/86** · Build grün · Runtime-Smoke: alle Seiten 200,
CSP-Header gesetzt, Reminder/Cleanup laufen, fromName-Umbruch entfernt.

**Offen (separater Aufräum-Commit, kein Blocker)**: M1 Reminder-Perf (Config/Template vor der
Schleife + Batch-Versand), M7 (Enum-Single-Source via `z.nativeEnum`, notify()-Kanal-Grenze),
M8 (`parseBody`/`withAdmin`-Route-Helfer); diverse MINORs (P2025→409, decrypt-Fehler im Test).

## 12. Aufräum-Backlog M1/M7/M8 (gebaut)

Nicht-blockierende Review-Punkte aus dem Phase-2-Gesamt-Review.
- M1 (Performance): Reminder-Versand begrenzt-parallel (`MAIL_BATCH=3`, passend zum
  SMTP-Pool) statt sequenziell blockierend — bounded Wall-Time bei vielen Empfängern.
- M7 (Architektur): Enum-Single-Source — `AMPEL_WERTE`/`GOAL_STATUS_WERTE` in `goals.ts`;
  Typ UND Zod (`validation/goal.ts`) leiten sich daraus ab (keine Dreifachpflege).
  Scope-Konsistenz bereits via `pruefeCheckinScope` (Blocker-Batch). Channel-Abstraktion
  (`notify()`) bewusst NICHT spekulativ vorgezogen — Seam entsteht mit dem In-App-Center.
- M8 (Wartbarkeit): `parseBody(request, schema)` in `api.ts` + `withAdmin(name, handler)`
  in `admin-guard.ts`. Alle 6 Settings-Routen + check-in/q2 nutzen sie → Guard-/try-catch-/
  safeParse-Boilerplate zentralisiert.

**Verifiziert**: `tsc` sauber · Tests **86/86** · Build grün · Regressions-Smoke (Port 3781):
alle Settings-Routen 200, Validierung 400, Cron batched versendet:1, Q2 CRUD 200, SMTP maskiert.

**Umgebungs-Hinweis**: `next start` warf danach intermittierend `ERR_INVALID_PACKAGE_CONFIG`
(Commander) — Node-24.12/Next-15.5-Flakiness im CLI-Bootstrap, NICHT der App-Code (Datei ist
valide, Build/Tests grün, ein vorheriger Start lief). Bei Bedarf `npm ci` / Start erneut.

## 13. NÄCHSTE SESSION — KI-Eisenhower (erst PLANEN/KLÄREN)

Letzter Phase-2-Baustein (PLAN.md Phase 2, Punkt 5): **Eisenhower-Vorschlag im
Accept/Reject-Pattern mit sichtbarer Confidence — KI schlägt vor, überschreibt nie.**
Anbindung laut PLAN: **n8n + Ollama lokal (PII-sicher), asynchron**, mit 3-Schichten-
Webhook-Loop-Schutz (PLAN.md Abschnitt 5). Das ist der größere Brocken mit eigener Infra.

### Wichtige Abhängigkeit (unbedingt zuerst klären!)
Eisenhower klassifiziert **Aufgaben** (wichtig × dringend). Das Cockpit hat aktuell **KEIN
Aufgaben-/Task-Modul** (UI/API) — Phase 1 baute nur die Goal/WIG-Ebene. Das `Task`-Modell
existiert nur als **Schema-Stub** (Felder `important/urgent`, `aiQuadrantSuggestion`,
`aiConfidence`, `aiReasoning`, `lastModifiedBy: EnrichmentSource`) ohne Route/UI.
→ Entweder erst ein schlankes Aufgaben-/Eisenhower-Modul bauen, ODER das „erste KI-Feature"
auf die bestehende WIG-Ebene legen (z.B. KI-Vorschlag für Outcome / next-best-action).
`WebhookIdempotency` (für den Loop-Schutz) ist im Schema **noch nicht** vorhanden.

### Vor dem Bauen mit dem User klären
1. **Scope:** erst Aufgaben-Modul (Eisenhower-Matrix + schlanker Kanban) bauen, oder erstes
   KI-Feature auf WIG-Ebene? (Eisenhower ohne Tasks geht nicht.)
2. **n8n:** Welche Instanz/URL ist erreichbar? Auth/Service-Key? Vom Cockpit-Container erreichbar?
3. **Ollama:** Lokal erreichbar (URL/Modell)? Latenz → wirklich asynchron + Staging?
4. **Datenfluss:** Cockpit → Webhook → n8n → Ollama → Callback; Vorschlag wird gestaged
   (gespeichert), User macht Accept/Reject; Confidence sichtbar. Genau festlegen.
5. **PII-Routing:** Welche Felder gehen an die KI? Bestätigen: PII nur an lokales Ollama,
   nichts in die Cloud.
6. **Loop-Schutz (3 Schichten, PLAN.md §5):** Source-Flag (`lastModifiedBy`), Idempotenz
   (`WebhookIdempotency` — neu anzulegen), Respond-immediately. Im Plan einbauen.

### Wiedereinstieg (hochfahren)
```bash
cd "/Users/dimitririesen/Desktop/claude_projekte/Managemt Software"
docker start cockpit-db
export DATABASE_URL="postgresql://credo:credo_dev_2026@localhost:5433/cockpit?schema=public"
export ENCRYPTION_KEY="<64-hex>"            # siehe .env.example / CLAUDE.md
export ADMIN_TOKEN="<token>"  CRON_SECRET="<secret>"  APP_URL="http://localhost:3000"
export MAIL_DRY_RUN="1"                       # Dev: kein echter Mailversand
npx prisma migrate deploy                     # falls neue Migrationen
npm run typecheck && npm test                 # tsc + 86 Unit-Tests
npx next dev -p 3000                          # -> /ziele /check-in /fokuszeit /einstellungen
```
Hinweis: `next start` (Prod-Modus) warf lokal zuletzt intermittierend
`ERR_INVALID_PACKAGE_CONFIG` (Node-24.12/Next-15.5-Flakiness, nicht der Code) — `next dev`
und der Docker-Build (eigene Node-Version) sind nicht betroffen. Bei Bedarf `npm ci`.

### Referenzen
PLAN.md (Phase 2 Punkt 5; Phase 6 „n8n + KI-Tiefe"; Abschnitt 5 Loop-Schutz) ·
RECHERCHE-fuehrungs-cockpit.md · BEWERTUNG-plan-adoption.md · Memory `mail-via-eigenes-smtp`.

## 14. Aufgaben-Modul + Eisenhower-Matrix (gebaut — Schritte 1–4 des KI-Plans)

Die Voraussetzung für KI-Eisenhower: ein schlankes Aufgaben-Modul mit Eisenhower-Matrix.
Bewusst **erst manuell** (Nutzer setzt wichtig/dringend) — sofort nutzbar, **ohne** KI-Infra.
Die KI-Anbindung (Schritt 5) legt sich rein additiv oben drauf; die DB-/DTO-Felder dafür
sind bereits vorhanden. Entscheidung mit User: „Voll: Eisenhower MIT KI" als Ziel, gebaut
in zwei Schichten (A manuell jetzt, B KI als Nächstes).

**Neue Bausteine**
- DB: `Task.ownerId` ergänzt (+Relation `TaskOwner`, +`@@index([ownerId, status])`) für
  Owner-Scope wie bei Goal. Migration `20260630130603_task_owner_scope`. Der Task-Stub war
  leer → NOT-NULL ohne Default problemlos. `TaskStatus` (TODO/DOING/DONE) und
  `WebhookIdempotency` existierten bereits.
- Domäne: `lib/eisenhower.ts` — `berechneQuadrant(important, urgent)→1..4`,
  `EISENHOWER_QUADRANTEN` (Single-Source: Meta + CREDO-Theme-Farben), `quadrantMeta`,
  `istKiVorschlagOffen` (für das spätere KI-Badge). `TASK_STATUS_WERTE` als App-Single-Source
  (Zod leitet sich ab — keine Doppelpflege).
- API (owner-scoped, nutzt `parseBody`/`jsonOk`/`jsonError`): `GET/POST /api/tasks`,
  `PATCH/DELETE /api/tasks/[id]`. PATCH setzt bei manueller Quadranten-Änderung
  `lastModifiedBy=USER` (Schicht 1 des Loop-Schutzes ist damit schon scharf).
- Service: `lib/task-service.ts` (`findeTaskFuerNutzer` Scope, `toTaskDTO` mit abgeleitetem
  Quadrant + ai-Feldern). `TaskDTO` in `lib/types.ts`.
- UI: Seite `/aufgaben` + `aufgaben-client.tsx` — 2×2-Eisenhower-Matrix (Q1 Tun / Q2 Planen /
  Q3 Delegieren / Q4 Eliminieren), Quick-Add mit Wichtig/Dringend-Toggle + WIG-Verknüpfung,
  Quadrant-Wechsel über Toggles (kein Drag-and-Drop → kein neuer Tech-Stack), Erledigt-Bereich,
  optimistische Updates mit Rollback. Nav-Link auf `/ziele` ergänzt.
- Tests: +8 (`tests/unit/eisenhower.test.ts`) → **94/94** grün.

**Verifiziert**: `tsc` sauber · Unit-Tests **94/94** · Production-Build grün.
(Runtime-Smoke lokal nur eingeschränkt: die Maschine brauchte ~9 Min Dev-Start / ~100 s
pro Route-Compile — Umgebungs-Langsamkeit, kein Code-Problem. API-Logik ist über die
bestehenden Patterns + Unit-Tests abgedeckt; voller Klick-Test bei nächster Gelegenheit.)

### Schritt 5 — KI-Eisenhower (Cockpit-Seite GEBAUT 2026-07-01)
**Status:** Die komplette Cockpit-Seite steht und ist verifiziert (`tsc` sauber, Unit-Tests
grün, ohne laufende DB). Rein additiv — nichts Bestehendes umgebaut. Was gebaut wurde:
- **Schema:** `WebhookIdempotency`-Modell (existierte entgegen der früheren Notiz **noch
  nicht**) + Migration `20260701120000_webhook_idempotenz`. Retention-Cleanup verdrahtet
  (`RETENTION_IDEMPOTENCY_TAGE=30`), Prisma-Client regeneriert.
- **Lib** `src/lib/ai-eisenhower.ts`: `baueKlassifizierungsPrompt` (deutsch, JSON),
  `jobKey` (Content-Hash taskId+Titel), `parseKiAntwort` (validiert, leitet Quadrant aus
  important/urgent ab). Reine Funktionen, unit-getestet.
- **API:** `POST /api/tasks/[id]/classify` (202, feuert n8n mit fertigem Prompt) ·
  `POST /api/ai/callback` (Secret `x-ai-callback-secret`, idempotent via jobKey, schreibt
  NUR ai*-Felder + `lastModifiedBy=AI_OLLAMA`, nie important/urgent) ·
  `…/ai-suggestion/accept` (setzt important/urgent gemäß Quadrant, räumt ai* ab, USER) ·
  `…/ai-suggestion/reject` (räumt ai* ab, USER).
- **UI** `aufgaben-client.tsx`: „KI fragen"-Button, „denkt…"-Polling (90-s-Timeout),
  Vorschlags-Badge mit Übernehmen/Verwerfen + Reasoning, „KI stimmt zu"-Fall.
- **Prompt-Single-Source:** classify sendet den fertigen Prompt mit; n8n baut ihn NICHT.
- **n8n-Workflow:** `n8n/ki-eisenhower.workflow.json` (Webhook onReceived → PII-Guard →
  Ollama lokal → Parse → Callback) + `n8n/README.md`.

**Noch offen für scharf:** Workflow in n8n importieren + aktivieren, `N8N_EISENHOWER_WEBHOOK_URL`
/`AI_CALLBACK_SECRET`/`APP_URL` setzen, die 2 Infra-Punkte klären, End-to-End-Smoke.

---

#### Ursprüngliche Befunde (Kontext, weiterhin gültig)
KI ist verfügbar: Ollama **über n8n** unter `http://ki.fes-credo.de:11434/api/generate`.
Wichtige Befunde aus dieser Session:
- **PII-Regel**: Am Endpoint liegen lokale Modelle (`qwen2.5:7b`, `qwen3.5:9b`,
  `qwen3.5:latest`) UND `:cloud`-Modelle (die routen auf `ollama.com`). Für Aufgaben-Inhalte
  zwingend ein **lokales** Modell, NIE ein `:cloud`-Modell.
- **Async ist Pflicht**: Direkter `/api/generate`-Call an die lokalen Modelle antwortete von
  hier aus nicht in 60–90 s. Eine synchrone API-Route würde hängen → Pfad muss async über
  n8n laufen (deckt sich mit PLAN §5).
- **3-Schichten-Loop-Schutz**: Schicht 1 (Source-Flag `lastModifiedBy`) ist im PATCH schon
  gesetzt. Offen: `/api/ai/callback` (idempotent via `WebhookIdempotency`, respond-immediately)
  + `classify`-Trigger + Accept/Reject-API + KI-Badge in der UI.

**Vor Schritt 5 klären** (3 offene Infra-Punkte — sonst kann Schritt 5 nicht scharf gebaut
werden, der Rest ist vorbereitet):
1. **n8n-Webhook-Trigger-URL** (Inbound) + Auth — bisher nur die Ollama-URL bekannt.
   **Der n8n-Workflow existiert noch NICHT und muss neu gebaut werden** (User bestätigt
   2026-07-01): Webhook-Trigger (nimmt `{taskId, titel, callbackUrl, jobKey}`) → Ollama-Call
   (lokales Modell, `format:json`) → HTTP-Callback an das Cockpit. URL/Auth dann festlegen.
2. **Callback-Erreichbarkeit**: Kann der n8n-Host das Cockpit (`APP_URL`) für den Callback
   erreichen? In Dev ist `localhost:3000` evtl. nicht von außen erreichbar → ggf. Tunnel
   (z. B. cloudflared/ngrok) oder Polling-Fallback (Cockpit fragt n8n/Status nach).
3. **Modellwahl** (`qwen2.5:7b` vs `qwen3.5:9b`) + Latenztoleranz async.

### Bauplan Schritt 5 (konkret — nach Infra-Klärung direkt umsetzbar)
Alles Folgende ist rein **additiv** zu Schritt 1–4; nichts Bestehendes wird umgebaut.

**Schema** (`prisma/schema.prisma`): nichts Neues nötig — `Task.aiQuadrantSuggestion/
aiConfidence/aiReasoning/lastModifiedBy` und `WebhookIdempotency` existieren bereits.
(Optional: `Task.aiRequestedAt DateTime?` für „KI läuft…"-Anzeige — nur falls gewünscht.)

**ENV neu** (`.env.example` ergänzen): `N8N_EISENHOWER_WEBHOOK_URL` (Inbound-Trigger),
`AI_CALLBACK_SECRET` (schützt den Callback), `AI_MODEL` (Default `qwen2.5:7b`).
Ollama-URL kennt n8n selbst; das Cockpit ruft NUR den n8n-Webhook, nie Ollama direkt.

**Lib** (`src/lib/ai-eisenhower.ts`, neu): `baueKlassifizierungsPrompt(titel)` (deutsch,
`format:json`, Felder important/urgent/quadrant/confidence/reasoning), `jobKey(taskId, titel)`
(deterministischer Idempotenz-Key = Content-Hash), `parseKiAntwort(json)` (validiert 1..4 /
0..1, wirft bei Unsinn). Reine Funktionen → unit-testbar ohne n8n.

**API**:
- `POST /api/tasks/[id]/classify` — owner-scoped; feuert n8n-Webhook mit
  `{ taskId, titel, callbackUrl: APP_URL+"/api/ai/callback", jobKey }`, antwortet **sofort 202**
  (respond-immediately, Schicht 3). KEIN Warten auf Ollama.
- `POST /api/ai/callback` — Secret-geschützt (`AI_CALLBACK_SECRET`, konstantzeit-Vergleich via
  `pruefeSecret` aus `admin-guard.ts`). Idempotent über `WebhookIdempotency` (key = `jobKey`;
  vorhanden → 200 ohne Wirkung, Schicht 2). Schreibt NUR `aiQuadrantSuggestion/aiConfidence/
  aiReasoning` + `lastModifiedBy=AI_OLLAMA` — **überschreibt important/urgent NIE**.
- `POST /api/tasks/[id]/ai-suggestion/accept` — übernimmt den Vorschlag: setzt important/urgent
  passend zum vorgeschlagenen Quadranten (`EISENHOWER_QUADRANTEN`), `lastModifiedBy=USER`,
  löscht die ai*-Staging-Felder.
- `POST /api/tasks/[id]/ai-suggestion/reject` — verwirft: ai*-Felder auf null.

**Loop-Schutz (3 Schichten, PLAN §5) — Status**:
1. Source-Flag `lastModifiedBy` — **schon scharf** (PATCH setzt USER, Callback setzt AI_OLLAMA).
   classify NUR anbieten/auslösen, wenn `lastModifiedBy=USER` → KI-Write re-triggert nicht.
2. Idempotenz `WebhookIdempotency` (jobKey) — im Callback bauen.
3. Respond-immediately — im classify-Endpoint (202).

**UI** (`aufgaben-client.tsx` erweitern, `TaskDTO.kiVorschlagOffen` existiert schon):
- Pro Task „KI fragen"-Button → `POST …/classify`, zeigt „läuft…"; Liste per Polling/Reload
  aktualisieren, bis `aiQuadrantSuggestion` gesetzt ist.
- Wenn `kiVorschlagOffen`: dezentes Badge „KI schlägt **Q2 Planen** vor (78 %)" +
  Buttons **Übernehmen** / **Verwerfen** (`accept`/`reject`). Reasoning als Tooltip/Zeile.
  KI überschreibt nie automatisch — nur auf Klick.

**Tests**: `parseKiAntwort` (gültig/ungültig), `jobKey` deterministisch, Callback-Idempotenz
(Prisma-Mock: zweiter Call mit gleichem jobKey = no-op), accept setzt korrekt important/urgent,
Callback verändert important/urgent NICHT.

**Manueller n8n-Smoke** (nach Klärung): `curl` auf `/api/ai/callback` mit Fake-Payload +
Secret → Vorschlag erscheint in `/aufgaben`; classify → n8n → Ollama → Callback-Kette end-to-end.

**Wiedereinstieg-Befehle**: siehe Abschnitt 13 „Wiedereinstieg (hochfahren)".
Achtung Umgebung: Maschine war zuletzt sehr langsam (Dev-Start ~9 Min, ~100 s/Route-Compile) —
Verifikation primär über `npm run typecheck` + `npm test` + `npm run build`, Klick-Smoke wenn Zeit.
