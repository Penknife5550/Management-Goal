// ============================================================
// src/lib/reminders.ts
// Wochen-Check-in-Erinnerung: Auswahl-Logik + Versand-Dispatch.
//
// Signal: eine FOKUS-WIG ist faellig, wenn ihr letzter Check-in (lastCheckinAt,
// ersatzweise createdAt) laenger als STALE_TAGE her ist.
// Consent: globaler Kill-Switch (AppSetting) UND pro-User emailRemindersEnabled.
// Batching: pro Owner EINE Mail mit allen faelligen WIGs (kein Spam).
// Idempotenz: ein Lookback-Fenster verhindert Doppelversand bei Mehrfach-Trigger
//             am selben Tag (robuster als Kalendertag-Mathematik ueber Zeitzonen).
//             Den eigentlichen Versandzeitpunkt steuert der Host-Cron (Europe/Berlin).
// ============================================================
import { Prisma } from "@prisma/client";
import { CHECKIN_FAELLIG_TAGE } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { sendEventEmail } from "@/lib/mailer";

// Einzige Quelle der Schwelle (geteilt mit der UI, siehe lib/check-in.ts).
export const STALE_TAGE = CHECKIN_FAELLIG_TAGE;
const TAG_MS = 24 * 60 * 60 * 1000;
const REMINDER_EVENT = "weekly-checkin-reminder";
const SWITCH_KEY = "remindersGloballyEnabled";

// ISO-8601-Kalenderwoche als Schluessel, z.B. "2026-W27" (Donnerstag-Regel).
// Dient als Idempotenz-Periode: max. eine Reminder-Mail je Empfaenger und Woche.
// Berechnung aus den UTC-Datumsteilen; der Cron laeuft Mo 08:00 Europe/Berlin,
// daher entspricht das UTC-Datum dem Berliner Kalendertag.
export function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Mo=0 … So=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // Donnerstag dieser Woche
  const donnerstag = d.getTime();
  const jahr = new Date(donnerstag).getUTCFullYear();
  const jahresStart = new Date(Date.UTC(jahr, 0, 4)); // 4. Jan liegt immer in KW1
  const jsDayNum = (jahresStart.getUTCDay() + 6) % 7;
  jahresStart.setUTCDate(jahresStart.getUTCDate() - jsDayNum + 3);
  const woche = 1 + Math.round((donnerstag - jahresStart.getTime()) / (7 * TAG_MS));
  return `${jahr}-W${String(woche).padStart(2, "0")}`;
}

// ---- reine Auswahl-Logik (unit-testbar, keine DB) ----
export interface FaelligkeitsGoal {
  status: string;
  lastCheckinAt: Date | null;
  createdAt: Date;
}

export function istWigFaellig(goal: FaelligkeitsGoal, jetzt: Date): boolean {
  if (goal.status !== "FOKUS") return false;
  const bezug = goal.lastCheckinAt ?? goal.createdAt;
  return jetzt.getTime() - bezug.getTime() >= STALE_TAGE * TAG_MS;
}

export interface OwnerBuendel {
  ownerId: string;
  email: string;
  name: string;
  titel: string[];
}

// Gruppiert faellige WIGs je Owner; respektiert Consent + gueltige Adresse.
export function buendleNachOwner(
  goals: Array<
    FaelligkeitsGoal & {
      titel: string;
      ownerId: string;
      owner: { email: string; name: string; emailRemindersEnabled: boolean };
    }
  >,
  jetzt: Date,
): OwnerBuendel[] {
  const map = new Map<string, OwnerBuendel>();
  for (const g of goals) {
    if (!istWigFaellig(g, jetzt)) continue;
    if (!g.owner.emailRemindersEnabled) continue;
    if (!g.owner.email) continue;
    const vorhanden = map.get(g.ownerId);
    if (vorhanden) {
      vorhanden.titel.push(g.titel);
    } else {
      map.set(g.ownerId, {
        ownerId: g.ownerId,
        email: g.owner.email,
        name: g.owner.name,
        titel: [g.titel],
      });
    }
  }
  return [...map.values()];
}

// ---- globaler Kill-Switch (AppSetting) ----
export async function istReminderGlobalAktiv(): Promise<boolean> {
  const s = await prisma.appSetting.findUnique({ where: { key: SWITCH_KEY } });
  return s ? s.value === "true" : true; // Default: aktiviert
}

export async function setReminderGlobalAktiv(aktiv: boolean): Promise<void> {
  const value = String(aktiv);
  await prisma.appSetting.upsert({
    where: { key: SWITCH_KEY },
    update: { value },
    create: { key: SWITCH_KEY, value },
  });
}

// ---- Versand-Dispatch (DB-IO) ----
export interface DispatchErgebnis {
  versendet: number;
  uebersprungen: number;
  fehlgeschlagen: number;
  faellige: number;
  grund?: string;
}

export async function dispatchWeeklyReminders(jetzt = new Date()): Promise<DispatchErgebnis> {
  if (!(await istReminderGlobalAktiv())) {
    return { versendet: 0, uebersprungen: 0, fehlgeschlagen: 0, faellige: 0, grund: "Reminder global deaktiviert" };
  }

  const fokus = await prisma.goal.findMany({
    where: { status: "FOKUS" },
    include: { owner: true },
  });
  const buendel = buendleNachOwner(fokus, jetzt);

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const periodKey = isoWeekKey(jetzt);
  let versendet = 0;
  let uebersprungen = 0;
  let fehlgeschlagen = 0;

  for (const b of buendel) {
    const empfaenger = b.email.toLowerCase();

    // Reservierung VOR dem Versand: der Unique-Constraint (recipient,event,periodKey)
    // verhindert Doppelversand auch bei parallelen Cron-Laeufen. P2002 = diese Woche
    // bereits bedient -> ueberspringen.
    try {
      await prisma.reminderDispatch.create({
        data: { recipient: empfaenger, event: REMINDER_EVENT, periodKey },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        uebersprungen++;
        continue;
      }
      throw e;
    }

    const ergebnis = await sendEventEmail(REMINDER_EVENT, {
      email: b.email,
      name: b.name,
      anzahl: b.titel.length,
      wigListe: b.titel.join(", "),
      link: `${appUrl}/check-in`,
    });
    if (ergebnis.status === "SENT") versendet++;
    else fehlgeschlagen++;
    // Reservierung bleibt auch bei Fehlschlag bestehen (at-most-once: lieber kein
    // Reminder als eine Doppel-Mail). Der Fehlergrund steht im EmailLog.
  }

  return { versendet, uebersprungen, fehlgeschlagen, faellige: buendel.length };
}
