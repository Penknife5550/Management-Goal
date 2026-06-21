# Recherche & Strategie: KI-gestütztes Führungs-Cockpit

> Deep-Research-Synthese (4 parallele Agenten, >100 Web-Aufrufe), 2026-06-21.
> Ziel: Software für Führungskräfte — Überblick über zugeteilte Aufgaben/Ziele,
> Eisenhower-Matrix + Kanban, n8n-API für KI-Anreicherung, "100-Ziele-Tafel"
> à la 100-Tage-Plan.

---

## 1. Executive Summary

Die Forschung ist in einem Punkt ungewöhnlich eindeutig: **Fokus schlägt Vollständigkeit.**
Fast jedes dokumentierte Scheitern von Ziel-/Aufgabensystemen hat zwei Wurzeln:
(1) zu viele gleichzeitige Prioritäten, (2) zu hohe Pflege-Reibung im Alltag.

Daraus folgt die wichtigste Design-Korrektur am ursprünglichen Wunsch:
**Eine "Tafel mit 100 gleichwertigen Zielen" ist als Arbeitsfläche ein Anti-Pattern.**
Als *Backlog/Ambitions-Register* ist sie wertvoll — aber nur, wenn streng vom
Tagesfokus getrennt: immer nur **1–3 "Wildly Important Goals" (WIGs)** im Fokus.

Marktbefund: **Kein einziges existierendes Tool** erfüllt alle fünf Kernanforderungen
gleichzeitig (native Eisenhower-Matrix + flexibles Kanban + echtes Goal/OKR-Modul
+ DSGVO-konformes Self-Hosting + integrierte/lokale KI, fokussiert auf EINE
Führungskraft). Genau das ist der weiße Fleck — und mit dem vorhandenen Stack
(Next.js + Prisma + n8n + Ollama) im Eigenbau abbildbar.

---

## 2. Bewertungsmatrix bestehender Software

Legende: ✅ stark/nativ · 🟡 Workaround/eingeschränkt · ❌ nicht vorhanden

| Tool | Eisenhower | Kanban | Goals/OKR | API+Webhooks | n8n-Node | KI | Einzel-FK | Self-Host/DSGVO | Preis grob |
|---|---|---|---|---|---|---|---|---|---|
| **Vikunja** | ✅ **nativ** | ✅ flexibel | ❌ | ✅ REST+WH+CalDAV | ✅ **nativ** | ❌ | ✅ **ideal** | ✅ **AGPLv3, Docker** | gratis self-host |
| **Plane** | 🟡 Prioritäten | ✅ 5 Layouts | 🟡 Cycles/Initiatives | ✅ **180+ EP, MCP** | 🟡 nur HTTP | ✅ **BYO-Key, lokal** | 🟡 team-orientiert | ✅ **AGPLv3, Docker** | gratis self-host |
| **Asana** | 🟡 Template | ✅ | ✅ **Goals (Advanced)** | ✅ reif | ✅ nativ | ✅ AI Studio | ✅ **gut** | ❌ / EU-RZ Frankfurt (Ent.) | ~11–25 $/User |
| **Notion** | 🟡 DB-View | ✅ flexibel | 🟡 frei modellierbar | ✅ REST+WH (beta) | ✅ Node+Trigger | ✅ **stärkste** | ✅ setup-intensiv | ❌ / EU nur Enterprise | ~10–20 $/User |
| **Coda** | 🟡 Template | ✅ nativ | 🟡 Templates | ✅ v1+WH | ✅ nativ | ✅ Coda AI | ✅ sehr gut | ❌ / EU nur Enterprise | ~10–30 $ |
| **Trello** | 🟡 Power-Up | ✅ **bester, pur** | 🟡 Zusatz-App | ✅ ausgereift | ✅ nativ | 🟡 Schreibhilfe | ✅ Board-Cockpit | ❌ / **EU-Residenz buchbar** | gratis–10 $ |
| **Todoist** | ✅ **Vorlage P1-P4** | ✅ solide | ❌ Karma | ✅ REST+Sync+WH | ✅ nativ | 🟡 schwach | ✅ **bestes out-of-box** | ❌ / **US-only** | ~5 $ |
| **Monday** | 🟡 Template | ✅ | 🟡 manuell | ✅ GraphQL+WH | ✅ nativ | ✅ breit | 🟡 team-orientiert | ❌ / Multi-Region (Ent.) | min. 3 Seats |
| **ClickUp** | 🟡 Template+Brain | ✅ flexibel | ✅ Goals (Business) | ✅ REST+WH | ✅ nativ | ✅ Brain (Add-on) | 🟡 überladen | ❌ / primär US | ~7–12 $ +KI |
| **Jira** | 🟡 Marketplace | ✅ ausgereift | ✅ Atlassian Goals | ✅ **beste API** | ✅ nativ | ✅ Rovo | ❌ eng-lastig | 🟡 DC im Sunset | gratis–Ent. |
| **Linear** | ❌ 1 Achse | ✅ stark (dev) | ✅ Projects→Initiatives | ✅ GraphQL+WH | ✅ nativ | ✅ eng-zentriert | ❌ Dev-Tool | ❌ / keine EU-Angabe | ~10–16 $ |
| **Tability** | ❌ | ❌ | ✅ **OKR-Spezialist** | ✅ REST v2+WH | 🟡 nur HTTP | ✅ OKR-KI | ✅ strateg. Ziele | ❌ / **EU-Hosting wählbar** | ~6 $ |

**Marktbereinigung (raus):** Height.app (Shutdown 09/2025), Focalboard (unmaintained),
MS Viva Goals (abgeschaltet 12/2025), Jira Data Center (EOL 2029).
Things 3/OmniFocus = Apple-only, keine Server-API → K.O. für n8n.
AppFlowy = lokales Ollama top, aber **keine public API** → n8n-K.O.

### Top 3 für dein Lastenheft
1. **Vikunja** — präzisester Treffer. Einziges Tool mit *nativer Eisenhower-Ansicht*
   + nativem n8n-Node + trivialem Self-Hosting (DSGVO). Lücke: kein Goal-Modul, keine KI
   (beides via n8n+Ollama nachrüstbar).
2. **Plane** — wenn KI-im-Haus + Roadmap-Tiefe wichtiger als native Matrix. Beste API,
   self-hosted KI mit BYO-Key. Eher team-orientiert, komplexeres Setup.
3. **Asana** — stärkster SaaS-Kompromiss *falls Self-Hosting nicht zwingend*. Echtes
   Goals-Modul + KI + EU-RZ Frankfurt. Haken: US-Konzern (CLOUD-Act), Goals teuer.

### Die Marktlücke
Drei Lager, die sich gegenseitig ausschließen:
- **Self-Hosting + Eisenhower** (Vikunja, Plane) → keine KI, kein echtes OKR-Modul
- **KI + Goals** (Asana, Notion, ClickUp) → Cloud/US, team-zentriert, keine native Matrix
- **OKR-/Personal-Spezialisten** (Tability, OmniFocus) → kein Kanban oder keine API

Fehlt: **self-hostbares "Executive Cockpit", das Eisenhower-Priorisierung des
Tagesgeschäfts mit einer Ziele-Ebene verknüpft und lokale KI (Ollama) zum
Anreichern/Priorisieren nutzt — für eine Einzelperson.**

---

## 3. Top-10 kritische Erfolgsfaktoren

1. **Radikale Fokus-Begrenzung (max. 1–3 WIGs gleichzeitig).** Stärkster Befund.
   4DX: ab 2 WIGs Verfall; OKR-Daten: >7 Ziele = 30–40 % schlechtere Abschlussquote;
   Collins: "Wer mehr als drei Prioritäten hat, hat keine."
2. **Trennung Backlog (alles) ↔ Fokus (wenig).** Zeigarnik: Unerledigtes muss extern
   erfasst werden (Kopf frei), gearbeitet wird nur an wenigem. Beide Ebenen sichtbar getrennt.
3. **Minimale Reibung im Alltag.** Fogg B=MAP: dauert Pflege länger als der Nutzen → Abbruch.
   Häufigster Abbruchgrund überhaupt.
4. **Eingebaute Methodik statt nackter Liste.** Tools scheitern, weil sie Priorisierung
   dem Nutzer überlassen. System muss bewusste Logik erzwingen (Ivy Lee: 6 Aufgaben sequenziell).
5. **Sichtbares Scoreboard.** "Auf einen Blick: gewinnen wir?" verschiebt Ownership zum Nutzer.
6. **Cadence of Accountability.** Fester, kurzer (≤20 Min) Wochenrhythmus = der Wirkmechanismus.
   2 Wochen ausgesetzt → Disziplin kollabiert.
7. **Lead Measures statt nur Lag Measures.** Endergebnisse nicht steuerbar, nur die Hebel davor.
8. **Quadrant-2-Schutz.** Wichtig-aber-nicht-dringend (Strategie) wird durch "mere urgency
   effect" systematisch verdrängt. System muss Q2 aktiv schützen (feste Blöcke).
9. **Kurze Zyklen (12 Wochen) statt Jahresplanung.** Erzeugt Dringlichkeit, schlägt Parkinson.
10. **Realistische Zeitschätzung gegen Planning Fallacy.** Eisenhower ignoriert Dauer komplett —
    Ziele in Aufgaben mit Aufwand herunterbrechen, Slack global statt pro Aufgabe.

### Top-5 Scheiter-Gründe (Anti-Patterns)
1. Zu viele gleichzeitige Ziele ("Goal Overload") — meistbelegte Einzelursache.
2. Zu hohe Pflege-Reibung → Abbruch.
3. Dringlichkeit verdrängt Wichtigkeit ("Urgency Trap") → Q2/Strategie stirbt.
4. Shiny Object Syndrome / Tool-Hopping (Kontextwechsel kostet ~23 Min/40 % Produktivität).
5. Fehlendes Nachhalten / fehlende Top-Verankerung (60 % der OKR-Programme scheitern hier).

### Verdikt zur "100-Ziele-Tafel"
Als **alleiniges Fokus-System ein klares Anti-Pattern** (max. Form von Goal Overload).
Rettung über Zwei-Ebenen-Architektur: 100 Ziele als **Backlog/Ambitions-Register**
(Zeigarnik-Zweck, strategische Übersicht) — daraus jederzeit nur **1–3 WIGs gezogen**,
mit Lead Measures, Scoreboard nur für die Fokus-WIGs, 12-Wochen-Zyklus,
wöchentlichem Check-in. *Die 100er-Tafel als Lager: ja. Als Arbeitsfläche: nein.*

---

## 4. Goal-Board-Methodik (was wirksam macht)

**Trumps "Contract with the American Voter" faktisch:** kein Board mit 100 Zielen,
sondern Versprechen-Katalog mit fester Frist — 3 Maßnahmen-Cluster + 10 benannte
Gesetze; je Item: benannte Aktion + Mechanismus (Executive Order vs. Gesetz) + Frist
("day one" / "within 100 days"). Fortschritt von externen Trackern gemessen
(kept/in progress/stalled/broken). **Lehre:** die Trennung "selbst umsetzbar" vs.
"von anderen abhängig" war die Stärke; die starre 100-Tage-Frist wurde zum Bumerang
(Gesetze blieben im Kongress hängen).

**Übertragbare Prinzipien (4DX, Obeya/Toyota, Hoshin Kanri, Watkins "First 90 Days"):**
- "Auf einen Blick gewinnen/verlieren": Ampel + Balken + Countdown auf der Startseite
- Lead + Lag trennen (Handhabe statt Ohnmacht)
- Nutzer baut/personalisiert sein Board (Ownership)
- Sichtbare Kaskade: Ziel → woraus abgeleitet → Owner (Hoshin X-Matrix)
- Cadence vor Kosmetik: Board ohne Routine = Tapete
- Outcome statt Output messen (Goodhart-Schutz)
- Progress Principle (Amabile): sichtbarer kleiner Fortschritt = stärkster Motivator
- "Secure Early Wins" zuerst zeigen (Watkins)
- Hebel-Tag pro Ziel: "selbst umsetzbar" vs. "abhängig von X"

**Wo das Board kippt (Warnungen):**
- Watermelon-Effekt/Goodhart: außen grün, innen rot → Counter-Metriken, nicht nur "erledigt"
- Unrealistische Fristen → Zynismus/Burnout; inkrementell-anspruchsvoll schlägt dramatisch
- Countdown als sanftes Pacing mit Zwischenmeilensteinen, NICHT als rote Bedrohungsuhr
- Erzwungene Öffentlichkeit hemmt Commitment → Sichtbarkeit anbieten, nicht erzwingen

---

## 4b. Peter Drucker — das fehlende Fundament

Drucker ist der Vater des zielorientierten Managements (MBO → direkter Vorfahre von OKR).
Er ergänzt die anderen Frameworks um das, was ihnen fehlt: **Beitrag/Outcome statt
Aktivität, konsequentes Weglassen, und Selbst-Lernen.**

**Kernkonzepte (quellenbasiert):**
- **MBO „and self-control"** (Practice of Management, 1954): Ziele kaskadieren + gemeinsame
  Zielvereinbarung + Selbstkontrolle. (SMART ist NICHT von Drucker, sondern Doran 1981.)
- **The Effective Executive (1966), 5 Praktiken:** (1) „Know thy time" — Zeit-Audit,
  (2) Fokus auf **Beitrag/Outcome** („What can I contribute?"), (3) auf Stärken bauen,
  (4) **First things first** + „second things not at all", (5) effektive Entscheidungen.
- **„What gets measured gets managed"** ist Drucker FÄLSCHLICH zugeschrieben (Ridgway 1956,
  als Warnung). Drucker betonte: Wissensarbeit lässt sich nicht voll vermessen → Mess-Skepsis.
- **Managing Oneself (HBR 1999):** **Feedback-Analyse** — erwartetes Ergebnis aufschreiben,
  nach 9–12 Monaten mit Realität vergleichen → eigene Stärken erkennen.
- **Systematic Abandonment:** regelmäßig fragen „Würden wir das heute neu anfangen?" →
  konsequent streichen. Der gefährlichste Ballast: was früher gut funktionierte.
- **Effektive Entscheidungen aus Dissens**, mit „Boundary Conditions" (Mindestbedingungen).

**Drucker-Prinzip → Cockpit-Feature → KI-Nutzen:**

| Drucker-Prinzip | Cockpit-Feature | KI/n8n-Nutzen |
|---|---|---|
| Know thy time | Zeit-Tracking je Aufgabe + je Quadrant, Soll-Ist | KI-Wochenreport: „62 % der Zeit in Q3 → delegieren/streichen" |
| Fokus auf Beitrag | Pflichtfeld „Welcher Outcome?" bei Zielanlage | KI: „Das ist Aktivität, kein Beitrag" + Reformulierungs-Vorschlag |
| MBO + Self-Control | Ziel-Kaskade Org→Team→Person mit Roll-up | KI leitet Teilziele ab; n8n meldet Drift |
| First things first | Eisenhower-Default + harte WIP-Limits (1–3 WIGs) | KI re-priorisiert nach Outcome-Hebel, warnt bei Q1-Überlauf |
| **Systematic Abandonment** | **Quartals-„Abandonment-Review": „heute neu starten?"** | **Top-Use-Case: KI scannt Backlog auf Zombie-Ziele, schlägt Streichen vor (n8n-Cron)** |
| **Feedback-Analyse** | **Pflichtfeld erwartetes vs. tatsächliches Ergebnis → Lern-Log, 9–12-Mon-Wiedervorlage** | **KI erkennt Muster über Trefferquote: „du überschätzt X, Stärke ist Y"** |
| Effektive Entscheidungen | Entscheidungs-Log + Boundary Conditions + Dissens-Feld | KI als Devil's Advocate: Gegenargumente vor Festlegung |
| Mess-Skepsis | qualitative Felder neben KPIs | KI warnt bei Goodhart-/Gaming-Risiko gamebarer Ziele |

**Drucker vs. die anderen Frameworks:** Deckt sich mit 4DX (Konzentration) und OKR
(direkter MBO-Nachfahre). Geht aber **schärfer**: priorisiert nach Beitrag statt nur
Dringlichkeit (vs. Eisenhower) und macht **Abandonment** zum ersten Schritt — das fehlt
in Eisenhower, OKR, 4DX und GTD fast völlig. Warnt vor Über-Vermessung (vs. OKR-Mess-Drang).

**3 Drucker-Features mit Differenzierungspotenzial (kein Tool macht das gut):**
1. **KI-Abandonment-Review („Zombie-Killer")** — proaktiv Ziele zum Streichen vorschlagen.
2. **Feedback-Analyse / Stärken-Lern-Log** — macht das Cockpit zum Selbstentwicklungs-Tool.
3. **Beitrags-erzwingende Zielformulierung + Devil's-Advocate-Entscheidungen.**

---

## 5. Referenz-Architektur (n8n + KI)

**Datenfluss:**
`React (dnd-kit Views) ↔ Next.js REST-API (Header-Auth, Idempotenz, HMAC-Webhooks) ↔ PostgreSQL/Prisma`
parallel: `API --task.created--> n8n Webhook (HMAC, Respond-immediately) --> KI (Ollama lokal für PII / Cloud sonst, format-JSON) --PATCH--> API (Source-Flag stoppt Loop)`

**API-Design:** REST (nicht GraphQL — passt zu `route.ts` + n8n HTTP-Node).
Service-API-Key für n8n (getrennt vom User-JWT). `Idempotency-Key`-Header + Postgres-Tabelle
ab Tag 1 (n8n retried → sonst Doppel-Tasks). Webhook-Events `task.created/updated/moved/completed`,
Payload HMAC-SHA256 signiert.

**Eisenhower + Kanban = orthogonale Dimensionen derselben Aufgabe**, nicht zwei Objekte.
Eine Task trägt `important`/`urgent` (Eisenhower) UND `status` (Kanban). UI rendert nur Views.

**Prisma-Skizze:** siehe Block unten.

```prisma
enum TaskStatus { TODO DOING DONE }
enum EnrichmentSource { USER AI_OLLAMA AI_CLOUD }

model Board {
  id String @id @default(cuid())
  name String
  ownerId String                          // Multi-Tenant-Scope
  tasks Task[]
  createdAt DateTime @default(now())
  @@index([ownerId])
  @@map("board")
}

model Task {
  id String @id @default(cuid())
  boardId String
  board Board @relation(fields: [boardId], references: [id], onDelete: Cascade)
  title String
  description String?
  // Kanban-Dimension
  status TaskStatus @default(TODO)
  position Float
  dueDate DateTime?
  // Eisenhower-Dimension (orthogonal)
  important Boolean @default(false)
  urgent Boolean @default(false)
  // KI-Anreicherung (staging, nie auto-apply)
  aiQuadrantSuggestion Int?
  aiConfidence Float?
  aiReasoning String?
  aiSubtasks Json?
  aiEnrichedAt DateTime?
  aiAccepted Boolean @default(false)
  // Loop-Schutz / Audit
  lastModifiedBy EnrichmentSource @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([boardId, status])
  @@index([important, urgent])
  @@map("task")
}

model WebhookIdempotency {
  key String @id
  result Json?
  processedAt DateTime @default(now())
  @@map("webhook_idempotency")
}
```

**5 wichtigste technische Entscheidungen/Fallen:**
1. **Webhook-Loop-Schutz ist Pflicht** (3 Schichten): Source-Flag `lastModifiedBy`,
   atomares Postgres-Idempotenz-Gate, "Respond immediately" im n8n-Webhook.
   n8n-eingebauter Dedup-Node hilft NICHT bei Retries.
2. **KI nie auto-applien** — Vorschlagsfelder (`aiQuadrantSuggestion`/`aiConfidence`)
   getrennt von echten Feldern; User bestätigt (`aiAccepted`); niedrige Confidence → Review.
3. **DSGVO-Routing:** PII → lokales Ollama (qwen2.5:7b reicht für Klassifikation);
   Cloud-LLM nur für unkritische Anreicherung ohne Personenbezug.
4. **Ollama in n8n NICHT über AI-Agent-Node** (kann keine Tools) → Basic LLM Chain
   oder direkter HTTP-Call an `/api/chat` mit `format`-JSON-Schema, `temperature=0`.
5. **KI-Anreicherung immer asynchron** über n8n (nie im Request-Pfad) → UI zeigt
   "wird angereichert"-State (Optimistic Update).

**KI-Use-Cases:** Eisenhower-Auto-Einordnung (→ JSON quadrant+confidence+reasoning),
Subtask-Zerlegung, Deadline-Vorschlag, Kontext/Checklisten, Duplikat-Erkennung,
Thread-Zusammenfassung, "next best action".

---

## 6. Blinde Flecken im ursprünglichen Denken

1. **100 gleichwertige Ziele = Fokus-Killer.** Größter Fleck. → Backlog/Fokus-Trennung,
   1–3 WIGs.
2. **"Aufgaben werden zugeteilt" widerspricht Eisenhower.** Eisenhower ist ein
   *Selbst*-Priorisierungs-Werkzeug. Wer teilt zu? Delegation/Annahme/Ablehnung fehlt im Konzept.
3. **Eisenhower kennt keine Zeitdauer und keinen Workflow-Status.** Deshalb Kanban als
   zweite, orthogonale Achse — gut, aber Dauer/Aufwand muss eigenes Feld werden.
4. **KI-Auto-Klassifikation halluziniert** → Staging + Confidence + menschliche Bestätigung,
   nie direkter Schreibzugriff der KI auf Prioritäten.
5. **Cadence/Ritual fehlt im Konzept.** Das Board ist nur die halbe Miete — ohne erzwungenen
   Wochen-Check-in wird es Tapete. Muss Produktfeature sein, nicht Disziplin-Hoffnung.
6. **Lead vs. Lag fehlt.** Nur Endziele abzuhaken macht das Tool zur aufgeblähten To-Do-Liste.
7. **Output vs. Outcome / Goodhart.** "Erledigt"-Häkchen ≠ Wirkung → Counter-Metriken.
8. **Starre Frist als Bumerang** (Trumps eigene Lehre) → Countdown als Pacing mit
   Zwischenmeilensteinen, abhängige Ziele anders behandeln als selbst-umsetzbare.
9. **DSGVO-Routing der KI** nicht zu Ende gedacht — PII gehört auf lokales Ollama.
10. **Webhook-Endlosschleifen** (App→n8n→KI→App→n8n…) — muss von Tag 1 architektonisch
    verhindert werden.

---

## 7. Geschärfter Plan (Vorschlag)

**Produktkern:** Self-hosted "Executive Cockpit" für eine Führungskraft mit
3 verbundenen Ebenen:
- **Strategie-Ebene:** Ziel-Backlog (die "100 Ziele") + 1–3 aktive WIGs mit Lead/Lag,
  Scoreboard, Countdown, Hebel-Tag (selbst/abhängig), Kaskade & Owner.
- **Ausführungs-Ebene:** Eisenhower-Matrix (wichtig × dringend) + Kanban (To Do/Doing/Done)
  als zwei Views auf dieselben Aufgaben; Aufgaben hängen an WIGs.
- **KI/Automatisierungs-Ebene:** n8n + Ollama reichert asynchron an (Klassifikation,
  Zerlegung, Kontext, Duplikate) — staged, mit Confidence, vom Nutzer bestätigt.

**MVP-Schnitt (Karpathy: Simplicity First, nicht alles auf einmal):**
- Phase 1: Aufgaben + Eisenhower-Matrix + Kanban (dnd-kit), REST-API mit Idempotenz, Boards.
- Phase 2: Ziel-Ebene (Backlog + WIGs + Scoreboard + Countdown), Cadence-Erinnerung.
- Phase 3: n8n-Anbindung + KI-Anreicherung (Loop-Schutz, DSGVO-Routing, Staging).
- Phase 4: Kaskade/Owner, Reporting/"Bilanz zum Stichtag", Information-Radiator-Modus.

**Entschieden (2026-06-21):** Eigenbau from scratch im CREDO-Stack
(Next.js 15 + Prisma + PostgreSQL + n8n + Ollama).

## 8. Deployment & Design-Anforderungen (fix)

- **Docker-Deployment:** Auslieferung als Container (App + PostgreSQL + ggf. n8n/Ollama
  via `docker-compose`). Next.js mit `output: "standalone"` für schlankes Image.
  Reverse-Proxy (Caddy/Traefik) mit HTTPS für Web-Zugriff.
- **Web-erreichbar:** Responsive Web-App, von überall im Browser nutzbar (kein Desktop-Client).
- **Sehr modern, Apple-like:** einfach, klar, schön; großzügiger Weißraum, weiche Übergänge,
  optimistic updates, durchgängige Loading-/Empty-States (CLAUDE.md UX-Prinzipien).
- **CREDO Corporate Design:** Montserrat (Fallback Arial); **keine Farbverläufe**;
  Primär #575756 (Dunkelgrau); CREDO-Linie Gelb #FBC900 / Grün #6BAA24 / Rot #E2001A /
  Blau #009AC6 als Status-/Akzentfarben; Theme über Tailwind-4-Variablen in globals.css,
  keine hartcodierten Hex-Werte in Komponenten.

---

## Quellen
Konsolidiert in den vier Agenten-Berichten — u.a. FranklinCovey 4DX, HBS "Goals Gone Wild"
(Ordóñez et al.), Collins (Good to Great), Fogg Behavior Model, Masicampo & Baumeister
(Zeigarnik), Watkins "First 90 Days", Lean Enterprise Institute (Obeya), Amabile
("Power of Small Wins"), Linear/Todoist/Vikunja-APIs, n8n-Docs, Ollama Structured Outputs,
dnd-kit. Volllinks in den Agenten-Outputs der Session.
