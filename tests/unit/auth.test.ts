// ============================================================
// tests/unit/auth.test.ts
// Session-JWT (AP6): Roundtrip, Manipulation, fremdes Secret, Muell-Input
// + hashToken (Magic-Link-Hashing) deterministisch/kollisionfrei.
// ============================================================
import { SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { createSessionToken, type SessionPayload, verifySessionToken } from "@/lib/auth";
import { hashToken } from "@/lib/token-hash";

beforeAll(() => {
  // Muss vor dem ersten Token-Aufruf stehen (getJwtSecret laedt lazy + cached).
  process.env.JWT_SECRET = "test-secret-mindestens-32-zeichen-lang!!";
});

const payload: SessionPayload = {
  userId: "u1",
  email: "dimitri@test.de",
  name: "Dimitri",
  rolle: "ADMIN",
  rechtseinheitId: "r1",
};

describe("createSessionToken / verifySessionToken", () => {
  it("Roundtrip: der Payload kommt identisch zurueck", async () => {
    const token = await createSessionToken(payload);
    await expect(verifySessionToken(token)).resolves.toEqual(payload);
  });

  it("liefert null bei manipulierter Signatur", async () => {
    const token = await createSessionToken(payload);
    // Erstes Zeichen des Signaturteils kippen (alle 6 Bits signifikant).
    const [kopf, rumpf, signatur] = token.split(".") as [string, string, string];
    const gekippt = signatur[0] === "A" ? "B" : "A";
    const manipuliert = `${kopf}.${rumpf}.${gekippt}${signatur.slice(1)}`;
    await expect(verifySessionToken(manipuliert)).resolves.toBeNull();
  });

  it("liefert null bei Token mit fremdem Secret", async () => {
    const fremdesSecret = new TextEncoder().encode("ein-ganz-anderes-secret-mit-32-zeichen!!");
    const fremdesToken = await new SignJWT({ ...payload })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(fremdesSecret);
    await expect(verifySessionToken(fremdesToken)).resolves.toBeNull();
  });

  it("liefert null bei Muell-Input", async () => {
    await expect(verifySessionToken("abc")).resolves.toBeNull();
  });
});

describe("hashToken", () => {
  it("ist deterministisch und liefert 64 Hex-Zeichen", () => {
    const hash = hashToken("mein-token");
    expect(hash).toBe(hashToken("mein-token"));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("liefert fuer verschiedene Inputs verschiedene Hashes", () => {
    expect(hashToken("token-a")).not.toBe(hashToken("token-b"));
  });
});
