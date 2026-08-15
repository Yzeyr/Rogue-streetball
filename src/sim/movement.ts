import { formationTarget } from "./formation";
import type { BallState, CourtConfig, PlayerState } from "./types";

const MIN_SPEED = 3.0; // m/s, at 0 pace
const MAX_SPEED = 6.5; // m/s, at 100 pace

function paceToSpeed(pace: number): number {
  return MIN_SPEED + (pace / 100) * (MAX_SPEED - MIN_SPEED);
}

// Off-ball movement: every player seeks their formation slot at a speed set
// by pace. There's no on-ball decision-making yet — nobody kicks the ball,
// they just hold shape around it. That's the next layer.
export function movePlayers(
  players: PlayerState[],
  court: CourtConfig,
  ball: BallState,
  dt: number
): PlayerState[] {
  return players.map((player) => {
    const target = formationTarget(
      { role: player.role, xFraction: player.homeXFraction, yFraction: player.homeYFraction },
      player.team,
      court,
      ball
    );

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
  });
}
