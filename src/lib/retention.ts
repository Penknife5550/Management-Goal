// ============================================================
// src/lib/retention.ts
// Aufbewahrungs-Bereinigung: loescht alte EmailLog-, ReminderDispatch-,
// MagicLinkToken- und AuditLog-Eintraege (DSGVO + unbegrenztes Wachstum).
// CheckIn bleibt erhalten (Trends/KPIs).
// ============================================================
import {
  RETENTION_AUDITLOG_TAGE,
  RETENTION_DISPATCH_TAGE,
  RETENTION_EMAILLOG_TAGE,
  RETENTION_IDEMPOTENCY_TAGE,
  RETENTION_MAGICLINK_TAGE,
} from "@/lib/constants";
import { prisma } from "@/lib/db";

const TAG_MS = 24 * 60 * 60 * 1000;

export interface CleanupErgebnis {
  emailLogGeloescht: number;
  reminderDispatchGeloescht: number;
  webhookIdempotencyGeloescht: number;
  magicLinkTokenGeloescht: number;
  auditLogGeloescht: number;
}

export async function bereinigeAlteDaten(jetzt = new Date()): Promise<CleanupErgebnis> {
  const emailLogCutoff = new Date(jetzt.getTime() - RETENTION_EMAILLOG_TAGE * TAG_MS);
  const dispatchCutoff = new Date(jetzt.getTime() - RETENTION_DISPATCH_TAGE * TAG_MS);
  const idempotencyCutoff = new Date(jetzt.getTime() - RETENTION_IDEMPOTENCY_TAGE * TAG_MS);
  const magicLinkCutoff = new Date(jetzt.getTime() - RETENTION_MAGICLINK_TAGE * TAG_MS);
  const auditLogCutoff = new Date(jetzt.getTime() - RETENTION_AUDITLOG_TAGE * TAG_MS);

  const [emailLog, dispatch, idempotency, magicLink, auditLog] = await Promise.all([
    prisma.emailLog.deleteMany({ where: { createdAt: { lt: emailLogCutoff } } }),
    prisma.reminderDispatch.deleteMany({ where: { createdAt: { lt: dispatchCutoff } } }),
    prisma.webhookIdempotency.deleteMany({ where: { createdAt: { lt: idempotencyCutoff } } }),
    // Magic-Link-Tokens sind nach 15 Min ohnehin wertlos; hier fliegen die Reste raus.
    prisma.magicLinkToken.deleteMany({ where: { createdAt: { lt: magicLinkCutoff } } }),
    // Audit-Log: DSGVO-Retention (lang genug fuer Nachweis, siehe constants.ts).
    prisma.auditLog.deleteMany({ where: { createdAt: { lt: auditLogCutoff } } }),
  ]);

  return {
    emailLogGeloescht: emailLog.count,
    reminderDispatchGeloescht: dispatch.count,
    webhookIdempotencyGeloescht: idempotency.count,
    magicLinkTokenGeloescht: magicLink.count,
    auditLogGeloescht: auditLog.count,
  };
}
