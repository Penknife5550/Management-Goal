// ============================================================
// src/middleware.ts
// 1) Auth-Guard (AP6): blockt unangemeldete Zugriffe kantenseitig
//    (Seiten -> Redirect /login, APIs -> 401). Zweite Linie ist
//    getAktuellerNutzer() in den Routen.
// 2) Security-Header inkl. nonce-basierter CSP (CLAUDE.md: "CSP-Headers via
//    Middleware"). Schwaecht XSS-Token-Exfiltration ab (connect-src 'self')
//    und blockiert fremde Scripts. Nonce-Pattern nach Next.js 15.
// ============================================================
import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";

// Oeffentlich ohne Session: Login-Seite, Auth-APIs (Login/Magic-Link),
// Cron-Routen (eigener CRON_SECRET-Schutz) und der n8n-Callback (eigenes Secret).
function istOeffentlich(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/cron/") ||
    pathname === "/api/ai/callback"
  );
}

// JWT-Pruefung direkt mit jose statt via lib/auth: die Middleware laeuft in der
// Edge-Runtime und lib/auth haengt an next/headers (cookies()), das hier nicht
// verfuegbar ist. Nur Signatur/Ablauf pruefen - die Feld-Validierung macht
// getAktuellerNutzer() in den Routen erneut.
let cachedSecret: Uint8Array | null = null;

// Gibt die verifizierte Payload zurueck (fuer den Seiten-Rollen-Check), null bei
// ungueltig/abgelaufen. Nur Signatur/Ablauf - die autoritative, DB-frische
// Pruefung macht getAktuellerNutzer() in den Routen.
async function pruefeSession(token: string): Promise<{ rolle?: string } | null> {
  try {
    if (!cachedSecret) {
      const secret = process.env.JWT_SECRET ?? "";
      if (!secret) return null;
      cachedSecret = new TextEncoder().encode(secret);
    }
    const { payload } = await jwtVerify(token, cachedSecret, { algorithms: ["HS256"] });
    return payload as { rolle?: string };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await pruefeSession(token) : null;
  const angemeldet = session !== null;

  if (istOeffentlich(pathname)) {
    // Bereits angemeldete Nutzer haben auf /login nichts verloren.
    if (pathname === "/login" && angemeldet) {
      return NextResponse.redirect(new URL("/heute", request.url));
    }
  } else if (!angemeldet) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL("/login", request.url));
    // Ungueltiges/abgelaufenes Cookie gleich aufraeumen.
    if (token) response.cookies.delete(SESSION_COOKIE);
    return response;
  } else if (
    (pathname.startsWith("/einstellungen") || pathname.startsWith("/ueberblick")) &&
    session.rolle !== "ADMIN"
  ) {
    // Defense-in-Depth: die ADMIN-Seiten (Einstellungen, Fuehrungs-Ueberblick)
    // nur fuer Admins (die APIs erzwingen die Rolle ohnehin DB-frisch via
    // withAdmin). Rolle aus dem Token genuegt hier fuers Seiten-Gating.
    return NextResponse.redirect(new URL("/heute", request.url));
  }

  const nonce = btoa(crypto.randomUUID());
  const dev = process.env.NODE_ENV !== "production";

  const csp = [
    `default-src 'self'`,
    // 'strict-dynamic' + Nonce: nur nonce-markierte (Next-)Scripts + von ihnen geladene.
    // In Dev braucht Next 'unsafe-eval' (HMR/React-Refresh).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`, // Tailwind + inline style-Attribute (CREDO-Linie)
    `img-src 'self' data: blob:`,
    `font-src 'self' data:`,
    `connect-src 'self'`, // verhindert Exfiltration an fremde Hosts
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
  ].join("; ");

  // Nonce + CSP auf den REQUEST setzen, damit Next den Nonce auf seine Scripts anwendet.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", csp);
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set("x-frame-options", "DENY");
  return response;
}

export const config = {
  // Alles ausser statischen Assets / Bildern.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
