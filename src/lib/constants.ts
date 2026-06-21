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
