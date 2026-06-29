// ============================================================
// /api/settings/smtp
// GET  - SMTP-Konfiguration laden (Passwort maskiert)
// PUT  - SMTP-Konfiguration speichern (Passwort verschluesselt)
// Schutz: ADMIN_TOKEN (Uebergang bis RBAC, Phase 4).
// ============================================================
import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { requireAdminToken } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import { encrypt, isEncryptionConfigured } from "@/lib/encryption";
import { smtpConfigSchema } from "@/lib/validation/mail";

const MASKE = "••••••••";

const DEFAULTS = {
  id: "default",
  host: "",
  port: 587,
  secure: false,
  username: "",
  fromEmail: "",
  fromName: "CREDO Fuehrungs-Cockpit",
  replyToEmail: "",
  isActive: false,
};

export async function GET(request: NextRequest) {
  const verweigert = requireAdminToken(request);
  if (verweigert) return verweigert;
  try {
    const config = await prisma.smtpConfig.findUnique({ where: { id: "default" } });
    if (!config) return jsonOk({ ...DEFAULTS, password: "", encryptionConfigured: isEncryptionConfigured() });
    // Passwort niemals im Klartext herausgeben.
    const { password, ...rest } = config;
    return jsonOk({ ...rest, password: password ? MASKE : "", encryptionConfigured: isEncryptionConfigured() });
  } catch (fehler) {
    console.error("GET /api/settings/smtp fehlgeschlagen:", fehler);
    return jsonError("SMTP-Konfiguration konnte nicht geladen werden.", 500);
  }
}

export async function PUT(request: NextRequest) {
  const verweigert = requireAdminToken(request);
  if (verweigert) return verweigert;
  try {
    const body = await request.json().catch(() => null);
    const parsed = smtpConfigSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Ungueltige Eingabe.", 400);
    const d = parsed.data;

    // Bei Aktivierung sind Kern-Felder Pflicht.
    if (d.isActive) {
      if (!d.host) return jsonError("SMTP-Host ist ein Pflichtfeld.", 400);
      if (!d.username) return jsonError("Benutzername ist ein Pflichtfeld.", 400);
      if (!d.fromEmail) return jsonError("Absender-Adresse ist ein Pflichtfeld.", 400);
    }

    const bestehend = await prisma.smtpConfig.findUnique({ where: { id: "default" } });

    // Passwort: leer/maskiert = unveraendert lassen; neuer Wert = verschluesseln.
    let passwortWert = bestehend?.password ?? "";
    const neuesPasswort = d.password && d.password !== MASKE;
    if (neuesPasswort) {
      if (!isEncryptionConfigured()) {
        return jsonError(
          "ENCRYPTION_KEY ist nicht konfiguriert — das SMTP-Passwort kann nicht sicher gespeichert werden.",
          500,
        );
      }
      passwortWert = encrypt(d.password);
    }

    if (d.isActive && !passwortWert) {
      return jsonError("Passwort ist ein Pflichtfeld zum Aktivieren.", 400);
    }

    const daten = {
      host: d.host,
      port: d.port,
      secure: d.secure,
      username: d.username,
      password: passwortWert,
      fromEmail: d.fromEmail,
      fromName: d.fromName,
      replyToEmail: d.replyToEmail,
      isActive: d.isActive,
    };

    const gespeichert = await prisma.smtpConfig.upsert({
      where: { id: "default" },
      update: daten,
      create: { id: "default", ...daten },
    });

    const { password, ...rest } = gespeichert;
    return jsonOk({ ...rest, password: password ? MASKE : "", encryptionConfigured: isEncryptionConfigured() });
  } catch (fehler) {
    console.error("PUT /api/settings/smtp fehlgeschlagen:", fehler);
    return jsonError("SMTP-Konfiguration konnte nicht gespeichert werden.", 500);
  }
}
