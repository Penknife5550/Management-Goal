// ============================================================
// src/lib/types.ts
// Client-seitige DTOs (JSON-serialisiert: Datumsfelder als ISO-String).
// Entkoppelt die UI vom Prisma-Modell.
// ============================================================
import type { Ampel, GoalStatus } from "./goals";

export interface LeadMeasureDTO {
  id: string;
  beschreibung: string;
  zielwert: number;
  istwert: number;
}

export interface ZielDTO {
  id: string;
  titel: string;
  outcome: string | null;
  status: GoalStatus;
  ampel: Ampel;
  fortschritt: number;
  dueDate: string | null;
  abhaengig: boolean;
  leadMeasures: LeadMeasureDTO[];
  createdAt: string;
}

// Gebuendelte Aktions-Callbacks (vermeidet Prop-Drilling-Wildwuchs).
export interface ZielAktionen {
  onFortschritt: (id: string, fortschritt: number) => void;
  onAmpel: (id: string, ampel: Ampel) => void;
  onErreicht: (id: string) => void;
  onZurueck: (id: string) => void;
  onArchiv: (id: string) => void;
  onLeadAnlegen: (zielId: string, beschreibung: string, zielwert: number) => void;
  onLeadIstwert: (zielId: string, leadId: string, istwert: number) => void;
  onLeadLoeschen: (zielId: string, leadId: string) => void;
}
