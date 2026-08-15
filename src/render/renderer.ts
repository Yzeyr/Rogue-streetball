import { goalYRange } from "../sim/court";
import type { MatchState } from "../sim/types";

// Metres-to-pixels scale, chosen so the render layer never touches sim
// units directly.
const PX_PER_METRE = 32;

// The sim models goals on the x=0 / x=width walls (see physics.ts) with no
// notion of screen orientation — it doesn't know or care how it's drawn.
// Landscape, goals left/right: sim space maps straight onto the canvas with
// no rotation. (Portrait was tried and reverted — kept as a named seam here
// in case orientation changes again, rather than inlining sim coordinates
// directly into every draw call.)
function toScreen(simX: number, simY: number): { x: number; y: number } {
  return { x: simX * PX_PER_METRE, y: simY * PX_PER_METRE };
}

export function resizeCanvasToCourt(
  canvas: HTMLCanvasElement,
  state: MatchState
): void {
  const { court } = state.config;
  canvas.width = court.width * PX_PER_METRE;
  canvas.height = court.height * PX_PER_METRE;
}

export function render(ctx: CanvasRenderingContext2D, state: MatchState): void {
  const { court } = state.config;
  const canvasW = court.width * PX_PER_METRE;
  const canvasH = court.height * PX_PER_METRE;

  ctx.fillStyle = "#1c3d2e";
  ctx.fillRect(0, 0, canvasW, canvasH);

  drawWalls(ctx, state);
  drawPlayers(ctx, state);
  drawBall(ctx, state);
}

function drawWalls(ctx: CanvasRenderingContext2D, state: MatchState): void {
  const { court } = state.config;
  const canvasW = court.width * PX_PER_METRE;
  const canvasH = court.height * PX_PER_METRE;
  const { min: goalMin, max: goalMax } = goalYRange(court);
  const goalMinPx = goalMin * PX_PER_METRE;
  const goalMaxPx = goalMax * PX_PER_METRE;

  ctx.strokeStyle = "#e8e8e8";
  ctx.lineWidth = 4;

  // Top/bottom walls (sim y = 0 / y = height) are the untouched long edges.
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(canvasW, 0);
  ctx.moveTo(0, canvasH);
  ctx.lineTo(canvasW, canvasH);

  // Left/right walls (sim x = 0 / x = width) carry the goal openings.
  ctx.moveTo(0, 0);
  ctx.lineTo(0, goalMinPx);
  ctx.moveTo(0, goalMaxPx);
  ctx.lineTo(0, canvasH);
  ctx.moveTo(canvasW, 0);
  ctx.lineTo(canvasW, goalMinPx);
  ctx.moveTo(canvasW, goalMaxPx);
  ctx.lineTo(canvasW, canvasH);
  ctx.stroke();

  ctx.strokeStyle = "#f4d35e";
  ctx.beginPath();
  ctx.moveTo(0, goalMinPx);
  ctx.lineTo(0, goalMaxPx);
  ctx.moveTo(canvasW, goalMinPx);
  ctx.lineTo(canvasW, goalMaxPx);
  ctx.stroke();
}

function drawPlayers(ctx: CanvasRenderingContext2D, state: MatchState): void {
  for (const player of state.players) {
    const { x, y } = toScreen(player.x, player.y);
    ctx.fillStyle = player.team === "home" ? "#4fa8ff" : "#ff6b6b";
    ctx.strokeStyle = player.team === "home" ? "#2a6bc9" : "#c9403f";
    ctx.lineWidth = 2;
    drawBlob(ctx, x, y, 11, hashString(player.id));
  }
}

// Deterministic string hash so a player's blob shape is stable across
// renders (same id → same wobble) without the render layer needing any
// per-tick randomness of its own.
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

// Rough, hand-drawn-looking "blob" silhouette — a wobbly circle rather
// than a clean dot, per the game's placeholder art direction.
function drawBlob(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  baseRadius: number,
  seed: number
): void {
  const pointCount = 7;
  const points: { x: number; y: number }[] = [];
  let h = seed;
  for (let i = 0; i < pointCount; i++) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    const variance = 0.7 + (h % 1000) / 1000 / 2; // 0.7x - 1.2x radius
    const angle = (i / pointCount) * Math.PI * 2;
    points.push({
      x: cx + Math.cos(angle) * baseRadius * variance,
      y: cy + Math.sin(angle) * baseRadius * variance,
    });
  }

  const midpoint = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  });

  const start = midpoint(points[pointCount - 1], points[0]);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  for (let i = 0; i < pointCount; i++) {
    const next = points[(i + 1) % pointCount];
    const mid = midpoint(points[i], next);
    ctx.quadraticCurveTo(points[i].x, points[i].y, mid.x, mid.y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawBall(ctx: CanvasRenderingContext2D, state: MatchState): void {
  const { ball } = state;
  const { x, y } = toScreen(ball.x, ball.y);
  ctx.beginPath();
  ctx.fillStyle = "#ffffff";
  ctx.arc(x, y, ball.radius * PX_PER_METRE, 0, Math.PI * 2);
  ctx.fill();
}
