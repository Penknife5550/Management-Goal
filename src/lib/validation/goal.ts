// ============================================================
// src/lib/validation/goal.ts
// Server-seitige Eingabe-Validierung (Zod). Deutsche Fehlermeldungen.
// ============================================================
import { z } from "zod";

const STATUS = ["BACKLOG", "FOKUS", "ERREICHT", "ARCHIVIERT"] as const;
const AMPEL = ["GRUEN", "GELB", "ROT"] as const;

// Quick-Add: bewusst minimal (eine Zeile, Tastatur-First).
export const goalQuickAddSchema = z.object({
  titel: z
    .string({ required_error: "Titel ist erforderlich" })
    .trim()
    .min(1, "Titel ist erforderlich")
    .max(200, "Titel ist zu lang (max. 200 Zeichen)"),
});

export const goalUpdateSchema = z
  .object({
    titel: z.string().trim().min(1, "Titel darf nicht leer sein").max(200).optional(),
    outcome: z.string().trim().max(500).nullable().optional(),
    status: z.enum(STATUS).optional(),
    ampel: z.enum(AMPEL).optional(),
    fortschritt: z
      .number()
      .int("Fortschritt muss eine ganze Zahl sein")
      .min(0, "Fortschritt muss zwischen 0 und 100 liegen")
      .max(100, "Fortschritt muss zwischen 0 und 100 liegen")
      .optional(),
    dueDate: z.coerce.date().nullable().optional(),
    abhaengig: z.boolean().optional(),
    // Wird beim Heben auf FOKUS optional ins LearningLog uebernommen (Drucker).
    erwartet: z.string().trim().max(500).optional(),
  })
  .strict();

export const leadMeasureCreateSchema = z.object({
  beschreibung: z.string().trim().min(1, "Beschreibung ist erforderlich").max(200),
  zielwert: z.number().int().min(1, "Zielwert muss mindestens 1 sein"),
});

export const leadMeasureUpdateSchema = z
  .object({
    beschreibung: z.string().trim().min(1).max(200).optional(),
    zielwert: z.number().int().min(1).optional(),
    istwert: z.number().int().min(0).optional(),
  })
  .strict();

// Wochen-Check-in: pro WIG Ampel/Fortschritt + aktualisierte Lead-Istwerte.
export const checkInSchema = z.object({
  items: z
    .array(
      z.object({
        goalId: z.string().min(1),
        ampel: z.enum(AMPEL),
        fortschritt: z
          .number()
          .int("Fortschritt muss eine ganze Zahl sein")
          .min(0, "Fortschritt muss zwischen 0 und 100 liegen")
          .max(100, "Fortschritt muss zwischen 0 und 100 liegen"),
        leads: z
          .array(z.object({ id: z.string().min(1), istwert: z.number().int().min(0) }))
          .default([]),
      }),
    )
    .min(1, "Mindestens eine WIG erforderlich"),
});

export type CheckInInput = z.infer<typeof checkInSchema>;

export type GoalQuickAddInput = z.infer<typeof goalQuickAddSchema>;
export type GoalUpdateInput = z.infer<typeof goalUpdateSchema>;
export type LeadMeasureCreateInput = z.infer<typeof leadMeasureCreateSchema>;
export type LeadMeasureUpdateInput = z.infer<typeof leadMeasureUpdateSchema>;
