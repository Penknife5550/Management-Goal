// ============================================================
// src/lib/types.ts
// Client-seitige DTOs (JSON-serialisiert: Datumsfelder als ISO-String).
// Entkoppelt die UI vom Prisma-Modell.
// ============================================================
import type { TaskStatus } from "./eisenhower";
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
  lastCheckinAt: string | null;
  leadMeasures: LeadMeasureDTO[];
  createdAt: string;
}

export interface SubtaskDTO {
  id: string;
  titel: string;
  erledigt: boolean;
  position: number;
}

export interface TaskDTO {
  id: string;
  titel: string;
  beschreibung: string | null;
  status: TaskStatus;
  position: number;
  important: boolean;
  urgent: boolean;
  quadrant: number; // 1..4, abgeleitet aus important/urgent
  dueDate: string | null;
  zeitGeplantMin: number | null;
  zeitIstMin: number | null;
  goalId: string | null;
  goalTitel: string | null;
  subtasks: SubtaskDTO[];
  // KI-Eisenhower (Phase 2, Schritt 5): gestageter Vorschlag, Accept/Reject.
  aiQuadrantSuggestion: number | null;
  aiConfidence: number | null;
  aiReasoning: string | null;
  kiVorschlagOffen: boolean;
  createdAt: string;
}

export interface Q2BlockDTO {
  id: string;
  titel: string;
  wochentag: number; // ISO 1=Mo … 7=So
  startMinute: number; // Minuten ab Mitternacht
  dauerMin: number;
  goalId: string | null;
  goalTitel: string | null;
}

// Gebuendelte Aktions-Callbacks (vermeidet Prop-Drilling-Wildwuchs).
export interface ZielAktionen {
  onFortschritt: (id: string, fortschritt: number) => void;
  onAmpel: (id: string, ampel: Ampel) => void;
  onErreicht: (id: string) => void;
  onZurueck: (id: string) => void;
  onArchiv: (id: string) => void;
  onLeadAnlegen: (zielId: string, beschreibung: string, zielwert: number) => Promise<void> | void;
  onLeadIstwert: (zielId: string, leadId: string, istwert: number) => void;
  onLeadLoeschen: (zielId: string, leadId: string) => void;
}
