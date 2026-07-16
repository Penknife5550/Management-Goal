// ============================================================
// /api/settings/email-log  (GET)
// Letzte Versandprotokoll-Eintraege (max. 100). Schutz: nur Administratoren (withAdmin).
// ============================================================
import { jsonOk } from "@/lib/api";
import { withAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";

export const GET = withAdmin("GET /api/settings/email-log", async () => {
  // Nur die im Protokoll angezeigten Felder ausliefern (kein Leak von messageId/cc/bcc).
  const logs = await prisma.emailLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      event: true,
      recipient: true,
      subject: true,
      status: true,
      detail: true,
      isTest: true,
      createdAt: true,
    },
  });
  return jsonOk(logs);
});
