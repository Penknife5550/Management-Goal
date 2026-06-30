# STATUS & Übergabe — Führungs-Cockpit

> Stand: 2026-06-21. Dieses Dokument ist der Wiedereinstieg nach dem Maschinen-Neustart.
> Danach geht es mit **Phase 2** weiter.

## 1. Wo stehen wir?

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
