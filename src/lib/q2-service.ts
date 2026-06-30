// ============================================================
// src/lib/q2-service.ts
// DTO-Mapping fuer Q2-Schutz-Bloecke (entkoppelt Wire-Format vom Prisma-Modell).
// ============================================================
import type { Q2BlockDTO } from "@/lib/types";

export type BlockMitGoal = {
  id: string;
  titel: string;
  wochentag: number;
  startMinute: number;
  dauerMin: number;
  goalId: string | null;
  goal: { titel: string } | null;
};

export function toQ2BlockDTO(b: BlockMitGoal): Q2BlockDTO {
  return {
    id: b.id,
    titel: b.titel,
    wochentag: b.wochentag,
    startMinute: b.startMinute,
    dauerMin: b.dauerMin,
    goalId: b.goalId,
    goalTitel: b.goal?.titel ?? null,
  };
}
