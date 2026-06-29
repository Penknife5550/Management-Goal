// ============================================================
// /api/settings/email-templates
// GET - alle Katalog-Events mit effektiver Vorlage (DB vor Code-Default)
// PUT - eine Vorlage je Event speichern (upsert)
// Schutz: ADMIN_TOKEN.
// ============================================================
import { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { requireAdminToken } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import { EVENT_CATALOG } from "@/lib/email-events";
import { getDefaultTemplate } from "@/lib/default-email-templates";
import { emailTemplateSchema } from "@/lib/validation/mail";

export async function GET(request: NextRequest) {
  const verweigert = requireAdminToken(request);
  if (verweigert) return verweigert;
  try {
    const dbTemplates = await prisma.emailTemplate.findMany();
    const dbByEvent = new Map(dbTemplates.map((t) => [t.event, t]));

    const liste = EVENT_CATALOG.map((def) => {
      const db = dbByEvent.get(def.event);
      const fallback = getDefaultTemplate(def.event);
      const eff = db ?? fallback;
      return {
        event: def.event,
        name: def.name,
        recipientHint: def.recipientHint,
        defaultRecipientTo: def.defaultRecipientTo,
        variables: def.variables,
        source: db ? "db" : "default",
        subject: eff?.subject ?? "",
        bodyHtml: eff?.bodyHtml ?? "",
        bodyText: eff?.bodyText ?? "",
        recipientTo: db?.recipientTo ?? "",
        recipientCc: db?.recipientCc ?? "",
        recipientBcc: db?.recipientBcc ?? "",
        recipientReplyTo: db?.recipientReplyTo ?? "",
        isActive: db?.isActive ?? true,
      };
    });
    return jsonOk(liste);
  } catch (fehler) {
    console.error("GET /api/settings/email-templates fehlgeschlagen:", fehler);
    return jsonError("Vorlagen konnten nicht geladen werden.", 500);
  }
}

export async function PUT(request: NextRequest) {
  const verweigert = requireAdminToken(request);
  if (verweigert) return verweigert;
  try {
    const body = await request.json().catch(() => null);
    const parsed = emailTemplateSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Ungueltige Eingabe.", 400);
    const d = parsed.data;

    // Nur bekannte Events zulassen.
    const def = EVENT_CATALOG.find((e) => e.event === d.event);
    if (!def) return jsonError("Unbekanntes Event.", 400);

    const daten = {
      name: d.name,
      subject: d.subject,
      bodyHtml: d.bodyHtml,
      bodyText: d.bodyText ?? null,
      variables: def.variables as unknown as Prisma.InputJsonValue,
      recipientTo: d.recipientTo,
      recipientCc: d.recipientCc,
      recipientBcc: d.recipientBcc,
      recipientReplyTo: d.recipientReplyTo,
      isActive: d.isActive,
    };

    await prisma.emailTemplate.upsert({
      where: { event: d.event },
      update: daten,
      create: { event: d.event, ...daten },
    });
    return jsonOk({ event: d.event, gespeichert: true });
  } catch (fehler) {
    console.error("PUT /api/settings/email-templates fehlgeschlagen:", fehler);
    return jsonError("Vorlage konnte nicht gespeichert werden.", 500);
  }
}
