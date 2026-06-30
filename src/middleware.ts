// ============================================================
// src/middleware.ts
// Security-Header inkl. nonce-basierter CSP (CLAUDE.md: "CSP-Headers via Middleware").
// Schwaecht XSS-Token-Exfiltration ab (connect-src 'self') und blockiert
// fremde Scripts. Nonce-Pattern nach Next.js 15 (script-src ohne unsafe-inline).
// ============================================================
import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
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
