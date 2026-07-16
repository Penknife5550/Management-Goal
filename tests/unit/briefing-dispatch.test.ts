// ============================================================
// tests/unit/briefing-dispatch.test.ts
// dispatchMontagsBriefing (AP3): der doppelversand-sichere Versand-Pfad.
// Prisma + Mailer + Insight-Laden gemockt -> prueft Idempotenz (P2002),
// Reservierungs-Rollback bei FAILED und das Behalten bei SENT/SKIPPED.
// ============================================================
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks: via vi.hoisted, damit sie VOR den gehoisteten vi.mock-Factories
//     existieren (sonst "Cannot access before initialization").
const { prismaMock, sendRenderedEmailMock, ladeInsightsMock } = vi.hoisted(() => ({
  prismaMock: {
    appSetting: { findUnique: vi.fn() },
    user: { findMany: vi.fn() },
    reminderDispatch: { create: vi.fn(), deleteMany: vi.fn() },
  },
  sendRenderedEmailMock: vi.fn(),
  ladeInsightsMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/mailer", () => ({ sendRenderedEmail: sendRenderedEmailMock }));
vi.mock("@/lib/insight-data", () => ({ ladeInsightsFuerNutzer: ladeInsightsMock }));

import { dispatchMontagsBriefing } from "../../src/lib/briefing-service";

const EIN_NUTZER = [{ id: "u1", email: "chef@fes-minden.de", name: "Chef" }];

function p2002(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("unique", {
    code: "P2002",
    clientVersion: "test",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.appSetting.findUnique.mockResolvedValue(null); // Kill-Switch: Default aktiv
  prismaMock.user.findMany.mockResolvedValue(EIN_NUTZER);
  prismaMock.reminderDispatch.create.mockResolvedValue({});
  prismaMock.reminderDispatch.deleteMany.mockResolvedValue({});
  // Nutzer hat ein FOKUS-Ziel -> rendereBriefing (real) liefert eine Mail.
  ladeInsightsMock.mockResolvedValue({ insights: [], fokusAmpeln: ["GRUEN"] });
});

describe("dispatchMontagsBriefing", () => {
  it("global deaktiviert: sendet nichts", async () => {
    prismaMock.appSetting.findUnique.mockResolvedValue({ value: "false" });
    const r = await dispatchMontagsBriefing();
    expect(r.grund).toBeDefined();
    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
    expect(sendRenderedEmailMock).not.toHaveBeenCalled();
  });

  it("SENT: zaehlt versendet und behaelt die Reservierung", async () => {
    sendRenderedEmailMock.mockResolvedValue({ status: "SENT" });
    const r = await dispatchMontagsBriefing();
    expect(r).toMatchObject({ versendet: 1, uebersprungen: 0, fehlgeschlagen: 0, kandidaten: 1 });
    expect(prismaMock.reminderDispatch.deleteMany).not.toHaveBeenCalled();
  });

  it("zweiter Lauf (P2002): uebersprungen, kein Versand", async () => {
    prismaMock.reminderDispatch.create.mockRejectedValue(p2002());
    const r = await dispatchMontagsBriefing();
    expect(r).toMatchObject({ versendet: 0, uebersprungen: 1, fehlgeschlagen: 0 });
    expect(sendRenderedEmailMock).not.toHaveBeenCalled();
    expect(prismaMock.reminderDispatch.deleteMany).not.toHaveBeenCalled();
  });

  it("FAILED: gibt die Reservierung frei (Retry moeglich) und zaehlt fehlgeschlagen", async () => {
    sendRenderedEmailMock.mockResolvedValue({ status: "FAILED", detail: "SMTP weg" });
    const r = await dispatchMontagsBriefing();
    expect(r).toMatchObject({ versendet: 0, fehlgeschlagen: 1 });
    expect(prismaMock.reminderDispatch.deleteMany).toHaveBeenCalledTimes(1);
  });

  it("SKIPPED: behaelt die Reservierung (permanent) und zaehlt uebersprungen", async () => {
    sendRenderedEmailMock.mockResolvedValue({ status: "SKIPPED", detail: "nicht zugelassen" });
    const r = await dispatchMontagsBriefing();
    expect(r).toMatchObject({ versendet: 0, uebersprungen: 1, fehlgeschlagen: 0 });
    expect(prismaMock.reminderDispatch.deleteMany).not.toHaveBeenCalled();
  });

  it("kein Fokus mehr (Race): gibt Reservierung frei und ueberspringt", async () => {
    ladeInsightsMock.mockResolvedValue({ insights: [], fokusAmpeln: [] });
    const r = await dispatchMontagsBriefing();
    expect(r).toMatchObject({ versendet: 0, uebersprungen: 1 });
    expect(sendRenderedEmailMock).not.toHaveBeenCalled();
    expect(prismaMock.reminderDispatch.deleteMany).toHaveBeenCalledTimes(1);
  });
});
