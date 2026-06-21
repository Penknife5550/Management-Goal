import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hinweis: bewusst KEIN output: "standalone" - das Docker-Image behaelt die
  // vollen Dependencies (Prisma-CLI/tsx fuer migrate+seed) und startet via "next start".
  // Standalone-Optimierung ist eine spaetere Ausbaustufe (eigener Build-Schritt).
  reactStrictMode: true,
};

export default nextConfig;
