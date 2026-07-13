// ============================================================
// tests/unit/ai-eisenhower-api.test.ts
// KI-Eisenhower-Routen mit gemocktem Prisma/Auth:
// - Callback: Secret-Guard, Idempotenz (P2002 = No-op), schreibt NUR ai*-Felder
//   und NIE important/urgent, leitet den Quadranten korrekt ab.
// - accept: setzt important/urgent passend zum Vorschlag + raeumt ai*-Felder ab.
// ============================================================
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    webhookIdempotency: { create: vi.fn(), delete: vi.fn() },
    task: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  },
}));
vi.mock("@/lib/auth", () => ({
  getAktuellerNutzer: () => ({ id: "u1", rechtseinheitId: "r1" }),
}));

import { POST as callback } from "@/app/api/ai/callback/route";
import { POST as accept } from "@/app/api/tasks/[id]/ai-suggestion/accept/route";
import { prisma } from "@/lib/db";

const m = {
  idemCreate: vi.mocked(prisma.webhookIdempotency.create),
  idemDelete: vi.mocked(prisma.webhookIdempotency.delete),
  findUnique: vi.mocked(prisma.task.findUnique),
  findFirst: vi.mocked(prisma.task.findFirst),
  update: vi.mocked(prisma.task.update),
};

const task = (over: Record<string, unknown> = {}) => ({
  id: "t1",
  ownerId: "u1",
  goalId: null,
  titel: "Aufgabe",
  beschreibung: null,
  status: "TODO",
  position: 0,
  important: false,
  urgent: false,
  dueDate: null,
  zeitGeplantMin: null,
  zeitIstMin: null,
  aiQuadrantSuggestion: null,
  aiConfidence: null,
  aiReasoning: null,
  lastModifiedBy: "USER",
  createdAt: new Date("2026-07-01T00:00:00Z"),
  updatedAt: new Date("2026-07-01T00:00:00Z"),
  goal: null,
  subtasks: [],
  ...over,
});

function callbackReq(body: unknown, secret = "geheim") {
  return new Request("http://localhost/api/ai/callback", {
    method: "POST",
    headers: { "content-type": "application/json", "x-ai-callback-secret": secret },
    body: JSON.stringify(body),
  }) as never;
}

const gueltigerBody = {
  jobKey: "abc",
  taskId: "t1",
  important: true,
  urgent: false, // -> Quadrant 2
  confidence: 0.8,
  reasoning: "Strategisch wichtig.",
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.AI_CALLBACK_SECRET = "geheim";
  m.idemCreate.mockResolvedValue({} as never);
  m.idemDelete.mockResolvedValue({} as never);
  m.findUnique.mockResolvedValue(task() as never);
  m.update.mockResolvedValue(task() as never);
});

describe("POST /api/ai/callback", () => {
  it("weist ein falsches Secret ab (403)", async () => {
    const res = await callback(callbackReq(gueltigerBody, "falsch"));
    expect(res.status).toBe(403);
    expect(m.idemCreate).not.toHaveBeenCalled();
  });

  it("schreibt NUR die ai*-Felder + AI_OLLAMA, NIE important/urgent", async () => {
    const res = await callback(callbackReq(gueltigerBody));
    expect(res.status).toBe(200);
    expect(m.update).toHaveBeenCalledTimes(1);
    const data = m.update.mock.calls[0]![0].data as Record<string, unknown>;
    expect(data).toMatchObject({
      aiQuadrantSuggestion: 2,
      aiConfidence: 0.8,
      lastModifiedBy: "AI_OLLAMA",
    });
    expect(data).not.toHaveProperty("important");
    expect(data).not.toHaveProperty("urgent");
  });

  it("ist idempotent: zweiter Callback mit gleichem jobKey (P2002) = No-op", async () => {
    m.idemCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "6.9.0" }),
    );
    const res = await callback(callbackReq(gueltigerBody));
    expect(res.status).toBe(200);
    expect(m.update).not.toHaveBeenCalled();
  });

  it("weist Unsinn-Antwort ab (400) und reserviert nicht", async () => {
    const res = await callback(callbackReq({ ...gueltigerBody, confidence: 5 }));
    expect(res.status).toBe(400);
    expect(m.idemCreate).not.toHaveBeenCalled();
  });

  it("gibt die Reservierung frei, wenn die Aufgabe fehlt (404)", async () => {
    m.findUnique.mockResolvedValue(null as never);
    const res = await callback(callbackReq(gueltigerBody));
    expect(res.status).toBe(404);
    expect(m.idemDelete).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/tasks/:id/ai-suggestion/accept", () => {
  const ctx = { params: Promise.resolve({ id: "t1" }) };

  it("uebernimmt den Vorschlag: important/urgent gemaess Quadrant, ai* geraeumt, USER", async () => {
    m.findFirst.mockResolvedValue(task({ aiQuadrantSuggestion: 2, aiConfidence: 0.8, aiReasoning: "x" }) as never);
    m.update.mockResolvedValue(task({ important: true, urgent: false }) as never);

    const res = await accept({} as never, ctx);
    expect(res.status).toBe(200);
    const data = m.update.mock.calls[0]![0].data as Record<string, unknown>;
    expect(data).toMatchObject({
      important: true, // Quadrant 2 = wichtig, nicht dringend
      urgent: false,
      lastModifiedBy: "USER",
      aiQuadrantSuggestion: null,
      aiConfidence: null,
      aiReasoning: null,
    });
  });

  it("lehnt ab, wenn kein Vorschlag vorhanden ist (400)", async () => {
    m.findFirst.mockResolvedValue(task({ aiQuadrantSuggestion: null }) as never);
    const res = await accept({} as never, ctx);
    expect(res.status).toBe(400);
    expect(m.update).not.toHaveBeenCalled();
  });
});
