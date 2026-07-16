// ============================================================
// tests/unit/audit.test.ts
// Audit-Writer (AP6) mit gemocktem Prisma: korrekte Felder + Defaults,
// und die "wirft nie"-Garantie (DB-Fehler brechen den Hauptfluss nicht).
// ============================================================
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: { auditLog: { create: vi.fn() } },
}));

import { schreibeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";

const create = vi.mocked(prisma.auditLog.create);

beforeEach(() => {
  vi.clearAllMocks();
  create.mockResolvedValue({} as never);
});

describe("schreibeAudit", () => {
  it("schreibt den Eintrag mit korrekten Feldern", async () => {
    await schreibeAudit({
      aktion: "LOGIN_ERFOLG",
      userId: "u1",
      details: { grund: "test" },
      ipAddress: "192.0.2.1",
    });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      data: {
        aktion: "LOGIN_ERFOLG",
        userId: "u1",
        details: { grund: "test" },
        ipAddress: "192.0.2.1",
      },
    });
  });

  it("fuellt optionale Felder mit den Defaults (null/undefined)", async () => {
    await schreibeAudit({ aktion: "LOGOUT" });
    expect(create).toHaveBeenCalledWith({
      data: { aktion: "LOGOUT", userId: null, details: undefined, ipAddress: null },
    });
  });

  it("wirft nie: DB-Fehler wird abgefangen und via console.error geloggt", async () => {
    const fehlerLog = vi.spyOn(console, "error").mockImplementation(() => {});
    create.mockRejectedValue(new Error("DB weg"));

    await expect(schreibeAudit({ aktion: "LOGIN_FEHLGESCHLAGEN" })).resolves.toBeUndefined();
    expect(fehlerLog).toHaveBeenCalled();

    fehlerLog.mockRestore();
  });
});
