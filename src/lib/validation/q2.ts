// ============================================================
// src/lib/validation/q2.ts
// Validierung der Q2-Schutz-Bloecke (Zod, deutsche Meldungen).
// ============================================================
import { z } from "zod";

export const q2BlockSchema = z.object({
  titel: z.string().trim().min(1, "Titel ist erforderlich").max(120, "Titel ist zu lang"),
  wochentag: z.number().int().min(1, "Ungueltiger Wochentag").max(7, "Ungueltiger Wochentag"),
  startMinute: z.number().int().min(0).max(1439, "Ungueltige Uhrzeit"),
  dauerMin: z.number().int().min(15, "Mindestens 15 Minuten").max(720, "Maximal 12 Stunden"),
  goalId: z.string().min(1).nullable().optional(),
});

export type Q2BlockInput = z.infer<typeof q2BlockSchema>;
