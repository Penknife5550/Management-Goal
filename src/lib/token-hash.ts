// ============================================================
// src/lib/token-hash.ts
// SHA-256-Hash fuer Magic-Link-Tokens: in der DB liegt NUR der Hash,
// der Klartext-Token existiert ausschliesslich im versendeten Link.
// (Sicheres Muster aus dem HR-Portal, dort die neueren Flows.)
// ============================================================
import { createHash } from "node:crypto";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
