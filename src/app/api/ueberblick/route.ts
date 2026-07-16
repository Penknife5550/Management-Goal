// ============================================================
// /api/ueberblick  (GET)
// GF-Aggregat (AP5): read-only Fuehrungs-Ueberblick ueber die eigene
// Rechtseinheit. Nur fuer Administratoren (withAdmin -> 403 sonst). Der Scope
// ist rechtseinheitId des angemeldeten Admins - keine fremde Rechtseinheit.
// ============================================================
import { jsonOk } from "@/lib/api";
import { withAdmin } from "@/lib/admin-guard";
import { getAktuellerNutzer } from "@/lib/auth";
import { ladeUeberblick } from "@/lib/ueberblick-data";

export const GET = withAdmin("GET /api/ueberblick", async () => {
  // withAdmin hat die Rolle bereits DB-frisch geprueft; hier nur die
  // Rechtseinheit als Scope-Schluessel holen.
  const nutzer = await getAktuellerNutzer();
  const daten = await ladeUeberblick(nutzer.rechtseinheitId, new Date());
  return jsonOk(daten);
});
