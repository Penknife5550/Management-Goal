import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

// Montserrat = CREDO-Fliesstext (Fallback Arial via globals.css)
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CREDO Fuehrungs-Cockpit",
  description: "Strategische Ebene - Ziele und WIGs",
};

// Erzwingt Request-Zeit-Rendering fuer alle Seiten: die nonce-basierte CSP
// (middleware.ts) funktioniert nur, wenn Next den Nonce beim SSR in die
// Script-Tags stempelt. Statisch prerenderte Seiten haben KEINEN Nonce im
// HTML -> Browser blockiert im Production-Modus jedes Script (totes Skeleton).
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className={montserrat.variable}>
      <body>{children}</body>
    </html>
  );
}
