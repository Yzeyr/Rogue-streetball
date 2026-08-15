import { nextRange, type RngState } from "./rng";
import type { CourtConfig, PlayerState, TeamId } from "./types";

const SHOOT_SPEED = 15; // m/s
const PASS_SPEED = 9; // m/s
const DRIBBLE_SPEED = 5.5; // m/s
const DRIBBLE_PUSH = 2.5; // metres — a short shove forward, not a kick upfield

// Soft falloff distances, not hard cutoffs — the ball is shootable from
// anywhere (section 4 rule), these just make closer options score higher.
const SHOOT_RANGE = 10; // metres
const MAX_PASS_RANGE = 14; // metres

interface Vector {
  x: number;
  y: number;
}

function opponentGoal(team: TeamId, court: CourtConfig): Vector {
  return team === "home"
    ? { x: court.width, y: court.height / 2 }
    : { x: 0, y: court.height / 2 };
}

function distance(a: Vector, b: Vector): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function velocityToward(from: Vector, to: Vector, speed: number): { vx: number; vy: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy) || 1;
  return { vx: (dx / dist) * speed, vy: (dy / dist) * speed };
}

export type TouchAction = "shoot" | "pass" | "dribble";

export interface TouchDecision {
  vx: number;
  vy: number;
  action: TouchAction;
  next: RngState;
}

// A player in control of a free ball decides what to do with it: shoot,
// pass to a teammate, or dribble it forward. The ball is close enough
// (within control radius, see touches.ts) that the player's own position
// stands in for the kick's origin. Each option gets a utility score from
// attributes and situation, plus RNG noise scaled inversely by Positioning
// (a player who "reads the game" better picks the objectively best option
// more consistently). Pure — all randomness threads through rngState, per
// the seeded-determinism rule.
export function decideTouch(
  player: PlayerState,
  teammates: PlayerState[],
  court: CourtConfig,
  rngState: RngState
): TouchDecision {
  let s = rngState;
  const noiseScale = 0.15 * (1 - player.attributes.positioning / 100);
  const drawNoise = (): number => {
    const [value, next] = nextRange(s, -noiseScale, noiseScale);
    s = next;
    return value;
  };

  const goal = opponentGoal(player.team, court);
  const distToGoal = distance(player, goal);
  const shootScore =
    (player.attributes.shooting / 100) * (SHOOT_RANGE / (SHOOT_RANGE + distToGoal)) + drawNoise();

  let bestPass: { mate: PlayerState; score: number } | null = null;
  for (const mate of teammates) {
    const forwardDelta = player.team === "home" ? mate.x - player.x : player.x - mate.x;
    const progress = clamp(0.5 + forwardDelta / court.width, 0, 1);
    const range = clamp(1 - distance(player, mate) / MAX_PASS_RANGE, 0.15, 1);
    const score = (player.attributes.passing / 100) * progress * range + drawNoise();
    if (!bestPass || score > bestPass.score) {
      bestPass = { mate, score };
    }
  }

  const dribbleScore = 0.3 + (player.attributes.pace / 100) * 0.2 + drawNoise();

  const [aimJitter, s2] = nextRange(s, -1, 1);
  s = s2;

  if (shootScore >= (bestPass?.score ?? -Infinity) && shootScore >= dribbleScore) {
    const spread = (1 - player.attributes.shooting / 100) * 1.5; // metres of aim error
    const aimY = clamp(goal.y + aimJitter * spread, 0, court.height);
    return { ...velocityToward(player, { x: goal.x, y: aimY }, SHOOT_SPEED), action: "shoot", next: s };
  }

  if (bestPass && bestPass.score >= dribbleScore) {
    const spread = (1 - player.attributes.passing / 100) * 1.0;
    const target = { x: bestPass.mate.x + aimJitter * spread, y: bestPass.mate.y + aimJitter * spread };
    return { ...velocityToward(player, target, PASS_SPEED), action: "pass", next: s };
  }

  // A short shove toward goal, not a kick to the far end — dribbling is a
  // carry, not a repeated long pass to nobody. movement.ts is what makes
  // this actually read as carrying: it lets whoever's dribbling (ball.
  // carrierId) run toward goal instead of snapping back to their formation
  // slot, so the same player keeps catching back up to the ball they just
  // pushed instead of abandoning it.
  const pushX = player.team === "home" ? player.x + DRIBBLE_PUSH : player.x - DRIBBLE_PUSH;
  const dribbleTarget = {
    x: clamp(pushX, 0, court.width),
    y: clamp(player.y + aimJitter * 1.5, 0, court.height),
  };
  return { ...velocityToward(player, dribbleTarget, DRIBBLE_SPEED), action: "dribble", next: s };
}
