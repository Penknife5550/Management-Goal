// ============================================================
// /api/settings/email-templates
// GET - alle Katalog-Events mit effektiver Vorlage (DB vor Code-Default)
// PUT - eine Vorlage je Event speichern (upsert)
// Schutz: nur Administratoren (Session-Rolle via withAdmin).
// ============================================================
import { Prisma } from "@prisma/client";
import { jsonError, jsonOk, parseBody } from "@/lib/api";
import { withAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import { EVENT_CATALOG } from "@/lib/email-events";
import { getDefaultTemplate } from "@/lib/default-email-templates";
import { emailTemplateSchema } from "@/lib/validation/mail";

export const GET = withAdmin("GET /api/settings/email-templates", async () => {
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
});

export const PUT = withAdmin("PUT /api/settings/email-templates", async (request) => {
  const p = await parseBody(request, emailTemplateSchema);
  if (!p.ok) return p.response;
  const d = p.data;

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
});
