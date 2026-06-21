# CREDO Führungs-Cockpit — Goal/WIG-Modul

Strategische Ebene des Cockpits: **Ziel-Backlog** (Lager) getrennt vom **Fokus**
(1–3 aktive WIGs) mit Scoreboard, Lead Measures, Outcome-Pflicht und Countdown-Pacing.

> MVP-Slice nach [PLAN.md](PLAN.md) (Sieger-Plan „Adoption-first", Phase 1).
> Bewusst **nicht** enthalten: Multi-User/RBAC, Kanban/Eisenhower-Tiefe, n8n/KI,
> Chef-Cockpit (siehe Abschnitt „Scope“).

## Stack
Next.js 15 · React 19 · TypeScript (strict) · Prisma 6 · PostgreSQL 16 ·
Tailwind 4 (Theme in `globals.css`) · Radix UI · Lucide · Zod · Vitest · Playwright.

## Schnellstart (Docker — alles in einem)
```bash
cp .env.example .env
docker compose up --build
# App: http://localhost:3000  (leitet auf /ziele)
```
Der App-Container führt beim Start automatisch `prisma migrate deploy` + `db seed` aus.

## Lokale Entwicklung (App lokal, DB in Docker)
```bash
npm install
docker compose up -d db                 # nur PostgreSQL (Port 5433)
export DATABASE_URL="postgresql://credo:credo_dev_2026@localhost:5433/cockpit?schema=public"
npx prisma migrate dev                   # Schema + Migration anwenden
npx prisma db seed                       # Test-Nutzer + Test-Rechtseinheit
npm run dev                              # http://localhost:3000
```

## Tests
```bash
npm run test                             # Unit (Vitest): WIG-Limit, Status, Outcome, Countdown
npm run typecheck                        # tsc --noEmit
npm run lint                             # ESLint
npm run format:check                     # Prettier

# E2E (Playwright): App-Flow gegen echten Server + DB
export DATABASE_URL="postgresql://credo:credo_dev_2026@localhost:5433/cockpit?schema=public"
npx playwright install chromium          # einmalig
npm run test:e2e
```

## Verify-Checkliste (agent-prüfbar)
- [x] `docker compose up` startet App + DB, Migration + Seed laufen automatisch
- [x] `npm run test` → 16 Unit-Tests grün
- [x] `npm run test:e2e` → 2 E2E-Tests grün (anlegen → Fokus → Scoreboard; Outcome-Pflicht)
- [x] `npm run typecheck` / `npm run lint` / `npm run format:check` sauber
- [x] Keine hartcodierten Hex-Werte in Komponenten (nur CSS-Variablen/Tailwind-Theme)
- [x] Empty- + Loading-State vorhanden, Mutationen optimistisch mit Rollback
- [x] Tastaturbedienung, Fokus-Ringe, ARIA-Labels

## Verify-Checkliste (mensch-prüfbar — bitte selbst testen)
- [ ] Time-to-Value < 5 Min: erstes Ziel ohne Anleitung anlegen, Scoreboard verstehen
- [ ] Quick-Add fühlt sich < 3 Sek an (Enter genügt)
- [ ] Delight-Moment beim Abschließen eines Ziels (grüne „Geschafft“-Meldung)

## Architektur (Kurz)
- `src/lib/goals.ts` — reine Domänenlogik (WIG-Limit, Status-Übergänge, Outcome-Pflicht,
  Countdown), framework-frei und unit-getestet.
- `src/lib/goal-service.ts` — DB-naher Service: Owner-Scope + Regelprüfung.
- `src/app/api/goals*` — REST-Routen (`{ data }` / `{ error }`, Status 400/404/409/500).
- `src/components/ziele/*` — UI (Scoreboard, Backlog, Quick-Add, Fokus-Modal, Lead Measures).
- Datenmodell: `prisma/schema.prisma` (Goal/LeadMeasure/LearningLog + Task schema-only,
  KI-Felder vorgesehen aber nicht verdrahtet; `ownerId`/`rechtseinheitId`-Scope ab Tag 1).

## Scope (bewusst ausgelassen — spätere Phasen)
- Multi-User, Nutzerverwaltung, RBAC-Durchsetzung (Phase 4) → Test-Nutzer hartcodiert.
- Kanban-/Eisenhower-Tiefe (Phase 1 Aufgaben) → nur `Task`-Modell im Schema.
- n8n-/KI-Anreicherung (Phase 6) → Felder vorgesehen, nicht verdrahtet.
- Chef-Cockpit / Aggregat-Sicht / Audit-Eingriffe (Phase 5).
- Volle Feedback-Analyse / Abandonment-Review (Phase 7) → `LearningLog` nur erfasst.
