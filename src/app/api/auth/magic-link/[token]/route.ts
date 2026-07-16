// ============================================================
// GET /api/auth/magic-link/[token]
// Anmelde-Link einloesen. Das Einloesen ist ATOMAR (updateMany mit
// usedAt:null-Bedingung): auch bei zwei parallelen Klicks gewinnt genau
// einer - der Token ist strikt Single-Use.
// ============================================================
import { NextResponse, type NextRequest } from "next/server";
import { clientIp, schreibeAudit } from "@/lib/audit";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/token-hash";

type Kontext = { params: Promise<{ token: string }> };

export async function GET(request: NextRequest, { params }: Kontext) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const abgelehnt = NextResponse.redirect(`${appUrl}/login?fehler=link`);

  try {
    const { token } = await params;
    const tokenHash = hashToken(token);

    // Atomar als verbraucht markieren: nur wenn unbenutzt UND nicht abgelaufen.
    const eingeloest = await prisma.magicLinkToken.updateMany({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (eingeloest.count !== 1) {
      await schreibeAudit({ aktion: "MAGIC_LINK_ABGELEHNT", ipAddress: clientIp(request) });
      return abgelehnt;
    }

    const row = await prisma.magicLinkToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!row || !row.user.isActive) {
      await schreibeAudit({
        aktion: "MAGIC_LINK_ABGELEHNT",
        userId: row?.userId ?? null,
        ipAddress: clientIp(request),
      });
      return abgelehnt;
    }

    const user = row.user;
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const sessionToken = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      rolle: user.role,
      rechtseinheitId: user.rechtseinheitId,
    });
    await setSessionCookie(sessionToken);
    await schreibeAudit({
      aktion: "MAGIC_LINK_EINGELOEST",
      userId: user.id,
      ipAddress: clientIp(request),
    });

    return NextResponse.redirect(`${appUrl}/heute`);
  } catch (fehler) {
    console.error("GET /api/auth/magic-link/[token] fehlgeschlagen:", fehler);
    return abgelehnt;
  }
}
