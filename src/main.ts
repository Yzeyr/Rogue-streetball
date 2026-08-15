import "./style.css";
import { createMatch, simulateMatch } from "./sim/match";
import { DEFAULT_COURT } from "./sim/court";
import type { MatchConfig } from "./sim/types";
import { render, resizeCanvasToCourt } from "./render/renderer";
import { MatchLoop } from "./render/loop";

const config: MatchConfig = {
  seed: 1,
  court: DEFAULT_COURT,
  teamSize: 5,
  tickRate: 30,
};

const canvas = document.querySelector<HTMLCanvasElement>("#court")!;
const ctx = canvas.getContext("2d")!;
const scoreEl = document.querySelector<HTMLDivElement>("#score")!;

const initialState = createMatch(config);
resizeCanvasToCourt(canvas, initialState);

function updateScoreboard(state: ReturnType<typeof createMatch>): void {
  scoreEl.textContent = `${state.score.home} – ${state.score.away}`;
}

const loop = new MatchLoop(initialState, (state) => {
  render(ctx, state);
  updateScoreboard(state);
});

render(ctx, initialState);
updateScoreboard(initialState);
loop.start();

document.querySelector<HTMLButtonElement>("#speed-1x")!.addEventListener("click", () => {
  loop.speedMultiplier = 1;
});
document.querySelector<HTMLButtonElement>("#speed-4x")!.addEventListener("click", () => {
  loop.speedMultiplier = 4;
});

document.querySelector<HTMLButtonElement>("#simulate-instant")!.addEventListener("click", () => {
  loop.stop();
  const result = simulateMatch(config, 4 * 60);
  render(ctx, result);
  updateScoreboard(result);
});
