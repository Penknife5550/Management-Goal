# Bewertung: Welcher Aufbau-Plan wird von Führungskräften geliebt?

> 3-Juroren-Bewertung (2026-06-21) dreier konkurrierender Aufbau-Pläne, mit Fokus auf
> Adoption/Delight. Sieger: **Plan B**. Eingearbeitet in [PLAN.md](PLAN.md).

## Die drei Kandidaten
- **Plan A — Architektur-first:** Fundament → Verwaltung/RBAC → Eisenhower/Kanban → Ziele →
  Chef-Cockpit → KI → Drucker → Härtung. (= ursprünglicher Plan)
- **Plan B — Adoption-first Durchstich:** Fundament → Single-User-Wow → Cadence+Delight+KI-Happen →
  früher Pilot → Multi-User/RBAC → Chef-Cockpit → KI-Tiefe → Drucker → Härtung.
- **Plan C — Lean Thin-Slice:** Fundament → winzige verliebbare Scheibe → sofort Pilot →
  Ausbau → Multi-User/RBAC → Chef-Cockpit → KI → Drucker → Härtung.

## Bewertungskriterien (aus Adoption-Recherche abgeleitet)
K1 Time-to-Value & First-Run · K2 Eingabe-Reibung · K3 Glanceability/Überblick ·
K4 Ästhetik & gefühlte Performance · K5 Habit-Loop & Cadence · K6 Früher Pilot/Validierung ·
K7 Zentraler Nutzen für GF · K8 Tech-Umsetzbarkeit/Risiko (5 = geringes Risiko)

## Aggregierte Matrix (Ø aller 3 Juroren, 1–5)

| Kriterium | Plan A | Plan B | Plan C |
|---|---|---|---|
| K1 Time-to-Value & First-Run | 1.7 | 4.0 | 5.0 |
| K2 Eingabe-Reibung minimal | 2.0 | 4.7 | 4.0 |
| K3 Glanceability / Überblick | 2.7 | 4.3 | 4.0 |
| K4 Ästhetik & gefühlte Performance | 2.3 | 4.3 | 3.0 |
| K5 Habit-Loop & Cadence | 2.7 | 5.0 | 3.0 |
| K6 Früher Pilot / Validierung | 1.0 | 4.0 | 5.0 |
| K7 Zentraler Nutzen für GF | 4.3 | 3.3 | 2.7 |
| K8 Tech-Risiko (5 = gering) | 3.3 | 3.7 | 2.3 |
| **Gesamt (Ø, max 40)** | **20.0** | **33.3** | **29.0** |

Gewichtete Einzelurteile: Endnutzer B 49 / C 44 / A 24 · Produkt B 45 / C 42 / A 26 ·
GF B 47 / C 38 / A 30. **Alle drei Juroren wählten Plan B.**

## Warum Plan B gewinnt
- Liefert sofortigen Einzelnutzen (Time-to-Value) UND verankert den Habit-Loop (Cadence)
  als ernsthaftes Arbeitspaket — der Unterschied zwischen täglicher Nutzung und Shelfware.
- Validiert per Pilot, BEVOR der teure Multi-User-/RBAC-Unterbau gebaut wird.
- Plan A: „Steuerung früh, aber auf leeren Daten" (K6 = 1.0) → klassische Architektur-Falle.
- Plan C: pilotiert zu dünn (ohne Cadence) → testet die falsche Hypothese, teurer Multi-Tenant-Nachbau.

## Eingearbeitete Korrekturen (aus den Verlierer-Plänen geerntet)
1. **Multi-Tenant-Scope ins Schema ab Phase 0** (von A) — neutralisiert Bs Hauptrisiko.
2. **Kanban-Tiefe raus aus Phase 1** (von C) — schützt Time-to-Value.
3. **Mini-Pilot schon nach Phase 1** (von C) — Feedback fließt ins Cadence-Design.
4. **GF als Pilot-Nutzer #1 ab Phase 1** (von GF-Juror) — beste Adoption-Versicherung.
5. **Read-only GF-Mitlese-Ansicht in Phase 3** — zentraler Überblick ~2 Phasen früher.

## Bleibender Trade-off
Deine volle zentrale Steuerung (Chef-Cockpit mit Zuweisung/Umverteilung) kommt erst Phase 5.
Bewusst: lieber später ein Aggregat-Blick auf echte, gepflegte Daten als früh auf leere.
Überbrückt durch die lesende GF-Sicht ab Phase 3.
