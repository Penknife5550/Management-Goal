// ============================================================
// tests/unit/reminders-dispatch.test.ts
// dispatchWeeklyReminders mit gemocktem Prisma/Mailer: Kill-Switch, Dedupe (P2002),
// FAILED-Rollback der Reservierung und Robustheit gegen Einzel-DB-Fehler.
// ============================================================
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    appSetting: { findUnique: vi.fn() },
    goal: { findMany: vi.fn() },
    reminderDispatch: { create: vi.fn(), deleteMany: vi.fn() },
  },
}));
vi.mock("@/lib/mailer", () => ({ sendEventEmail: vi.fn() }));

import { prisma } from "@/lib/db";
import { sendEventEmail } from "@/lib/mailer";
import { dispatchWeeklyReminders } from "@/lib/reminders";

const JETZT = new Date("2026-06-29T08:00:00.000Z");
const alt = new Date(JETZT.getTime() - 10 * 24 * 60 * 60 * 1000); // faellig (>7 T)

const goal = (over: Record<string, unknown> = {}) => ({
  id: "g1",
  titel: "WIG A",
  status: "FOKUS",
  lastCheckinAt: alt,
  createdAt: alt,
  ownerId: "u1",
  owner: { email: "fk@credo-gruppe.de", name: "FK", emailRemindersEnabled: true },
  ...over,
});

const m = {
  switch: vi.mocked(prisma.appSetting.findUnique),
  goals: vi.mocked(prisma.goal.findMany),
  create: vi.mocked(prisma.reminderDispatch.create),
  deleteMany: vi.mocked(prisma.reminderDispatch.deleteMany),
  send: vi.mocked(sendEventEmail),
};

beforeEach(() => {
  vi.clearAllMocks();
  m.switch.mockResolvedValue(null); // kein AppSetting -> Default: aktiv
  m.goals.mockResolvedValue([goal()] as never);
  m.create.mockResolvedValue({} as never);
  m.deleteMany.mockResolvedValue({ count: 1 } as never);
  m.send.mockResolvedValue({ status: "SENT" } as never);
});

describe("dispatchWeeklyReminders", () => {
  it("haelt bei globalem Kill-Switch sofort an", async () => {
    m.switch.mockResolvedValue({ key: "remindersGloballyEnabled", value: "false" } as never);
    const r = await dispatchWeeklyReminders(JETZT);
    expect(r.grund).toContain("deaktiviert");
    expect(m.goals).not.toHaveBeenCalled();
    expect(m.send).not.toHaveBeenCalled();
  });

  it("versendet eine faellige WIG und reserviert vorher", async () => {
    const r = await dispatchWeeklyReminders(JETZT);
    expect(m.create).toHaveBeenCalledTimes(1);
    expect(m.send).toHaveBeenCalledTimes(1);
    expect(m.deleteMany).not.toHaveBeenCalled();
    expect(r).toMatchObject({ versendet: 1, uebersprungen: 0, fehlgeschlagen: 0 });
  });

  it("ueberspringt bei P2002 (diese Woche bereits bedient), ohne zu senden", async () => {
    m.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "6.9.0" }),
    );
    const r = await dispatchWeeklyReminders(JETZT);
    expect(m.send).not.toHaveBeenCalled();
    expect(r).toMatchObject({ versendet: 0, uebersprungen: 1, fehlgeschlagen: 0 });
  });

  it("gibt die Reservierung bei Versand-FAIL wieder frei (Retry moeglich)", async () => {
    m.send.mockResolvedValue({ status: "FAILED", detail: "SMTP weg" } as never);
    const r = await dispatchWeeklyReminders(JETZT);
    expect(m.deleteMany).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ versendet: 0, fehlgeschlagen: 1 });
  });

  it("ein einzelner DB-Fehler bricht den Lauf NICHT ab", async () => {
    m.goals.mockResolvedValue([
      goal({
        id: "g1",
        ownerId: "u1",
        owner: { email: "a@credo-gruppe.de", name: "A", emailRemindersEnabled: true },
      }),
      goal({
        id: "g2",
        ownerId: "u2",
        owner: { email: "b@credo-gruppe.de", name: "B", emailRemindersEnabled: true },
      }),
    ] as never);
    m.create.mockRejectedValueOnce(new Error("connection drop")); // erster Owner
    const r = await dispatchWeeklyReminders(JETZT);
    // zweiter Owner wird trotzdem versendet
    expect(r.fehlgeschlagen).toBe(1);
    expect(r.versendet).toBe(1);
    expect(m.send).toHaveBeenCalledTimes(1);
  });
});
