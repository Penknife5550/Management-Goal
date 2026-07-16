// ============================================================
// GET /api/auth/session
// Liefert die aktuelle Session (fuer Client-Bausteine, z.B. Namensanzeige).
// ============================================================
import { jsonError, jsonOk } from "@/lib/api";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return jsonError("Nicht angemeldet.", 401);
    return jsonOk({ email: session.email, name: session.name, rolle: session.rolle });
  } catch (fehler) {
    console.error("GET /api/auth/session fehlgeschlagen:", fehler);
    return jsonError("Session konnte nicht geprueft werden.", 500);
  }
}
