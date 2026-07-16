// ============================================================
// POST /api/auth/magic-link
// Anmelde-Link anfordern. Antwortet IMMER mit { ok: true } (ausser IP-Limit),
// egal ob das Konto existiert - kein User-Enumeration-Leak. In der DB liegt
// NUR der SHA-256-Hash des Tokens (token-hash.ts), Klartext nur in der Mail.
// ============================================================
import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { rateLimit } from "@/lib/admin-guard";
import { jsonError, jsonOk, parseBody } from "@/lib/api";
import { clientIp, schreibeAudit } from "@/lib/audit";
import { MAGIC_LINK_TTL_MIN } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { sendEventEmail } from "@/lib/mailer";
import { hashToken } from "@/lib/token-hash";
import { magicLinkSchema } from "@/lib/validation/auth";

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request) ?? "unbekannt";
    if (!rateLimit(`magiclink-ip:${ip}`, 5, 10 * 60_000)) {
      return jsonError("Zu viele Versuche. Bitte kurz warten.", 429);
    }

    const p = await parseBody(request, magicLinkSchema);
    if (!p.ok) return p.response;
    const { email } = p.data;

    // Mail-Limit greift STILL: trotzdem 200, nur kein Versand - sonst wuerde
    // die abweichende Antwort verraten, dass es zu dieser Adresse ein Konto gibt.
    if (!rateLimit(`magiclink-mail:${email}`, 3, 10 * 60_000)) {
      return jsonOk({ ok: true });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (user && user.isActive) {
      // Token-Anlage + Mailversand + Audit laufen ENTKOPPELT vom Response-Pfad
      // (kein await): sonst wuerde die laengere Antwortzeit fuer existierende
      // Konten (DB-Insert + SMTP) das "immer 200" verraten -> Timing-Enumeration.
      void versendeMagicLink(user.id, user.email, user.name, clientIp(request));
    }

    return jsonOk({ ok: true });
  } catch (fehler) {
    console.error("POST /api/auth/magic-link fehlgeschlagen:", fehler);
    // Auch im Fehlerfall keine Unterscheidung nach aussen.
    return jsonOk({ ok: true });
  }
}

// Entkoppelter Nebenpfad: Token anlegen, Anmelde-Mail senden, Audit schreiben.
// Wirft nie in den Aufrufer zurueck (fire-and-forget), Fehler nur ins Log.
async function versendeMagicLink(
  userId: string,
  email: string,
  name: string,
  ip: string | null,
): Promise<void> {
  try {
    const token = randomUUID();
    await prisma.magicLinkToken.create({
      data: {
        tokenHash: hashToken(token),
        userId,
        expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MIN * 60_000),
      },
    });

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    await sendEventEmail("magic-link", {
      email,
      name,
      link: `${appUrl}/api/auth/magic-link/${token}`,
      ttlMinuten: MAGIC_LINK_TTL_MIN,
    });
    await schreibeAudit({ aktion: "MAGIC_LINK_ANGEFORDERT", userId, ipAddress: ip });
  } catch (fehler) {
    console.error("Magic-Link-Versand fehlgeschlagen:", fehler);
  }
}
