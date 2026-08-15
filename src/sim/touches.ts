import { decideTouch } from "./decision";
import type { RngState } from "./rng";
import type { BallState, CourtConfig, PlayerState } from "./types";

// How close a player must be to touch a free ball.
const CONTROL_RADIUS = 0.6; // metres

// Ticks the ball stays "hot" after a touch before anyone (including the
// toucher) can touch it again — roughly 0.2s at 30 ticks/s. Without this,
// a dribble touch would re-trigger a fresh decision the very next tick.
const TOUCH_COOLDOWN_TICKS = 6;

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export interface TouchResult {
  ball: BallState;
  rngState: RngState;
}

// If the ball is free (cooldown elapsed), finds whoever's closest within
// control range and lets them act on it — any player on either team, so
// a misplaced pass is interceptable for free, with no separate defensive
// logic needed. Otherwise just counts the cooldown down.
export function applyTouches(
  ball: BallState,
  players: PlayerState[],
  court: CourtConfig,
  rngState: RngState
): TouchResult {
  if (ball.touchCooldown > 0) {
    return { ball: { ...ball, touchCooldown: ball.touchCooldown - 1 }, rngState };
  }

  let toucher: PlayerState | null = null;
  let closestDist = CONTROL_RADIUS;
  for (const player of players) {
    const dist = distance(player, ball);
    if (dist <= closestDist) {
      toucher = player;
      closestDist = dist;
    }
  }

  if (!toucher) {
    return { ball, rngState };
  }

  const teammates = players.filter((p) => p.team === toucher!.team && p.id !== toucher!.id);
  const { vx, vy, next } = decideTouch(toucher, teammates, court, rngState);

  return {
    ball: { ...ball, vx, vy, touchCooldown: TOUCH_COOLDOWN_TICKS },
    rngState: next,
  };
}
