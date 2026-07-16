// ============================================================
// src/lib/briefing-service.ts
// Montags-Briefing (AP3): waehlt Nutzer aus + versendet das Wochen-Briefing.
// Baut auf demselben robusten Muster wie reminders.ts auf:
//  - globaler Kill-Switch (AppSetting) + pro-User montagsBriefingEnabled
//  - Idempotenz je ISO-Woche ueber ReminderDispatch (event="montags-briefing")
//  - begrenzt-parallel, FAILED gibt die Reservierung frei (Retry moeglich)
// Auswahl: aktive Nutzer mit >=1 FOKUS-Ziel. Inhalt: Tagesurteil + Top-Insights.
// ============================================================
import { Prisma } from "@prisma/client";
import { holeKiKommentar } from "@/lib/ai-briefing";
import { rendereBriefing } from "@/lib/briefing";
import { prisma } from "@/lib/db";
import { ladeInsightsFuerNutzer } from "@/lib/insight-data";
import { sendRenderedEmail } from "@/lib/mailer";
import { isoWeekKey } from "@/lib/reminders";

const BRIEFING_EVENT = "montags-briefing";
const SWITCH_KEY = "montagsBriefingGloballyEnabled";
const MAIL_BATCH = 3;

// ---- globaler Kill-Switch (AppSetting) ----
export async function istBriefingGlobalAktiv(): Promise<boolean> {
  const s = await prisma.appSetting.findUnique({ where: { key: SWITCH_KEY } });
  return s ? s.value === "true" : true; // Default: aktiviert
}

export async function setBriefingGlobalAktiv(aktiv: boolean): Promise<void> {
  const value = String(aktiv);
  await prisma.appSetting.upsert({
    where: { key: SWITCH_KEY },
    update: { value },
    create: { key: SWITCH_KEY, value },
  });
}

export interface BriefingErgebnis {
  versendet: number;
  uebersprungen: number;
  fehlgeschlagen: number;
  kandidaten: number;
  grund?: string;
}

export async function dispatchMontagsBriefing(jetzt = new Date()): Promise<BriefingErgebnis> {
  if (!(await istBriefingGlobalAktiv())) {
    return {
      versendet: 0,
      uebersprungen: 0,
      fehlgeschlagen: 0,
      kandidaten: 0,
      grund: "Briefing global deaktiviert",
    };
  }

  // Empfaenger: aktive Nutzer mit Consent und mindestens einem FOKUS-Ziel.
  const nutzer = await prisma.user.findMany({
    where: {
      isActive: true,
      montagsBriefingEnabled: true,
      goals: { some: { status: "FOKUS" } },
    },
    select: { id: true, email: true, name: true },
  });

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const periodKey = isoWeekKey(jetzt);

  async function verarbeiteNutzer(u: {
    id: string;
    email: string;
    name: string;
  }): Promise<"versendet" | "uebersprungen" | "fehlgeschlagen"> {
    if (!u.email) return "uebersprungen";
    const reservierung = { recipient: u.email.toLowerCase(), event: BRIEFING_EVENT, periodKey };

    // Reservierung VOR dem Versand (Unique-Constraint = doppelversand-sicher,
    // auch bei parallelen Cron-Laeufen). P2002 = diese Woche schon bedient.
    try {
      await prisma.reminderDispatch.create({ data: reservierung });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
        return "uebersprungen";
      console.error("[Briefing] Reservierung fehlgeschlagen:", e instanceof Error ? e.message : e);
      return "fehlgeschlagen";
    }

    async function reservierungFreigeben(): Promise<void> {
      await prisma.reminderDispatch
        .deleteMany({ where: reservierung })
        .catch((e) => console.error("[Briefing] Reservierung-Rollback fehlgeschlagen:", e));
    }

    try {
      const { insights, fokusAmpeln } = await ladeInsightsFuerNutzer(u.id, jetzt);
      // KI-Veredelung (optional): wirft nie, liefert null wenn nicht konfiguriert
      // oder Ollama/n8n ausfaellt -> deterministischer Fallback.
      const kiKommentar = await holeKiKommentar({ fokusAmpeln, insights });
      const mail = rendereBriefing({ name: u.name, fokusAmpeln, insights, appUrl, kiKommentar });
      // Kein FOKUS-Ziel mehr (Race zwischen Auswahl und Laden) -> nichts senden.
      if (!mail) {
        await reservierungFreigeben();
        return "uebersprungen";
      }

      const ergebnis = await sendRenderedEmail(BRIEFING_EVENT, {
        to: u.email,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      });
      if (ergebnis.status === "SENT") return "versendet";

      // SKIPPED = dauerhaft nicht zustellbar (z.B. Adresse ausserhalb der
      // Allowlist): Reservierung BEHALTEN (kein Retry diese Woche, kein
      // Log-Rauschen), als "uebersprungen" zaehlen.
      if (ergebnis.status === "SKIPPED") return "uebersprungen";

      // FAILED = transient (SMTP): Reservierung freigeben -> Retry moeglich.
      await reservierungFreigeben();
      return "fehlgeschlagen";
    } catch (e) {
      console.error("[Briefing] Versand fehlgeschlagen:", e instanceof Error ? e.message : e);
      await reservierungFreigeben();
      return "fehlgeschlagen";
    }
  }

  let versendet = 0;
  let uebersprungen = 0;
  let fehlgeschlagen = 0;
  for (let i = 0; i < nutzer.length; i += MAIL_BATCH) {
    const ergebnisse = await Promise.all(nutzer.slice(i, i + MAIL_BATCH).map(verarbeiteNutzer));
    for (const e of ergebnisse) {
      if (e === "versendet") versendet++;
      else if (e === "uebersprungen") uebersprungen++;
      else fehlgeschlagen++;
    }
  }

  return { versendet, uebersprungen, fehlgeschlagen, kandidaten: nutzer.length };
}
