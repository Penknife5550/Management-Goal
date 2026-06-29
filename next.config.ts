import type { NextConfig } from "next";

// Security-Header inkl. CSP. CLAUDE.md nennt "via Middleware" - bewusst hier ueber
// next.config headers() geloest, weil ein Edge-Middleware-Bundle den Next-15.5-Build
// reproduzierbar haengen liess. Gleicher Sicherheitseffekt, robuster Build.
const istDev = process.env.NODE_ENV === "development";
const scriptSrc = istDev ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'";

const csp = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const sicherheitsHeader = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Bewusst KEIN output: "standalone" - das Docker-Image behaelt die vollen
  // Dependencies (Prisma-CLI/tsx fuer migrate+seed) und startet via "next start".
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: sicherheitsHeader }];
  },
};

export default nextConfig;
