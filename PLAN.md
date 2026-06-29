# PLAN — Führungs-Cockpit (CREDO)

> Phasenplan zum MVP-first Aufbau. Stand 2026-06-21.
> Strategie & Recherche-Grundlage: [RECHERCHE-fuehrungs-cockpit.md](RECHERCHE-fuehrungs-cockpit.md)

## 0. Entscheidungen (fix)

| Thema | Entscheidung |
|---|---|
| Bauweise | Eigenbau im CREDO-Stack (kein Fork) |
| Deployment | Docker (`docker-compose`), web-erreichbar, HTTPS |
| Hierarchie | **3 Ebenen:** Geschäftsführung → Bereichs-/Standortleitung → Führungskraft |
| Zentrale Sicht | **Nur Ziele + Ampelstatus** (strategisch, keine Aufgaben-Überwachung) |
| Zentrales Eingreifen | Ziele zuweisen · Prioritäten/Fristen anpassen · kommentieren · umverteilen (alles mit Audit-Log) |
| Datenschutz/Mitbestimmung | Mit Personalrat/DSB geklärt — Audit-Log trotzdem als Standard |
| Kernprinzip | 100 Ziele = Backlog/Lager · gearbeitet wird an max. 1–3 WIGs |
| Design | CREDO-CI durchgängig, Apple-like, radikal einfach |

## 1. Tech-Stack & Deployment

**Stack (CLAUDE.md-konform):** Next.js 15 (App Router) · React 19 · TypeScript strict ·
Prisma 6 · PostgreSQL 16 · Tailwind 4 (Theme in globals.css) · Radix UI · Lucide ·
React Hook Form + Zod · JWT + Magic Links · @dnd-kit (Kanban/Matrix) · n8n + Ollama (KI).

**Docker (`docker-compose`):**
- `app` — Next.js, `output: "standalone"` (schlankes Image, Multi-Stage-Build)
- `db` — PostgreSQL 16 (Volume für Persistenz)
- `proxy` — Caddy oder Traefik (HTTPS/Let's Encrypt, Reverse-Proxy)
- n8n + Ollama laufen extern (bestehende CREDO-Instanzen) → nur via Netzwerk/Webhook angebunden (KI-Tiefe, Phase 6)
- E-Mail-Versand läuft über **eigenes SMTP** (Phase 2, lib/mailer.ts), nicht über n8n
- `.env` für `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, `ADMIN_TOKEN`, `CRON_SECRET`, `APP_URL`, `OLLAMA_URL` (n8n erst Phase 6)

## 2. Datenmodell (Prisma-Skizze)

```prisma
enum Role { ADMIN GESCHAEFTSFUEHRUNG BEREICHSLEITUNG FUEHRUNGSKRAFT }
enum TaskStatus { TODO DOING DONE }
enum GoalStatus { BACKLOG FOKUS ERREICHT ARCHIVIERT }       // FOKUS = aktive WIG
enum Ampel { GRUEN GELB ROT }
enum EnrichmentSource { USER AI_OLLAMA AI_CLOUD }

model Rechtseinheit {                                        // die 16 Einrichtungen
  id String @id @default(cuid())
  name String
  kuerzel String?
  users UserRechtseinheit[]
  goals Goal[]
  @@map("rechtseinheit")
}

model User {
  id String @id @default(cuid())
  email String @unique
  name String
  role Role @default(FUEHRUNGSKRAFT)
  managerId String?                                         // 3-Ebenen-Hierarchie (self-relation)
  manager User?  @relation("Hierarchie", fields: [managerId], references: [id])
  reports User[] @relation("Hierarchie")
  rechtseinheiten UserRechtseinheit[]                       // zugeteilte Rechtseinheiten
  goals Goal[]   @relation("Owner")
  createdAt DateTime @default(now())
  @@index([managerId])
  @@map("user")
}

model UserRechtseinheit {                                    // n:m Zuteilung
  userId String
  rechtseinheitId String
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  rechtseinheit Rechtseinheit @relation(fields: [rechtseinheitId], references: [id], onDelete: Cascade)
  @@id([userId, rechtseinheitId])
  @@map("user_rechtseinheit")
}

model Goal {                                                // Ziel / WIG
  id String @id @default(cuid())
  titel String
  outcome String?                                           // Drucker: Beitrag statt Aktivität (Pflicht bei FOKUS)
  status GoalStatus @default(BACKLOG)
  ampel Ampel @default(GELB)
  fortschritt Int @default(0)                               // 0-100
  dueDate DateTime?
  abhaengig Boolean @default(false)                         // selbst umsetzbar vs. abhängig (Hebel-Tag)
  ownerId String                                            // verantwortliche Führungskraft
  owner User @relation("Owner", fields: [ownerId], references: [id])
  rechtseinheitId String
  rechtseinheit Rechtseinheit @relation(fields: [rechtseinheitId], references: [id])
  parentGoalId String?                                      // MBO-Kaskade Org→Bereich→Person
  parentGoal Goal? @relation("Kaskade", fields: [parentGoalId], references: [id])
  childGoals Goal[] @relation("Kaskade")
  zugewiesenVon String?                                     // zentral zugewiesen durch (Chef/Bereich)
  tasks Task[]
  leadMeasures LeadMeasure[]
  learningLog LearningLog?
  comments Comment[]
  // KI-Anreicherung (staged)
  aiVorschlag Json?
  aiConfidence Float?
  aiEnrichedAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([ownerId, status])
  @@index([rechtseinheitId, status])
  @@map("goal")
}

model Task {                                                // Aufgabe (Eisenhower × Kanban)
  id String @id @default(cuid())
  goalId String?
  goal Goal? @relation(fields: [goalId], references: [id], onDelete: SetNull)
  titel String
  status TaskStatus @default(TODO)                          // Kanban
  position Float
  important Boolean @default(false)                         // Eisenhower
  urgent Boolean @default(false)
  dueDate DateTime?
  zeitGeplantMin Int?                                       // Drucker: Know thy time (Soll)
  zeitIstMin Int?                                           // (Ist)
  aiQuadrantSuggestion Int?
  aiConfidence Float?
  aiReasoning String?
  lastModifiedBy EnrichmentSource @default(USER)            // Webhook-Loop-Schutz
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([goalId, status])
  @@map("task")
}

model LeadMeasure {                                         // 4DX: steuerbarer Frühindikator
  id String @id @default(cuid())
  goalId String
  goal Goal @relation(fields: [goalId], references: [id], onDelete: Cascade)
  beschreibung String
  zielwert Int
  istwert Int @default(0)
  @@map("lead_measure")
}

model LearningLog {                                         // Drucker: Feedback-Analyse
  id String @id @default(cuid())
  goalId String @unique
  goal Goal @relation(fields: [goalId], references: [id], onDelete: Cascade)
  erwartet String                                           // bei Anlage
  tatsaechlich String?                                      // bei Abschluss
  reviewAm DateTime?                                        // 9-12 Monate Wiedervorlage
  @@map("learning_log")
}

model Comment {
  id String @id @default(cuid())
  goalId String
  goal Goal @relation(fields: [goalId], references: [id], onDelete: Cascade)
  autorId String
  text String
  createdAt DateTime @default(now())
  @@map("comment")
}

model AuditLog {                                            // zentrale Eingriffe nachvollziehbar
  id String @id @default(cuid())
  aktorId String
  aktion String                                             // ZIEL_ZUGEWIESEN, UMVERTEILT, PRIO_GEAENDERT, KOMMENTIERT
  zielId String?
  details Json?
  createdAt DateTime @default(now())
  @@index([zielId])
  @@map("audit_log")
}

model WebhookIdempotency {
  key String @id
  result Json?
  processedAt DateTime @default(now())
  @@map("webhook_idempotency")
}
```

## 3. Rollen & Sichtbarkeit (RBAC)

| Rolle | Sieht | Darf |
|---|---|---|
| **ADMIN** (IT) | technisch alles | Nutzer/Rechtseinheiten anlegen, Stammdaten, keine inhaltliche Steuerung |
| **GESCHAEFTSFUEHRUNG** (oberster Chef) | **Ziele + Ampel ALLER Rechtseinheiten** (kein Aufgaben-Detail) | Ziele zuweisen, Prio/Fristen, kommentieren, umverteilen — alles auditiert |
| **BEREICHSLEITUNG** | Ziele + Ampel der eigenen Rechtseinheiten/Reports | dito, aber nur im eigenen Bereich |
| **FUEHRUNGSKRAFT** | eigenes volles Cockpit (Ziele, Aufgaben, Eisenhower, Kanban, Zeit) | alles am Eigenen; sieht zugewiesene Ziele von oben |

Durchsetzung: serverseitiger Scope-Check pro Request (Auth → Rolle → Rechtseinheit-Scope → Validierung), nie nur im Frontend. Aufgaben-Ebene wird nach oben **nicht** durchgereicht.

## 4. Phasenplan — SIEGER-PLAN „Adoption-first Durchstich"

> Ergebnis einer 3-Juroren-Bewertung (Endnutzer / Produkt-Lean / GF-Change), einstimmig.
> Leitprinzip: **Erst die einzelne Führungskraft verlieben lassen (vertikaler Durchstich),
> dann früh pilotieren, dann Hierarchie/zentrale Steuerung, dann KI-Tiefe & Drucker.**
> Bewertung & Begründung: siehe [BEWERTUNG-plan-adoption.md](BEWERTUNG-plan-adoption.md).

**Phase 0 — Fundament + Multi-Tenant-Vorsorge** → *verify: App startet im Docker, Login geht, CREDO-Theme sichtbar*
- Next.js, Prisma + PostgreSQL, `docker-compose`, CREDO-Tailwind-Theme, Auth (JWT + Magic Link)
- **Schema von Anfang an mit `ownerId`/`rechtseinheitId`-Scope** (RBAC-*Durchsetzung* kommt
  später, aber das Schema wird nie single-user-naiv) — entschärft den späten Multi-User-Umbau
- Test-User hartcodiert, **noch keine** Nutzerverwaltung

**Phase 1 — Single-User-Wow (der Durchstich)** → *verify: neuer Nutzer legt 1. WIG an, sieht „Heute" + Scoreboard, arbeitet im Board — ohne Anleitung, Time-to-Value < 5 Min*
- „Heute"-Startseite (heutige Q1/Q2 + WIG-Ampeln + 1 KI-„next best action") als meistbesuchte Seite
- Eisenhower-Matrix + **schlanker** Kanban (nur To Do/Doing/Done, keine Swimlanes/WIP-Tiefe), @dnd-kit
- Ziele-Backlog + harte WIG-Grenze (1–3) + Scoreboard (Ampel/Fortschritt/Countdown)
- **Quick-Add** (eine Zeile, Tastatur-First; KI ergänzt später async)
- **Geführter First-Run** + sinnvolle Empty States (Beispiel-WIG/Outcome als Vorlage)
- **Du (GF) nutzt es ab hier selbst** für die eigenen WIGs = Pilot-Nutzer #1
- *Abschluss: Mini-Smoke-Pilot mit 1–2 wohlwollenden Führungskräften*

**Phase 2 — Cadence + Delight + erstes KI-Feature** → *verify: Wochen-Erinnerung führt durch Review; KI schlägt Eisenhower-Quadrant vor (staged)*
- **Geführter Wochen-Check-in** (≤20 Min Ritual: je WIG Ampel/Fortschritt/nächste Lead Measures)
- Notifications (In-App-Center + **E-Mail via eigenes SMTP**, nicht n8n), **nutzergesteuert**, Batching/DND, kein Spam
- Q2-Schutz als Zeitblock-Funktion · **Small-Wins/Progress-Feedback** (Amabile) beim Abschluss
- Erstes KI-Feature: Eisenhower-Vorschlag im **Accept/Reject-Pattern** mit Confidence

**Phase 3 — Früher Pilot + lesende GF-Sicht** → *verify: 3–5 echte FK nutzen es, Adoptions-KPIs gemessen, Top-Reibung gefixt; GF sieht lesendes Aggregat*
- Pilot mit 3–5 Führungskräften, **Adoptions-KPIs** (Daily-Active-FK, gepflegte WIGs, Check-in-Quote, 4-Wochen-Retention) + In-App-Feedback-Button
- **Read-only GF-Mitlese-Ansicht** (WIG-Ampeln/Scoreboard der Pilot-FK, nur lesend, keine RBAC-Tiefe)
  → erster zentraler Überblick ~2 Phasen früher, billig
- Pilot-KPIs als dein Mini-Steuerungs-Cockpit für die Einführung selbst

**Phase 4 — Multi-User, RBAC & Rechtseinheiten** → *verify: GF legt FK an, teilt Rechtseinheit zu, 3-Ebenen-Hierarchie + Scope greifen*
- Rechtseinheiten-CRUD (16 Einrichtungen importierbar), Nutzerverwaltung, Rolle + Manager + Zuteilung
- RBAC + Scope-Middleware (serverseitig) + Audit-Log

**Phase 5 — Chef-Cockpit (volle zentrale Steuerung)** → *verify: GF sieht Ampel-Roll-up aller Rechtseinheiten, weist Ziel zu / verteilt um — alles im Audit-Log*
- Aggregierte Ziel-/Ampel-Sicht über alle Rechtseinheiten (Kaskade Org→Bereich→Person)
- Eingreifen: zuweisen · Prio/Fristen · kommentieren · umverteilen — **Zuweisung MIT Annahme-/Rückfrage-Workflow** der Führungskraft (Ownership bleibt unten, schützt Adoption)
- Eskalation roter WIGs nach oben · **Suche/Filter** (Rechtseinheit, Status, Ampel, Owner) · Performance-Budget

**Phase 6 — n8n + KI-Tiefe** → *verify: neue Aufgabe wird async klassifiziert, Vorschlag gestaged, Loop-Schutz greift*
- Volle KI-Pipeline: Subtask-Zerlegung, Outcome-Check, Duplikat-Erkennung, Thread-Zusammenfassung
- 3-Schichten-Loop-Schutz (Source-Flag, Idempotenz, Respond-immediately) · DSGVO-Routing (PII → Ollama lokal)

**Phase 7 — Drucker-Differenzierung** → *verify: Abandonment-Review listet Zombie-Ziele, Lern-Log vergleicht Erwartung/Realität*
- Abandonment-Review (Quartals-Cron, KI-Zombie-Scan) · Feedback-Lern-Log + 9–12-Mon-Wiedervorlage
- Devil's-Advocate bei Entscheidungen · Zeit-Audit-Report

**Phase 8 — Härtung & Vollrollout** → *verify: /code-review + /credo-check grün, Accessibility-Audit, Schulung steht*
- Security-/Edge-Härtung, Performance, Accessibility (WCAG, Tastatur, Kontraste)
- Information-Radiator-Vollbildmodus (Büro-Display) · Schulung · Vollausrollung

## 4b. Adoptions-Leitplanken (gelten in JEDER Phase, nicht erst am Ende)

- **Time-to-Value < 5 Min** und **kein leeres Cockpit** — jede neue Ansicht hat einen sinnvollen Empty State.
- **Eingabe < 3 Sek** — Quick-Add + Tastatur + Defaults; Pflichtfelder minimal, Rest optional/KI.
- **Glanceability** — Kernaussage in 5 Sek, ≤6–8 Metriken, Progressive Disclosure.
- **Gefühlte Geschwindigkeit** — Optimistic UI + Skeleton-Loading überall.
- **Mobile-Read-Ansicht** — Status/„Heute" unterwegs lesbar, Tap-to-move statt Drag&Drop-Frust.
- **KI schlägt vor, überschreibt nie** — Accept/Reject, Confidence sichtbar.
- **Peak-End** — ein Delight-Moment pro Session (Fortschritts-Animation beim Ziel-Abschluss).

## 5. CREDO-Design-Tokens (Tailwind-Theme)

- Schrift Montserrat (Fallback Arial) · **keine Farbverläufe**
- `--color-primary: #575756` (Buttons/Links)
- CREDO-Linie als Status: Gelb `#FBC900` · Grün `#6BAA24` · Rot `#E2001A` · Blau `#009AC6`
- Ampel: Grün/Gelb/Rot aus CREDO-Linie · alle Werte als CSS-Variablen, keine Hex in Komponenten
- Apple-like: großzügiger Weißraum, optimistic updates, weiche Übergänge, immer Empty-/Loading-States

## 6. Größte Risiken (im Blick behalten)

1. **Adoption** — #1-Risiko, nicht die Technik. Adressiert durch Single-User-Wow zuerst,
   Adoptions-Leitplanken in jeder Phase, frühen Pilot (Phase 3) vor Vollrollout.
2. **Später Multi-User-Umbau** (Bs Hauptrisiko) — entschärft durch Schema-Scope ab Phase 0.
3. **Watermelon-Effekt** — zentrale Sicht bewusst nur auf Ziel-/Ampel-Ebene, Zuweisung mit Annahme.
4. **Webhook-Loops & KI-Halluzination** — Loop-Schutz + Staging ab Phase 6 zwingend.
5. **Scope-Creep in Phase 1** — Kanban-Tiefe bewusst rausgehalten, erst Time-to-Value sichern.
6. **GF-Steuerung kommt spät (Phase 5)** — bewusster Trade-off: lieber später Aggregat-Blick
   auf echte, gepflegte Daten als früh auf leere. Überbrückt durch lesende GF-Sicht (Phase 3).
