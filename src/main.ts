import "./style.css";
import { createMatch, simulateMatch, isMatchComplete } from "./sim/match";
import { DEFAULT_COURT } from "./sim/court";
import type { MatchConfig, MatchState } from "./sim/types";
import { render, resizeCanvasToCourt } from "./render/renderer";
import { MatchLoop } from "./render/loop";
import { createRunState, recordResult, type RunState } from "./meta/run";
import { advanceCup, resolveSuddenDeath, type CupProgress } from "./meta/cup";
import { pickRandomPerks, applyPerk, type Perk } from "./meta/perks";

const TEAM_SIZE = 5;
const MATCH_DURATION_SECONDS = 60; // ~1 real minute to watch at 1x, per decision log
const SUDDEN_DEATH_DURATION_SECONDS = 180; // generous safety-net cap, not expected to be hit

function buildConfig(suddenDeath: boolean): MatchConfig {
  return {
    seed: Math.floor(Math.random() * 1_000_000_000),
    court: DEFAULT_COURT,
    teamSize: TEAM_SIZE,
    tickRate: 30,
    durationSeconds: suddenDeath ? SUDDEN_DEATH_DURATION_SECONDS : MATCH_DURATION_SECONDS,
    suddenDeath,
  };
}

// --- Screens -------------------------------------------------------------

const screens = {
  home: document.querySelector<HTMLElement>("#screen-home")!,
  match: document.querySelector<HTMLElement>("#screen-match")!,
  result: document.querySelector<HTMLElement>("#screen-result")!,
  draft: document.querySelector<HTMLElement>("#screen-draft")!,
  runOver: document.querySelector<HTMLElement>("#screen-run-over")!,
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
const matchStatusEl = document.querySelector<HTMLParagraphElement>("#match-status")!;

const resultTitleEl = document.querySelector<HTMLHeadingElement>("#result-title")!;
const resultScoreEl = document.querySelector<HTMLParagraphElement>("#result-score")!;
const resultDetailEl = document.querySelector<HTMLParagraphElement>("#result-detail")!;
const resultRecordEl = document.querySelector<HTMLParagraphElement>("#result-record")!;
const continueBtn = document.querySelector<HTMLButtonElement>("#continue-btn")!;

const perkOptionsEl = document.querySelector<HTMLDivElement>("#perk-options")!;

const runOverDetailEl = document.querySelector<HTMLParagraphElement>("#run-over-detail")!;
const runOverStatsEl = document.querySelector<HTMLParagraphElement>("#run-over-stats")!;
const newRunBtn = document.querySelector<HTMLButtonElement>("#new-run-btn")!;

// crew[0] = keeper, [1-2] = back, [3-4] = forward — see meta/crew.ts.
const ROLE_LABELS = ["GK", "DEF", "DEF", "FWD", "FWD"];

// --- State -----------------------------------------------------------------

let run: RunState = createRunState(TEAM_SIZE);
let currentConfig: MatchConfig | null = null;
let loop: MatchLoop | null = null;
let currentContext: "cup" | "sudden-death" = "cup";
let pendingContinue: () => void = () => {};

function updateScoreboard(state: MatchState): void {
  scoreEl.textContent = `${state.score.home} – ${state.score.away}`;
}

function homeAttributesForCrew() {
  return run.crew.map((member) => member.attributes);
}

function cupStatusLabel(cup: CupProgress): string {
  return cup.round === 5 ? "Round 5 · Boss" : `Round ${cup.round} · Leg ${cup.leg} of 2`;
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

// --- Match lifecycle -------------------------------------------------------

function beginMatch(config: MatchConfig, statusLabel: string): void {
  currentConfig = config;
  const initialState = createMatch(config, homeAttributesForCrew(), run.cup.opponent);
  resizeCanvasToCourt(canvas, initialState);
  render(ctx, initialState);
  updateScoreboard(initialState);
  matchStatusEl.textContent = statusLabel;
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

function startCupMatch(): void {
  currentContext = "cup";
  beginMatch(buildConfig(false), cupStatusLabel(run.cup));
}

function startSuddenDeathMatch(): void {
  currentContext = "sudden-death";
  beginMatch(buildConfig(true), "Sudden death — next goal wins");
}

function handleMatchComplete(state: MatchState): void {
  const { home, away } = state.score;
  run = recordResult(run, home, away);

  const coinsBefore = run.coins;
  const advance =
    currentContext === "sudden-death"
      ? resolveSuddenDeath(run, home, away, TEAM_SIZE)
      : advanceCup(run, home, away, TEAM_SIZE);
  run = advance.run;

  if (advance.outcome === "run-over") {
    showRunOver(home, away);
    return;
  }

  resultScoreEl.textContent = `${home} – ${away}`;

  switch (advance.outcome) {
    case "leg-complete":
      resultTitleEl.textContent = "Leg complete";
      resultDetailEl.textContent = `Aggregate ${run.cup.aggregateHome}-${run.cup.aggregateAway}. Leg 2 next.`;
      pendingContinue = () => showDraft(startCupMatch);
      break;
    case "advance-round":
      resultTitleEl.textContent = "Tie won";
      resultDetailEl.textContent =
        run.cup.round === 5 ? "Through to the boss round!" : `Round ${run.cup.round} next.`;
      pendingContinue = () => showDraft(startCupMatch);
      break;
    case "cup-cleared":
      resultTitleEl.textContent = "Cup cleared! \u{1F3C6}";
      resultDetailEl.textContent = `+${run.coins - coinsBefore} coins. Cup #${run.cupsCleared} down — next cup begins.`;
      pendingContinue = () => showDraft(startCupMatch);
      break;
    case "sudden-death-needed":
      resultTitleEl.textContent = "Level on aggregate";
      resultDetailEl.textContent = "Sudden death — next goal wins.";
      pendingContinue = () => startSuddenDeathMatch();
      break;
  }

  resultRecordEl.textContent = `Run record: ${run.wins}W ${run.draws}D ${run.losses}L (match ${run.matchesPlayed})`;
  showScreen("result");
}

function showDraft(onDone: () => void): void {
  const options = pickRandomPerks(3);
  perkOptionsEl.innerHTML = "";
  options.forEach((perk: Perk) => {
    const button = document.createElement("button");
    button.className = "perk-option";
    const name = document.createElement("span");
    name.textContent = perk.name;
    const desc = document.createElement("span");
    desc.className = "perk-desc";
    desc.textContent = perk.description;
    button.append(name, desc);
    button.addEventListener("click", () => {
      run = { ...run, crew: applyPerk(run.crew, perk) };
      onDone();
    });
    perkOptionsEl.append(button);
  });
  showScreen("draft");
}

function showRunOver(home: number, away: number): void {
  // A tie lost on aggregate (rounds 1-4, decided on leg 2) should show the
  // aggregate, not just the final leg's score — "lost 0-0" after winning
  // leg 1 2-0 and losing leg 2 0-2 is technically the last match's score,
  // but reads as if nothing happened. Boss and sudden-death losses are a
  // single decisive match, so their own score is already the right number.
  const isAggregateLoss = currentContext === "cup" && run.cup.round <= 4;
  const scoreLine = isAggregateLoss
    ? `${run.cup.aggregateHome}-${run.cup.aggregateAway} on aggregate`
    : `${home}-${away}`;
  const legNote = isAggregateLoss && run.cup.leg ? ` (leg ${run.cup.leg})` : "";
  const cupsNote = run.cupsCleared === 1 ? "1 cup" : `${run.cupsCleared} cups`;
  runOverDetailEl.textContent = `Lost ${scoreLine} in round ${run.cup.round}${legNote}, having cleared ${cupsNote}.`;
  runOverStatsEl.textContent = `Final record: ${run.wins}W ${run.draws}D ${run.losses}L across ${run.matchesPlayed} matches.`;
  showScreen("runOver");
}

// --- Wiring ------------------------------------------------------------

startRunBtn.addEventListener("click", () => {
  startCupMatch();
});

continueBtn.addEventListener("click", () => {
  pendingContinue();
});

newRunBtn.addEventListener("click", () => {
  run = createRunState(TEAM_SIZE);
  renderCrewList();
  showScreen("home");
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
  const result = simulateMatch(currentConfig, homeAttributesForCrew(), run.cup.opponent);
  render(ctx, result);
  updateScoreboard(result);
  handleMatchComplete(result);
});

renderCrewList();
showScreen("home");
