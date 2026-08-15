import type { CourtConfig } from "./types";

export const DEFAULT_COURT: CourtConfig = {
  width: 20,
  height: 12,
  goalWidth: 3,
  wallRestitution: 0.8,
};

export function goalYRange(court: CourtConfig): { min: number; max: number } {
  const half = court.goalWidth / 2;
  const centre = court.height / 2;
  return { min: centre - half, max: centre + half };
}
