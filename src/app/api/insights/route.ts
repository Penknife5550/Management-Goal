// ============================================================
// GET /api/insights
// Fuehrungs-Insights (AP 1): verdichtet die Ziele + Aufgaben des Nutzers zu
// deterministischen Findings (Watermelon, Fokus-Leck, Zombie, Trend, Beitrag).
// Owner-scoped wie /api/goals. Rein lesend, keine KI (die formuliert erst AP 3).
// ============================================================
import { jsonError, jsonOk } from "@/lib/api";
import { getAktuellerNutzer, NichtAngemeldetError } from "@/lib/auth";
import { ladeInsightsFuerNutzer } from "@/lib/insight-data";

export async function GET() {
  try {
    const nutzer = await getAktuellerNutzer();
    const { insights } = await ladeInsightsFuerNutzer(nutzer.id, new Date());
    return jsonOk(insights);
  } catch (fehler) {
    if (fehler instanceof NichtAngemeldetError) return jsonError("Nicht angemeldet.", 401);
    console.error("GET /api/insights fehlgeschlagen:", fehler);
    return jsonError("Insights konnten nicht berechnet werden.", 500);
  }
}
