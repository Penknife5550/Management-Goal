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
import { prisma } from "@/lib/db";
import { sendEventEmail } from "@/lib/mailer";

export const STALE_TAGE = 7;
const TAG_MS = 24 * 60 * 60 * 1000;
const DEDUPE_LOOKBACK_MS = 20 * TAG_MS / 24; // 20 Stunden
const REMINDER_EVENT = "weekly-checkin-reminder";
const SWITCH_KEY = "remindersGloballyEnabled";

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
  faellige: number;
  grund?: string;
}

export async function dispatchWeeklyReminders(jetzt = new Date()): Promise<DispatchErgebnis> {
  if (!(await istReminderGlobalAktiv())) {
    return { versendet: 0, uebersprungen: 0, faellige: 0, grund: "Reminder global deaktiviert" };
  }

  const fokus = await prisma.goal.findMany({
    where: { status: "FOKUS" },
    include: { owner: true },
  });
  const buendel = buendleNachOwner(fokus, jetzt);

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const seit = new Date(jetzt.getTime() - DEDUPE_LOOKBACK_MS);
  let versendet = 0;
  let uebersprungen = 0;

  for (const b of buendel) {
    const empfaenger = b.email.toLowerCase();
    const schonGesendet = await prisma.emailLog.findFirst({
      where: {
        event: REMINDER_EVENT,
        status: "SENT",
        isTest: false,
        recipient: empfaenger,
        createdAt: { gte: seit },
      },
    });
    if (schonGesendet) {
      uebersprungen++;
      continue;
    }

    const ergebnis = await sendEventEmail(REMINDER_EVENT, {
      email: b.email,
      name: b.name,
      anzahl: b.titel.length,
      wigListe: b.titel.join(", "),
      link: `${appUrl}/ziele`,
    });
    if (ergebnis.status === "SENT") versendet++;
    else uebersprungen++;
  }

  return { versendet, uebersprungen, faellige: buendel.length };
}
