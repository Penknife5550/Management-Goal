// ============================================================
// tests/unit/validation-mail.test.ts
// SMTP-Config-Validierung: Absender-Adresse + Reply-To muessen, wenn gesetzt,
// ein gueltiges E-Mail-Format haben (Tippfehler-Schutz).
// ============================================================
import { describe, expect, it } from "vitest";
import { smtpConfigSchema } from "../../src/lib/validation/mail";

const basis = {
  host: "mail.local",
  port: 587,
  secure: false,
  username: "u",
  password: "p",
  fromName: "Cockpit",
  isActive: false,
};

describe("smtpConfigSchema – E-Mail-Format", () => {
  it("akzeptiert gueltige Absender- und Reply-To-Adressen", () => {
    const r = smtpConfigSchema.safeParse({
      ...basis,
      fromEmail: "cockpit@credo-gruppe.de",
      replyToEmail: "antwort@credo-gruppe.de",
    });
    expect(r.success).toBe(true);
  });

  it("akzeptiert leere Felder (optional)", () => {
    const r = smtpConfigSchema.safeParse({ ...basis, fromEmail: "", replyToEmail: "" });
    expect(r.success).toBe(true);
  });

  it("lehnt eine ungueltige Absender-Adresse ab", () => {
    const r = smtpConfigSchema.safeParse({ ...basis, fromEmail: "info@credo", replyToEmail: "" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toContain("Absender-Adresse");
  });

  it("lehnt eine ungueltige Reply-To-Adresse ab", () => {
    const r = smtpConfigSchema.safeParse({ ...basis, fromEmail: "", replyToEmail: "kaputt" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toContain("Antwort-an-Adresse");
  });
});
