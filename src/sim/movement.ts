import { formationTarget } from "./formation";
import type { BallState, CourtConfig, PlayerState, TeamId } from "./types";

const MIN_SPEED = 3.0; // m/s, at 0 pace
const MAX_SPEED = 6.5; // m/s, at 100 pace

function paceToSpeed(pace: number): number {
  return MIN_SPEED + (pace / 100) * (MAX_SPEED - MIN_SPEED);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Whoever's dribbling (ball.carrierId) runs at the opponent's goal instead
// of holding their formation slot — otherwise the carry falls apart the
// instant they touch it, since decision.ts only nudges the ball a short
// way forward each touch and relies on the same player catching back up
// to it. Everyone else still just holds shape.
function carrierTarget(player: PlayerState, court: CourtConfig): { x: number; y: number } {
  const goalX = player.team === "home" ? court.width : 0;
  return { x: clamp(goalX, 0.6, court.width - 0.6), y: clamp(player.y, 0.6, court.height - 0.6) };
}

// A loose ball (no carrier, not mid-tackle-contest) used to still get
// collected because a frictionless ball never stopped moving — it would
// eventually sweep through someone's formation shift by chance. Real
// friction means it can now come to rest in open space, so each team's
// closest player has to actually break off and close it down, the same
// way carrierTarget breaks the dribbler off their slot.
function nearestTo(players: PlayerState[], point: { x: number; y: number }): PlayerState | null {
  let closest: PlayerState | null = null;
  let closestDist = Infinity;
  for (const player of players) {
    const dist = Math.hypot(player.x - point.x, player.y - point.y);
    if (dist < closestDist) {
      closest = player;
      closestDist = dist;
    }
  }
  return closest;
}

function loneBallTarget(court: CourtConfig, ball: BallState): { x: number; y: number } {
  return { x: clamp(ball.x, 0.6, court.width - 0.6), y: clamp(ball.y, 0.6, court.height - 0.6) };
}

function seekTarget(
  player: PlayerState,
  target: { x: number; y: number },
  dt: number
): PlayerState {
  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1e-6) return player;

  const speed = paceToSpeed(player.attributes.pace);
  const step = Math.min(speed * dt, distance);

  return {
    ...player,
    x: player.x + (dx / distance) * step,
    y: player.y + (dy / distance) * step,
  };
}

// Minimum distance kept between any two players — without this, two
// players (teammates or opponents) independently seeking targets that
// happen to coincide will happily stand on top of each other.
const MIN_SEPARATION = 0.75; // metres

function separationDirection(a: PlayerState, b: PlayerState): [number, number] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 1e-6) return [dx / dist, dy / dist];
  // Exact coincidence: pick a deterministic direction from the (stable) ids
  // rather than leaving it undefined — movement has no RNG stream of its own.
  return a.id < b.id ? [1, 0] : [-1, 0];
}

// One pass only resolves each pair against where the others were *before*
// that pass — with 10 players, a third player's correction can partly
// undo a pair that was just separated. A few relaxation iterations
// converge everyone much closer to MIN_SEPARATION; cheap at this player
// count (a few hundred pair checks per tick, worst case).
const SEPARATION_ITERATIONS = 4;

function applySeparation(players: PlayerState[], court: CourtConfig): PlayerState[] {
  const adjusted = players.map((p) => ({ ...p }));

  for (let iteration = 0; iteration < SEPARATION_ITERATIONS; iteration++) {
    for (let i = 0; i < adjusted.length; i++) {
      for (let j = i + 1; j < adjusted.length; j++) {
        const a = adjusted[i];
        const b = adjusted[j];
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        if (dist >= MIN_SEPARATION) continue;

        const [ux, uy] = separationDirection(a, b);
        const push = (MIN_SEPARATION - dist) / 2;
        a.x -= ux * push;
        a.y -= uy * push;
        b.x += ux * push;
        b.y += uy * push;
      }
    }
  }

  for (const player of adjusted) {
    player.x = clamp(player.x, 0, court.width);
    player.y = clamp(player.y, 0, court.height);
  }

  return adjusted;
}

// Off-ball movement: every player seeks their formation slot, elastically
// shifted toward the ball, at a speed set by pace — except the current
// dribbler, who instead drives at goal (see carrierTarget). A separation
// pass afterward keeps players from occupying the same point, since
// nothing about independently-computed targets guarantees they won't.
export function movePlayers(
  players: PlayerState[],
  court: CourtConfig,
  ball: BallState,
  dt: number
): PlayerState[] {
  const ballIsLoose = ball.carrierId === null && ball.touchCooldown <= 0;
  const chaserIds: Record<TeamId, string | null> = { home: null, away: null };
  if (ballIsLoose) {
    chaserIds.home = nearestTo(players.filter((p) => p.team === "home"), ball)?.id ?? null;
    chaserIds.away = nearestTo(players.filter((p) => p.team === "away"), ball)?.id ?? null;
  }

  const moved = players.map((player) => {
    const isChaser = player.id === chaserIds.home || player.id === chaserIds.away;
    const target =
      player.id === ball.carrierId
        ? carrierTarget(player, court)
        : isChaser
          ? loneBallTarget(court, ball)
          : formationTarget(
              { role: player.role, xFraction: player.homeXFraction, yFraction: player.homeYFraction },
              player.team,
              court,
              ball
            );

    return seekTarget(player, target, dt);
  });

  return applySeparation(moved, court);
}
