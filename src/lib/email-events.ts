// ============================================================
// src/lib/email-events.ts
// Event-Katalog des Cockpits — eine Definition pro versandfaehigem Ereignis.
// Aktuell: Wochen-Check-in-Erinnerung + Anmelde-Link (Magic Link, AP6);
// weitere kommen mit dem In-App-Notification-Center dazu.
// ============================================================

export interface EventVariable {
  key: string; // z.B. "{{name}}"
  description: string;
}

export interface EventDefinition {
  event: string; // technischer Name (== EmailTemplate.event)
  name: string; // Anzeige in der UI
  recipientHint: string; // wer fachlich Empfaenger ist
  defaultRecipientTo: string; // variablen-faehig, kommagetrennt
  variables: EventVariable[];
  samplePayload: Record<string, string | number>; // fuer den Test-Versand
}

export const EVENT_CATALOG: EventDefinition[] = [
  {
    event: "weekly-checkin-reminder",
    name: "Wochen-Check-in-Erinnerung",
    recipientHint: "Fuehrungskraft (Owner der WIG)",
    defaultRecipientTo: "{{email}}",
    variables: [
      { key: "{{name}}", description: "Name der Fuehrungskraft" },
      { key: "{{anzahl}}", description: "Anzahl WIGs ohne Check-in" },
      { key: "{{wigListe}}", description: "Titel der betroffenen WIGs (kommagetrennt)" },
      { key: "{{link}}", description: "Link zum Ziel-Cockpit" },
    ],
    samplePayload: {
      email: "test.fuehrungskraft@credo-gruppe.de",
      name: "Test Fuehrungskraft",
      anzahl: 2,
      wigListe: "Onboarding-Prozess verschlanken, Kita-Belegung optimieren",
      link: "http://localhost:3000/check-in",
    },
  },
  {
    event: "magic-link",
    name: "Anmelde-Link (Magic Link)",
    recipientHint: "Nutzer, der den Anmelde-Link angefordert hat",
    defaultRecipientTo: "{{email}}",
    variables: [
      { key: "{{name}}", description: "Name des Nutzers" },
      { key: "{{link}}", description: "Einmal-Anmelde-Link" },
      { key: "{{ttlMinuten}}", description: "Gueltigkeit des Links in Minuten" },
    ],
    samplePayload: {
      email: "test.fuehrungskraft@credo-gruppe.de",
      name: "Test Fuehrungskraft",
      link: "http://localhost:3000/api/auth/magic-link/beispiel-token",
      ttlMinuten: 15,
    },
  },
];

export function getEventDefinition(event: string): EventDefinition | undefined {
  return EVENT_CATALOG.find((e) => e.event === event);
}
