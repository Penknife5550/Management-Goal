// ============================================================
// src/lib/email-events.ts
// Event-Katalog des Cockpits — eine Definition pro versandfaehigem Ereignis.
// Aktuell genau ein Event (Wochen-Check-in-Erinnerung); weitere kommen mit
// dem In-App-Notification-Center und den naechsten Phase-2-Bausteinen dazu.
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
      link: "http://localhost:3000/ziele",
    },
  },
];

export function getEventDefinition(event: string): EventDefinition | undefined {
  return EVENT_CATALOG.find((e) => e.event === event);
}
