import { goalYRange } from "../sim/court";
import type { MatchState } from "../sim/types";

// Metres-to-pixels scale, chosen so the render layer never touches sim
// units directly.
const PX_PER_METRE = 32;

export function resizeCanvasToCourt(
  canvas: HTMLCanvasElement,
  state: MatchState
): void {
  canvas.width = state.config.court.width * PX_PER_METRE;
  canvas.height = state.config.court.height * PX_PER_METRE;
}

export function render(ctx: CanvasRenderingContext2D, state: MatchState): void {
  const { court } = state.config;
  const w = court.width * PX_PER_METRE;
  const h = court.height * PX_PER_METRE;

  ctx.fillStyle = "#1c3d2e";
  ctx.fillRect(0, 0, w, h);

  drawWalls(ctx, state);
  drawPlayers(ctx, state);
  drawBall(ctx, state);
}

function drawWalls(ctx: CanvasRenderingContext2D, state: MatchState): void {
  const { court } = state.config;
  const w = court.width * PX_PER_METRE;
  const h = court.height * PX_PER_METRE;
  const { min: goalMin, max: goalMax } = goalYRange(court);
  const goalMinPx = goalMin * PX_PER_METRE;
  const goalMaxPx = goalMax * PX_PER_METRE;

  ctx.strokeStyle = "#e8e8e8";
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, 0);
  ctx.moveTo(0, h);
  ctx.lineTo(w, h);
  ctx.moveTo(0, 0);
  ctx.lineTo(0, goalMinPx);
  ctx.moveTo(0, goalMaxPx);
  ctx.lineTo(0, h);
  ctx.moveTo(w, 0);
  ctx.lineTo(w, goalMinPx);
  ctx.moveTo(w, goalMaxPx);
  ctx.lineTo(w, h);
  ctx.stroke();

  ctx.strokeStyle = "#f4d35e";
  ctx.beginPath();
  ctx.moveTo(0, goalMinPx);
  ctx.lineTo(0, goalMaxPx);
  ctx.moveTo(w, goalMinPx);
  ctx.lineTo(w, goalMaxPx);
  ctx.stroke();
}

function drawPlayers(ctx: CanvasRenderingContext2D, state: MatchState): void {
  for (const player of state.players) {
    ctx.beginPath();
    ctx.fillStyle = player.team === "home" ? "#4fa8ff" : "#ff6b6b";
    ctx.arc(player.x * PX_PER_METRE, player.y * PX_PER_METRE, 10, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBall(ctx: CanvasRenderingContext2D, state: MatchState): void {
  const { ball } = state;
  ctx.beginPath();
  ctx.fillStyle = "#ffffff";
  ctx.arc(ball.x * PX_PER_METRE, ball.y * PX_PER_METRE, ball.radius * PX_PER_METRE, 0, Math.PI * 2);
  ctx.fill();
}
