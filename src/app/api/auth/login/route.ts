// ============================================================
// /api/auth/login
// POST   - Passwort-Login: Rate-Limit, bcrypt-Vergleich (timing-gleich auch
//          bei unbekannter E-Mail), Session-Cookie, Audit.
// DELETE - Logout: Cookie loeschen, Audit.
// ============================================================
import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { rateLimit } from "@/lib/admin-guard";
import { jsonError, jsonOk, parseBody } from "@/lib/api";
import { clientIp, schreibeAudit } from "@/lib/audit";
import { clearSessionCookie, createSessionToken, getSession, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validation/auth";

// Gueltiger bcrypt-Hash eines Zufallswerts: bei unbekannter E-Mail oder fehlendem
// passwordHash wird trotzdem verglichen, damit die Antwortzeit nicht verraet,
// ob das Konto existiert (Timing-Gleichheit, kein User-Enumeration-Leak).
const DUMMY_HASH = "$2b$12$Kbk/Y2Wt9uZUxIlEO5UkaOvLmzP5PhUuI431SZrl5edUI033k0NSW";

const LOGIN_FEHLER = "E-Mail oder Passwort ist falsch.";

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request) ?? "unbekannt";
    // IP-Limit VOR dem Body-Parsing (billigster Check zuerst).
    if (!rateLimit(`login-ip:${ip}`, 5, 60_000)) {
      return jsonError("Zu viele Versuche. Bitte kurz warten.", 429);
    }

    const p = await parseBody(request, loginSchema);
    if (!p.ok) return p.response;
    const { email, password } = p.data;

    // Zweites Limit je Konto: bremst verteilte Versuche auf eine Adresse.
    if (!rateLimit(`login-mail:${email}`, 10, 15 * 60_000)) {
      return jsonError("Zu viele Versuche. Bitte kurz warten.", 429);
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // bcrypt IMMER ausfuehren (ggf. gegen Dummy-Hash) - Timing-Gleichheit.
    const passwortOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

    if (!user || !user.passwordHash || !passwortOk || !user.isActive) {
      await schreibeAudit({
        aktion: "LOGIN_FEHLGESCHLAGEN",
        details: { email },
        ipAddress: clientIp(request),
      });
      return jsonError(LOGIN_FEHLER, 401);
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      rolle: user.role,
      rechtseinheitId: user.rechtseinheitId,
    });
    await setSessionCookie(token);
    await schreibeAudit({ aktion: "LOGIN_ERFOLG", userId: user.id, ipAddress: clientIp(request) });

    return jsonOk({ email: user.email, name: user.name, rolle: user.role });
  } catch (fehler) {
    console.error("POST /api/auth/login fehlgeschlagen:", fehler);
    return jsonError("Anmeldung fehlgeschlagen. Bitte erneut versuchen.", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    await clearSessionCookie();
    await schreibeAudit({
      aktion: "LOGOUT",
      userId: session?.userId ?? null,
      ipAddress: clientIp(request),
    });
    return jsonOk({ ok: true });
  } catch (fehler) {
    console.error("DELETE /api/auth/login fehlgeschlagen:", fehler);
    return jsonError("Abmeldung fehlgeschlagen.", 500);
  }
}
