import "./style.css";
import { createMatch, simulateMatch, isMatchComplete } from "./sim/match";
import { DEFAULT_COURT } from "./sim/court";
import type { MatchConfig, MatchState } from "./sim/types";
import { render, resizeCanvasToCourt } from "./render/renderer";
import { MatchLoop } from "./render/loop";
import { createRunState, recordResult, type RunState } from "./meta/run";
import { pickRandomPerks, applyPerk, type Perk } from "./meta/perks";

const MATCH_DURATION_SECONDS = 60; // ~1 real minute to watch at 1x, per decision log

function baseConfig(): MatchConfig {
  return {
    seed: Math.floor(Math.random() * 1_000_000_000),
    court: DEFAULT_COURT,
    teamSize: 5,
    tickRate: 30,
    durationSeconds: MATCH_DURATION_SECONDS,
  };
}

// --- Screens -----------------------------------------------------------

const screens = {
  home: document.querySelector<HTMLElement>("#screen-home")!,
  match: document.querySelector<HTMLElement>("#screen-match")!,
  result: document.querySelector<HTMLElement>("#screen-result")!,
  draft: document.querySelector<HTMLElement>("#screen-draft")!,
};

function showScreen(name: keyof typeof screens): void {
  for (const key of Object.keys(screens) as (keyof typeof screens)[]) {
    screens[key].hidden = key !== name;
  }
}

const crewListEl = document.querySelector<HTMLUListElement>("#crew-list")!;
const startRunBtn = document.querySelector<HTMLButtonElement>("#start-run")!;

const canvas = document.querySelector<HTMLCanvasElement>("#court")!;
const ctx = canvas.getContext("2d")!;
const scoreEl = document.querySelector<HTMLDivElement>("#score")!;

const resultTitleEl = document.querySelector<HTMLHeadingElement>("#result-title")!;
const resultScoreEl = document.querySelector<HTMLParagraphElement>("#result-score")!;
const resultRecordEl = document.querySelector<HTMLParagraphElement>("#result-record")!;
const continueBtn = document.querySelector<HTMLButtonElement>("#continue-btn")!;

const perkOptionsEl = document.querySelector<HTMLDivElement>("#perk-options")!;

// crew[0] = keeper, [1-2] = back, [3-4] = forward — see meta/crew.ts.
const ROLE_LABELS = ["GK", "DEF", "DEF", "FWD", "FWD"];

// --- State ---------------------------------------------------------------

let run: RunState = createRunState();
let currentConfig: MatchConfig | null = null;
let loop: MatchLoop | null = null;

function updateScoreboard(state: MatchState): void {
  scoreEl.textContent = `${state.score.home} – ${state.score.away}`;
}

function renderCrewList(): void {
  crewListEl.innerHTML = "";
  run.crew.forEach((member, i) => {
    const li = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = member.name;
    const role = document.createElement("span");
    role.className = "crew-role";
    role.textContent = ROLE_LABELS[i] ?? "";
    li.append(name, role);
    crewListEl.append(li);
  });
}

function homeAttributesForCrew() {
  return run.crew.map((member) => member.attributes);
}

function startMatch(): void {
  currentConfig = baseConfig();
  const initialState = createMatch(currentConfig, homeAttributesForCrew());
  resizeCanvasToCourt(canvas, initialState);
  render(ctx, initialState);
  updateScoreboard(initialState);
  showScreen("match");

  loop = new MatchLoop(initialState, (state) => {
    render(ctx, state);
    updateScoreboard(state);
    if (isMatchComplete(state)) {
      loop?.stop();
      handleMatchComplete(state);
    }
  });
  loop.start();
}

function handleMatchComplete(state: MatchState): void {
  run = recordResult(run, state.score.home, state.score.away);

  const { home, away } = state.score;
  resultTitleEl.textContent = home > away ? "Match won" : home < away ? "Match lost" : "Draw";
  resultScoreEl.textContent = `${home} – ${away}`;
  resultRecordEl.textContent = `Run record: ${run.wins}W ${run.draws}D ${run.losses}L (match ${run.matchesPlayed})`;

  showScreen("result");
}

function showDraft(): void {
  const options = pickRandomPerks(3);
  perkOptionsEl.innerHTML = "";
  options.forEach((perk) => {
    const button = document.createElement("button");
    button.className = "perk-option";
    const name = document.createElement("span");
    name.textContent = perk.name;
    const desc = document.createElement("span");
    desc.className = "perk-desc";
    desc.textContent = perk.description;
    button.append(name, desc);
    button.addEventListener("click", () => pickPerk(perk));
    perkOptionsEl.append(button);
  });
  showScreen("draft");
}

function pickPerk(perk: Perk): void {
  run = { ...run, crew: applyPerk(run.crew, perk) };
  startMatch();
}

// --- Wiring ----------------------------------------------------------

startRunBtn.addEventListener("click", () => {
  startMatch();
});

continueBtn.addEventListener("click", () => {
  showDraft();
});

document.querySelector<HTMLButtonElement>("#speed-1x")!.addEventListener("click", () => {
  if (loop) loop.speedMultiplier = 1;
});
document.querySelector<HTMLButtonElement>("#speed-4x")!.addEventListener("click", () => {
  if (loop) loop.speedMultiplier = 4;
});

document.querySelector<HTMLButtonElement>("#simulate-instant")!.addEventListener("click", () => {
  if (!currentConfig) return;
  loop?.stop();
  const result = simulateMatch(currentConfig, homeAttributesForCrew());
  render(ctx, result);
  updateScoreboard(result);
  handleMatchComplete(result);
});

renderCrewList();
showScreen("home");
