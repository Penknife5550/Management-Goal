// ============================================================
// src/lib/validation/task.ts
// Validierung der Aufgaben (Zod, deutsche Meldungen).
// Status-Enum leitet sich aus TASK_STATUS_WERTE ab (Single-Source).
// ============================================================
import { z } from "zod";
import { TASK_STATUS_WERTE } from "@/lib/eisenhower";

const STATUS = TASK_STATUS_WERTE;

// Quick-Add: bewusst minimal. important/urgent optional (Default false = Quadrant 4).
export const taskCreateSchema = z.object({
  titel: z
    .string({ required_error: "Titel ist erforderlich" })
    .trim()
    .min(1, "Titel ist erforderlich")
    .max(200, "Titel ist zu lang (max. 200 Zeichen)"),
  important: z.boolean().optional(),
  urgent: z.boolean().optional(),
  goalId: z.string().min(1).nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
});

export const taskUpdateSchema = z
  .object({
    titel: z.string().trim().min(1, "Titel darf nicht leer sein").max(200).optional(),
    status: z.enum(STATUS).optional(),
    important: z.boolean().optional(),
    urgent: z.boolean().optional(),
    position: z.number().optional(),
    goalId: z.string().min(1).nullable().optional(),
    dueDate: z.coerce.date().nullable().optional(),
  })
  .strict();

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;

// Envelope des KI-Callbacks (KI-Eisenhower, Schritt 5). Nur die Zuordnungs-Felder
// werden hier geprueft; der KI-Inhalt (important/urgent/confidence/reasoning) wird
// separat von parseKiAntwort() validiert (isoliert unit-testbar).
export const aiCallbackSchema = z.object({
  jobKey: z.string().min(1, "jobKey fehlt"),
  taskId: z.string().min(1, "taskId fehlt"),
});
