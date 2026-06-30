// ============================================================
// tests/unit/mailer.test.ts
// Sicherheitsrelevante reine Mailer-Logik: HTML-Escaping (XSS-Barriere),
// Betreff-CRLF-Bereinigung (Header-Injection) und Empfaenger-Allowlist.
// ============================================================
import { afterEach, describe, expect, it } from "vitest";
import { istErlaubteAdresse, mapSmtpError, renderEventEmail, renderTemplate, type ResolvedTemplate } from "../../src/lib/mailer";

const template = (over: Partial<ResolvedTemplate> = {}): ResolvedTemplate => ({
  subject: "Betreff {{name}}",
  bodyHtml: "<p>Hallo {{name}}</p>",
  bodyText: "Hallo {{name}}",
  recipientTo: "",
  recipientCc: "",
  recipientBcc: "",
  recipientReplyTo: "",
  isActive: true,
  source: "default",
  ...over,
});

describe("renderTemplate", () => {
  it("ersetzt {{key}} durch den Wert (mehrfach)", () => {
    expect(renderTemplate("{{a}}-{{a}}-{{b}}", { a: "1", b: "2" })).toBe("1-1-2");
  });

  it("escaped Werte im HTML-Modus (XSS-Barriere)", () => {
    const out = renderTemplate("<p>{{x}}</p>", { x: '<script>"&\'</script>' }, { escapeHtml: true });
    expect(out).toBe("<p>&lt;script&gt;&quot;&amp;&#39;&lt;/script&gt;</p>");
    expect(out).not.toContain("<script>");
  });

  it("escaped NICHT ohne Flag (Betreff/Text bleiben roh)", () => {
    expect(renderTemplate("{{x}}", { x: "a & b" })).toBe("a & b");
  });

  it("behandelt fehlende Werte als leeren String", () => {
    expect(renderTemplate("[{{fehlt}}]", {})).toBe("[{{fehlt}}]"); // unbekannter Key bleibt
    expect(renderTemplate("[{{x}}]", { x: "" })).toBe("[]");
  });
});

describe("renderEventEmail – Betreff-Haertung", () => {
  it("entfernt CRLF aus dem Betreff (Header-Injection-Schutz)", () => {
    const { rendered } = renderEventEmail(
      template({ subject: "Betreff {{name}}" }),
      "weekly-checkin-reminder",
      { email: "a@b.de", name: "Zeile1\r\nBcc: evil@x.com" },
    );
    expect(rendered).not.toBeNull();
    expect(rendered!.subject).toBe("Betreff Zeile1 Bcc: evil@x.com");
    expect(rendered!.subject).not.toMatch(/[\r\n]/);
  });

  it("escaped Variablen im HTML-Body, nicht aber im Text", () => {
    const { rendered } = renderEventEmail(
      template({ bodyHtml: "<p>{{name}}</p>", bodyText: "{{name}}" }),
      "weekly-checkin-reminder",
      { email: "a@b.de", name: "<b>x</b>" },
    );
    expect(rendered!.html).toContain("&lt;b&gt;x&lt;/b&gt;");
    expect(rendered!.text).toBe("<b>x</b>");
  });
});

describe("istErlaubteAdresse / Allowlist", () => {
  afterEach(() => {
    delete process.env.MAIL_ALLOWED_DOMAINS;
  });

  it("erlaubt alles, wenn keine Allowlist gesetzt ist", () => {
    expect(istErlaubteAdresse("irgendwer@example.org")).toBe(true);
  });

  it("beschraenkt auf konfigurierte Domains", () => {
    process.env.MAIL_ALLOWED_DOMAINS = "credo-gruppe.de, fes-minden.de";
    expect(istErlaubteAdresse("a@credo-gruppe.de")).toBe(true);
    expect(istErlaubteAdresse("a@fes-minden.de")).toBe(true);
    expect(istErlaubteAdresse("a@evil.com")).toBe(false);
  });

  it("verwirft overrideTo ausserhalb der Allowlist beim Test-Versand", () => {
    process.env.MAIL_ALLOWED_DOMAINS = "credo-gruppe.de";
    const { rendered, skipReason } = renderEventEmail(
      template(),
      "weekly-checkin-reminder",
      { email: "a@credo-gruppe.de", name: "X" },
      { overrideTo: "angreifer@evil.com" },
    );
    expect(rendered).toBeNull();
    expect(skipReason).toContain("nicht zugelassen");
  });
});

describe("mapSmtpError (kein Host/Auth-Leak)", () => {
  it("kategorisiert bekannte Fehler ohne Roh-Details", () => {
    expect(mapSmtpError({ code: "EAUTH", message: "535 5.7.8 user/pass mail.intern:587" })).toContain("Anmeldung");
    expect(mapSmtpError({ code: "ECONNREFUSED", message: "connect 10.0.0.5:587" })).toContain("Verbindung");
    expect(mapSmtpError({ code: "ETIMEDOUT", message: "x" })).toContain("Zeitueberschreitung");
    expect(mapSmtpError(new Error("Read timeout"))).toContain("Zeitueberschreitung");
  });

  it("faellt auf eine generische Meldung zurueck und leakt nie Host/Port", () => {
    const out = mapSmtpError(new Error("550 relay denied for mail.intern.example:25"));
    expect(out).toBe("SMTP-Versand fehlgeschlagen.");
    expect(out).not.toMatch(/intern|:25|550/);
  });
});

describe("renderEventEmail – Empfaenger-Felder (To/Cc/Bcc)", () => {
  afterEach(() => {
    delete process.env.MAIL_ALLOWED_DOMAINS;
  });

  it("filtert ungueltige + fremde Domains, dedupliziert, lowercased (CC)", () => {
    process.env.MAIL_ALLOWED_DOMAINS = "credo-gruppe.de";
    const { rendered } = renderEventEmail(
      template({ recipientTo: "a@credo-gruppe.de", recipientCc: "Chef@Credo-Gruppe.DE, chef@credo-gruppe.de, kaputt, extern@evil.com" }),
      "weekly-checkin-reminder",
      { email: "a@credo-gruppe.de", name: "X" },
    );
    expect(rendered).not.toBeNull();
    expect(rendered!.cc).toBe("chef@credo-gruppe.de"); // dedup + lowercase, evil/kaputt raus
  });

  it("skipReason wenn kein gueltiger Empfaenger uebrig bleibt", () => {
    process.env.MAIL_ALLOWED_DOMAINS = "credo-gruppe.de";
    const { rendered, skipReason } = renderEventEmail(
      template({ recipientTo: "extern@evil.com" }),
      "weekly-checkin-reminder",
      { email: "x", name: "X" },
    );
    expect(rendered).toBeNull();
    expect(skipReason).toBeTruthy();
  });
});
