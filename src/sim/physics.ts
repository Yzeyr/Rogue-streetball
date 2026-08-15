import { goalYRange } from "./court";
import type { BallState, CourtConfig, TeamId } from "./types";

export interface BallStepResult {
  ball: BallState;
  scoredBy: TeamId | null; // team that scored, if the ball crossed a goal line this step
}

// Wall collision is first-class ball physics, not an out-of-bounds edge
// case: the ball rebounds off every wall except where a goal opening lets
// it through.
export function stepBall(
  ball: BallState,
  court: CourtConfig,
  dt: number
): BallStepResult {
  let { x, y, vx, vy } = ball;
  const { radius } = ball;

  x += vx * dt;
  y += vy * dt;

  const { min: goalMin, max: goalMax } = goalYRange(court);
  const inGoalMouth = y >= goalMin && y <= goalMax;

  let scoredBy: TeamId | null = null;

  // Left wall (x = 0): home's goal. Away scores by putting it through.
  if (x - radius <= 0) {
    if (inGoalMouth) {
      scoredBy = "away";
    } else {
      x = radius;
      vx = -vx * court.wallRestitution;
    }
  }

  // Right wall (x = width): away's goal. Home scores by putting it through.
  if (x + radius >= court.width) {
    if (inGoalMouth) {
      scoredBy = "home";
    } else {
      x = court.width - radius;
      vx = -vx * court.wallRestitution;
    }
  }

  if (y - radius <= 0) {
    y = radius;
    vy = -vy * court.wallRestitution;
  }
  if (y + radius >= court.height) {
    y = court.height - radius;
    vy = -vy * court.wallRestitution;
  }

  return { ball: { x, y, vx, vy, radius }, scoredBy };
}
