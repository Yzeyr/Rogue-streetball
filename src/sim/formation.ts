import type { BallState, CourtConfig, PlayerRole, TeamId } from "./types";

export interface FormationSlot {
  role: PlayerRole;
  xFraction: number; // 0 = this team's own goal, 1 = the opponent's
  yFraction: number; // 0..1 across the pitch
}

// Generic in team size (see architecture rule: court/team size stay
// parameterised) — one keeper, remaining players split evenly into a back
// line and a forward line. At the settled team size of 5 this produces a
// 1-2-2 shape.
export function buildFormation(teamSize: number): FormationSlot[] {
  const slots: FormationSlot[] = [{ role: "keeper", xFraction: 0.08, yFraction: 0.5 }];

  const outfieldCount = teamSize - 1;
  const backCount = Math.ceil(outfieldCount / 2);
  const forwardCount = outfieldCount - backCount;

  for (let i = 0; i < backCount; i++) {
    slots.push({ role: "back", xFraction: 0.3, yFraction: (i + 1) / (backCount + 1) });
  }
  for (let i = 0; i < forwardCount; i++) {
    slots.push({ role: "forward", xFraction: 0.65, yFraction: (i + 1) / (forwardCount + 1) });
  }

  return slots;
}

// How far a role's slot shifts with the ball, relative to a back player.
// Keepers hold their line; forwards push up and press harder.
const SHIFT_MULTIPLIER: Record<PlayerRole, number> = {
  keeper: 0.3,
  back: 1,
  forward: 1.3,
};

const X_SHIFT_FRACTION = 0.18; // of court width, at multiplier 1
const Y_SHIFT_FRACTION = 0.15; // of court height, at multiplier 1
const EDGE_MARGIN = 0.6; // metres kept clear of the walls

// Where a player wants to be *right now* — their formation slot, elastically
// shifted toward the ball. This is the off-ball layer: cheap, deterministic,
// and the natural hook for a future Tactic to bias (see project vocab).
export function formationTarget(
  slot: FormationSlot,
  team: TeamId,
  court: CourtConfig,
  ball: BallState
): { x: number; y: number } {
  const baseX = team === "home" ? slot.xFraction * court.width : (1 - slot.xFraction) * court.width;
  const baseY = slot.yFraction * court.height;

  const shift = SHIFT_MULTIPLIER[slot.role];
  const ballOffsetX = (ball.x - court.width / 2) / (court.width / 2);
  const ballOffsetY = (ball.y - court.height / 2) / (court.height / 2);

  const x = baseX + ballOffsetX * court.width * X_SHIFT_FRACTION * shift;
  const y = baseY + ballOffsetY * court.height * Y_SHIFT_FRACTION * shift;

  return {
    x: clamp(x, EDGE_MARGIN, court.width - EDGE_MARGIN),
    y: clamp(y, EDGE_MARGIN, court.height - EDGE_MARGIN),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
