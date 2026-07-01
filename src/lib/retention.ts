// ============================================================
// src/lib/retention.ts
// Aufbewahrungs-Bereinigung: loescht alte EmailLog- und ReminderDispatch-Eintraege
// (DSGVO + unbegrenztes Wachstum). CheckIn bleibt erhalten (Trends/KPIs).
// ============================================================
import {
  RETENTION_DISPATCH_TAGE,
  RETENTION_EMAILLOG_TAGE,
  RETENTION_IDEMPOTENCY_TAGE,
} from "@/lib/constants";
import { prisma } from "@/lib/db";

const TAG_MS = 24 * 60 * 60 * 1000;

export interface CleanupErgebnis {
  emailLogGeloescht: number;
  reminderDispatchGeloescht: number;
  webhookIdempotencyGeloescht: number;
}

export async function bereinigeAlteDaten(jetzt = new Date()): Promise<CleanupErgebnis> {
  const emailLogCutoff = new Date(jetzt.getTime() - RETENTION_EMAILLOG_TAGE * TAG_MS);
  const dispatchCutoff = new Date(jetzt.getTime() - RETENTION_DISPATCH_TAGE * TAG_MS);
  const idempotencyCutoff = new Date(jetzt.getTime() - RETENTION_IDEMPOTENCY_TAGE * TAG_MS);

  const [emailLog, dispatch, idempotency] = await Promise.all([
    prisma.emailLog.deleteMany({ where: { createdAt: { lt: emailLogCutoff } } }),
    prisma.reminderDispatch.deleteMany({ where: { createdAt: { lt: dispatchCutoff } } }),
    prisma.webhookIdempotency.deleteMany({ where: { createdAt: { lt: idempotencyCutoff } } }),
  ]);

  return {
    emailLogGeloescht: emailLog.count,
    reminderDispatchGeloescht: dispatch.count,
    webhookIdempotencyGeloescht: idempotency.count,
  };
}
