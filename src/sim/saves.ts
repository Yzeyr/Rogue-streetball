import { resolveTouch, type TouchResult } from "./touches";
import { nextRange, type RngState } from "./rng";
import type { BallState, CourtConfig, PlayerState, TeamId } from "./types";

// How close the keeper must be to the ball to attempt a save. Larger than
// the general tackle radius — this represents reach/reaction, not just
// standing on the ball.
const SAVE_RADIUS = 2.2; // metres

// Save chance at 50 Goalkeeping, point-blank (distance 0). Runs every
// tick the ball's in range and heading at this keeper's own goal, so a
// close, straight-on shot gets several chances as it closes the distance,
// not just one roll.
const SAVE_BASE_CHANCE = 0.18;
const SAVE_SKILL_SCALE = 0.004; // per point of Goalkeeping above/below 50
const SAVE_DISTANCE_PENALTY = 0.08; // chance lost per metre of keeper-to-ball distance

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Checks whether the ball is flying at a team's own goal with their keeper
// in reach, and if so rolls a Goalkeeping-weighted save attempt. A save is
// just the keeper taking control like any other touch — they immediately
// look to distribute via the same decideTouch every other touch uses,
// which naturally reads as "catches it and throws it out" since a shot
// from right in front of their own goal scores near-zero on the shoot
// option. No special-casing needed. A failed attempt costs nothing extra;
// the shot's flight (and any subsequent touch/tackle contest) proceeds
// as normal that same tick.
export function attemptSave(
  ball: BallState,
  players: PlayerState[],
  court: CourtConfig,
  rngState: RngState
): TouchResult {
  const teams: TeamId[] = ["home", "away"];

  for (const team of teams) {
    const headingTowardOwnGoal = team === "home" ? ball.vx < 0 : ball.vx > 0;
    if (!headingTowardOwnGoal) continue;

    const keeper = players.find((p) => p.team === team && p.role === "keeper");
    if (!keeper) continue;

    const dist = distance(keeper, ball);
    if (dist > SAVE_RADIUS) continue;

    const [roll, next] = nextRange(rngState, 0, 1);
    const chance = clamp(
      SAVE_BASE_CHANCE +
        (keeper.attributes.goalkeeping - 50) * SAVE_SKILL_SCALE -
        dist * SAVE_DISTANCE_PENALTY,
      0.02,
      0.75
    );

    if (roll < chance) {
      return resolveTouch(keeper, players, ball, court, next);
    }
    return { ball, rngState: next };
  }

  return { ball, rngState };
}
