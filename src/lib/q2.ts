// ============================================================
// src/lib/q2.ts
// Q2-Schutz: reine Helfer fuer Zeitumrechnung und ICS-Export (woechentlich
// wiederkehrende Bloecke). Keine DB — gut testbar.
// ============================================================

export interface Wochentag {
  wert: number; // ISO 1=Mo … 7=So
  kurz: string;
  lang: string;
  byday: string; // ICS BYDAY-Code
}

export const WOCHENTAGE: Wochentag[] = [
  { wert: 1, kurz: "Mo", lang: "Montag", byday: "MO" },
  { wert: 2, kurz: "Di", lang: "Dienstag", byday: "TU" },
  { wert: 3, kurz: "Mi", lang: "Mittwoch", byday: "WE" },
  { wert: 4, kurz: "Do", lang: "Donnerstag", byday: "TH" },
  { wert: 5, kurz: "Fr", lang: "Freitag", byday: "FR" },
  { wert: 6, kurz: "Sa", lang: "Samstag", byday: "SA" },
  { wert: 7, kurz: "So", lang: "Sonntag", byday: "SU" },
];

const pad = (n: number) => String(n).padStart(2, "0");

// Minuten ab Mitternacht <-> "HH:MM"
export function minutenZuHHMM(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

export function hhmmZuMinuten(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((x) => Number.parseInt(x, 10));
  return (h ?? 0) * 60 + (m ?? 0);
}

// Datum des naechsten Vorkommens eines Wochentags (heute zaehlt nur, wenn die
// Startzeit noch nicht vorbei ist). Lokale Kalendertage.
export function naechstesDatum(
  wochentag: number,
  startMinute: number,
  jetzt: Date,
): { y: number; m: number; d: number } {
  const heuteISO = ((jetzt.getDay() + 6) % 7) + 1; // getDay 0=So → ISO
  let diff = (wochentag - heuteISO + 7) % 7;
  const jetztMin = jetzt.getHours() * 60 + jetzt.getMinutes();
  if (diff === 0 && startMinute <= jetztMin) diff = 7;
  const ziel = new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate() + diff);
  return { y: ziel.getFullYear(), m: ziel.getMonth() + 1, d: ziel.getDate() };
}

// Sonderzeichen nach RFC 5545 escapen.
function escapeICS(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

const fmtFloating = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

const fmtUTC = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

export interface Q2BlockICS {
  id: string;
  titel: string;
  wochentag: number;
  startMinute: number;
  dauerMin: number;
  goalTitel?: string | null;
}

// Baut einen kompletten ICS-Kalender (woechentliche Wiederholung je Block).
// Floating local time (kein TZID) — fuer eine einheitliche Zeitzone (Europe/Berlin) ausreichend.
export function baueICS(bloecke: Q2BlockICS[], jetzt: Date): string {
  const byday = (w: number) => WOCHENTAGE.find((t) => t.wert === w)?.byday ?? "MO";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CREDO Fuehrungs-Cockpit//Q2-Schutz//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  const stamp = fmtUTC(jetzt);
  for (const b of bloecke) {
    const { y, m, d } = naechstesDatum(b.wochentag, b.startMinute, jetzt);
    const start = new Date(y, m - 1, d, Math.floor(b.startMinute / 60), b.startMinute % 60);
    const end = new Date(start.getTime() + b.dauerMin * 60_000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:q2-${b.id}@credo-cockpit`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${fmtFloating(start)}`,
      `DTEND:${fmtFloating(end)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${byday(b.wochentag)}`,
      `SUMMARY:${escapeICS(`Q2: ${b.titel}`)}`,
    );
    if (b.goalTitel) lines.push(`DESCRIPTION:${escapeICS(`WIG: ${b.goalTitel}`)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
