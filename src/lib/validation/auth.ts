// ============================================================
// src/lib/validation/auth.ts
// Validierung der Auth-Routen (Zod, deutsche Meldungen).
// Input-Hardening: harte Laengen-Limits gegen Abuse (RFC-5321-Maximum
// fuer E-Mail; Passwort-Limit schuetzt bcrypt vor Riesen-Eingaben).
// ============================================================
import { z } from "zod";

const emailSchema = z
  .string({ required_error: "E-Mail ist erforderlich." })
  .trim()
  .min(1, "E-Mail ist erforderlich.")
  .max(254, "E-Mail ist zu lang.")
  .email("Bitte eine gueltige E-Mail-Adresse angeben.")
  .transform((v) => v.toLowerCase());

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ required_error: "Passwort ist erforderlich." })
    .min(1, "Passwort ist erforderlich.")
    .max(256, "Passwort ist zu lang."),
});

export const magicLinkSchema = z.object({
  email: emailSchema,
});
