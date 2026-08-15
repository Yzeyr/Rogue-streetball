import { decideTouch } from "./decision";
import { nextRange, type RngState } from "./rng";
import type { BallState, CourtConfig, PlayerState } from "./types";

// How close a player must be to touch a fully free ball.
const CONTROL_RADIUS = 0.6; // metres

// How close an opponent must be to challenge a held ball.
const TACKLE_RADIUS = 1.1; // metres

// Ticks the ball stays "hot" after a touch before it's fully free again —
// roughly 0.2s at 30 ticks/s. Without this, a dribble touch would
// re-trigger a fresh decision the very next tick.
const TOUCH_COOLDOWN_TICKS = 6;

// Per-tick chance a challenger wins the ball off the carrier, at equal
// Tackling, plus a swing per point of difference. A challenge is
// attempted every tick they're both in range, so sustained pressure adds
// up over the possession window rather than being a single roll.
const TACKLE_BASE_CHANCE = 0.06;
const TACKLE_SKILL_SCALE = 0.002;

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function closestTo(point: { x: number; y: number }, candidates: PlayerState[]): PlayerState | null {
  let closest: PlayerState | null = null;
  let closestDist = Infinity;
  for (const candidate of candidates) {
    const dist = distance(point, candidate);
    if (dist < closestDist) {
      closest = candidate;
      closestDist = dist;
    }
  }
  return closest;
}

export interface TouchResult {
  ball: BallState;
  rngState: RngState;
}

// A player takes control of the ball: shoot/pass/dribble via decideTouch,
// then mark the ball as newly held by their team.
function resolveTouch(
  toucher: PlayerState,
  players: PlayerState[],
  ball: BallState,
  court: CourtConfig,
  rngState: RngState
): TouchResult {
  const teammates = players.filter((p) => p.team === toucher.team && p.id !== toucher.id);
  const { vx, vy, next } = decideTouch(toucher, teammates, court, rngState);
  return {
    ball: { ...ball, vx, vy, touchCooldown: TOUCH_COOLDOWN_TICKS, possessionTeam: toucher.team },
    rngState: next,
  };
}

function tickCooldown(ball: BallState, rngState: RngState): TouchResult {
  return { ball: { ...ball, touchCooldown: ball.touchCooldown - 1 }, rngState };
}

// Ball is currently held (touchCooldown > 0): the nearest opponent within
// tackle range gets a chance to win it off the nearest player on the
// possessing team. A won tackle is resolved exactly like a fresh touch —
// the challenger now decides what to do with it. A failed attempt just
// costs the try; there's no foul roll here yet (fouls are a separate,
// still-unbuilt system — see project decision log).
function resolvePossession(
  ball: BallState,
  players: PlayerState[],
  court: CourtConfig,
  rngState: RngState
): TouchResult {
  if (!ball.possessionTeam) {
    return tickCooldown(ball, rngState);
  }

  const carrier = closestTo(
    ball,
    players.filter((p) => p.team === ball.possessionTeam)
  );
  const challenger = closestTo(
    ball,
    players.filter((p) => p.team !== ball.possessionTeam && distance(ball, p) <= TACKLE_RADIUS)
  );

  if (!carrier || !challenger) {
    return tickCooldown(ball, rngState);
  }

  const [roll, next] = nextRange(rngState, 0, 1);
  const chance = clamp(
    TACKLE_BASE_CHANCE +
      (challenger.attributes.tackling - carrier.attributes.tackling) * TACKLE_SKILL_SCALE,
    0.01,
    0.35
  );

  if (roll < chance) {
    return resolveTouch(challenger, players, ball, court, next);
  }
  return tickCooldown(ball, next);
}

// Ball is fully free (cooldown elapsed): whoever's closest within control
// range takes it, any player on either team — so an intercepted pass or
// loose rebound needs no separate logic beyond this.
function resolveFreeBall(
  ball: BallState,
  players: PlayerState[],
  court: CourtConfig,
  rngState: RngState
): TouchResult {
  const toucher = closestTo(
    ball,
    players.filter((p) => distance(ball, p) <= CONTROL_RADIUS)
  );
  if (!toucher) {
    return { ball, rngState };
  }
  return resolveTouch(toucher, players, ball, court, rngState);
}

export function applyTouches(
  ball: BallState,
  players: PlayerState[],
  court: CourtConfig,
  rngState: RngState
): TouchResult {
  return ball.touchCooldown > 0
    ? resolvePossession(ball, players, court, rngState)
    : resolveFreeBall(ball, players, court, rngState);
}
