// ============================================================
// src/lib/auth.ts
// Auth-Stub fuer diesen Slice: liefert den hartcodierten Test-Nutzer.
// In Phase 4 ersetzt durch echte Auth (JWT + Magic Link) + RBAC.
// ============================================================
import { TEST_RECHTSEINHEIT_ID, TEST_USER_ID } from "./constants";

export interface AktuellerNutzer {
  id: string;
  rechtseinheitId: string;
}

// Bewusst synchron: spaeter wird hier das Session-Token aufgeloest.
export function getAktuellerNutzer(): AktuellerNutzer {
  return {
    id: TEST_USER_ID,
    rechtseinheitId: TEST_RECHTSEINHEIT_ID,
  };
}
