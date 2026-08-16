import "./style.css";
import { createMatch, simulateMatch, isMatchComplete } from "./sim/match";
import { DEFAULT_COURT } from "./sim/court";
import type { MatchConfig, MatchState } from "./sim/types";
import { render, resizeCanvasToCourt } from "./render/renderer";
import { MatchLoop } from "./render/loop";
import { createRunState, recordResult, type RunState } from "./meta/run";
import { advanceCup, resolveSuddenDeath, type CupProgress } from "./meta/cup";
import { pickRandomPerks, applyPerk, type Perk } from "./meta/perks";
import {
  loadProfile,
  saveProfile,
  getActiveCrew,
  addCardsToCollection,
  type PlayerProfile,
} from "./meta/profile";
import { RARITY_LABELS, type PlayerCard } from "./meta/playerCard";
import { openPack, PACK_TIER_LABELS, type PackTier } from "./meta/pack";
import { rollMarketListing, priceFor } from "./meta/market";
import { BUFF_POOL, applyStartingBuffs } from "./meta/buffs";
import type { Crew } from "./meta/crew";

const GEMS_PER_CUP_CLEARED = 5; // earned on run-over, scaling with how far this run got

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

// --- Screens ---------------------------------------------------------

const screens = {
  home: document.querySelector<HTMLElement>("#screen-home")!,
  squad: document.querySelector<HTMLElement>("#screen-squad")!,
  market: document.querySelector<HTMLElement>("#screen-market")!,
  buffs: document.querySelector<HTMLElement>("#screen-buffs")!,
  match: document.querySelector<HTMLElement>("#screen-match")!,
  result: document.querySelector<HTMLElement>("#screen-result")!,
  pack: document.querySelector<HTMLElement>("#screen-pack")!,
  draft: document.querySelector<HTMLElement>("#screen-draft")!,
  runOver: document.querySelector<HTMLElement>("#screen-run-over")!,
};

function showScreen(name: keyof typeof screens): void {
  for (const key of Object.keys(screens) as (keyof typeof screens)[]) {
    screens[key].hidden = key !== name;
  }
}

// --- DOM refs --------------------------------------------------------

const crewListEl = document.querySelector<HTMLUListElement>("#crew-list")!;
const startRunBtn = document.querySelector<HTMLButtonElement>("#start-run")!;
const homeCoinsEl = document.querySelector<HTMLSpanElement>("#home-coins")!;
const homeGemsEl = document.querySelector<HTMLSpanElement>("#home-gems")!;

const squadSlotsEl = document.querySelector<HTMLDivElement>("#squad-slots")!;
const squadCollectionEl = document.querySelector<HTMLDivElement>("#squad-collection")!;
const squadSaveBtn = document.querySelector<HTMLButtonElement>("#squad-save")!;

const marketCoinsEl = document.querySelector<HTMLSpanElement>("#market-coins")!;
const marketListingEl = document.querySelector<HTMLDivElement>("#market-listing")!;

const buffsGemsEl = document.querySelector<HTMLSpanElement>("#buffs-gems")!;
const buffsListEl = document.querySelector<HTMLDivElement>("#buffs-list")!;

const canvas = document.querySelector<HTMLCanvasElement>("#court")!;
const ctx = canvas.getContext("2d")!;
const scoreEl = document.querySelector<HTMLDivElement>("#score")!;
const matchStatusEl = document.querySelector<HTMLParagraphElement>("#match-status")!;

const resultTitleEl = document.querySelector<HTMLHeadingElement>("#result-title")!;
const resultScoreEl = document.querySelector<HTMLParagraphElement>("#result-score")!;
const resultDetailEl = document.querySelector<HTMLParagraphElement>("#result-detail")!;
const resultRecordEl = document.querySelector<HTMLParagraphElement>("#result-record")!;
const continueBtn = document.querySelector<HTMLButtonElement>("#continue-btn")!;

const packTitleEl = document.querySelector<HTMLHeadingElement>("#pack-title")!;
const packCardsEl = document.querySelector<HTMLDivElement>("#pack-cards")!;
const packDupesEl = document.querySelector<HTMLParagraphElement>("#pack-dupes")!;

const perkOptionsEl = document.querySelector<HTMLDivElement>("#perk-options")!;

const runOverDetailEl = document.querySelector<HTMLParagraphElement>("#run-over-detail")!;
const runOverStatsEl = document.querySelector<HTMLParagraphElement>("#run-over-stats")!;
const newRunBtn = document.querySelector<HTMLButtonElement>("#new-run-btn")!;

// crew[0] = keeper, [1-2] = back, [3-4] = forward — see meta/crew.ts.
const ROLE_LABELS = ["GK", "DEF", "DEF", "FWD", "FWD"];

// --- State -------------------------------------------------------------

let profile: PlayerProfile = loadProfile();
let run: RunState | null = null;
let currentConfig: MatchConfig | null = null;
let loop: MatchLoop | null = null;
let currentContext: "cup" | "sudden-death" = "cup";
let pendingContinue: () => void = () => {};
let squadSelection: (PlayerCard | null)[] = [null, null, null, null, null];
let marketListing: PlayerCard[] = [];

function updateScoreboard(state: MatchState): void {
  scoreEl.textContent = `${state.score.home} – ${state.score.away}`;
}

function homeAttributesForCrew() {
  return run!.crew.map((member) => member.attributes);
}

function cupStatusLabel(cup: CupProgress): string {
  return cup.round === 5 ? "Round 5 · Boss" : `Round ${cup.round} · Leg ${cup.leg} of 2`;
}

function overallRating(card: PlayerCard): number {
  const a = card.attributes;
  return Math.round(
    (a.pace + a.shooting + a.passing + a.tackling + a.positioning + a.stamina + a.goalkeeping) / 7
  );
}

function renderCardButton(card: PlayerCard, priceLabel?: string): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.className = `player-card rarity-${card.rarity}`;

  const ovr = document.createElement("span");
  ovr.className = "card-ovr";
  ovr.textContent = String(overallRating(card));
  btn.append(ovr);

  const name = document.createElement("div");
  name.className = "card-name";
  name.textContent = card.name;
  btn.append(name);

  const rarity = document.createElement("div");
  rarity.className = "card-rarity";
  rarity.textContent = RARITY_LABELS[card.rarity];
  btn.append(rarity);

  if (card.trait) {
    const trait = document.createElement("div");
    trait.className = "card-trait";
    trait.textContent = `★ ${card.trait.name}`;
    btn.append(trait);
  }

  if (priceLabel) {
    const price = document.createElement("div");
    price.className = "card-price";
    price.textContent = priceLabel;
    btn.append(price);
  }

  return btn;
}

function renderCrewList(crew: Crew): void {
  crewListEl.innerHTML = "";
  crew.forEach((member, i) => {
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

function renderHome(): void {
  homeCoinsEl.textContent = String(profile.coins);
  homeGemsEl.textContent = String(profile.gems);
  renderCrewList(getActiveCrew(profile));
}

// --- Squad screen --------------------------------------------------------

function openSquadScreen(): void {
  const activeCrew = getActiveCrew(profile);
  squadSelection = [0, 1, 2, 3, 4].map((i) => activeCrew[i] ?? null);
  renderSquadScreen();
  showScreen("squad");
}

function renderSquadScreen(): void {
  squadSlotsEl.innerHTML = "";
  ROLE_LABELS.forEach((roleLabel, i) => {
    const card = squadSelection[i];
    const slot = document.createElement("button");
    slot.className = `squad-slot${card ? " filled" : ""}`;

    const label = document.createElement("span");
    label.className = "slot-label";
    label.textContent = roleLabel;
    slot.append(label);

    const body = document.createElement("span");
    body.textContent = card ? card.name : "Empty";
    slot.append(body);

    if (card) {
      slot.addEventListener("click", () => {
        squadSelection[i] = null;
        renderSquadScreen();
      });
    }
    squadSlotsEl.append(slot);
  });

  squadCollectionEl.innerHTML = "";
  profile.collection.forEach((card) => {
    const selectedIndex = squadSelection.findIndex((c) => c?.id === card.id);
    const btn = renderCardButton(card);
    if (selectedIndex !== -1) btn.classList.add("selected");
    btn.addEventListener("click", () => {
      if (selectedIndex !== -1) {
        squadSelection[selectedIndex] = null;
      } else {
        const emptyIndex = squadSelection.findIndex((c) => c === null);
        if (emptyIndex !== -1) squadSelection[emptyIndex] = card;
      }
      renderSquadScreen();
    });
    squadCollectionEl.append(btn);
  });

  squadSaveBtn.disabled = squadSelection.some((c) => c === null);
}

// --- Market screen ---------------------------------------------------

function openMarketScreen(): void {
  marketListing = rollMarketListing();
  renderMarketScreen();
  showScreen("market");
}

function renderMarketScreen(): void {
  marketCoinsEl.textContent = String(profile.coins);
  marketListingEl.innerHTML = "";
  marketListing.forEach((card, index) => {
    const price = priceFor(card);
    const btn = renderCardButton(card, `${price} coins`);
    btn.disabled = profile.coins < price;
    btn.addEventListener("click", () => {
      if (profile.coins < price) return;
      profile = { ...profile, coins: profile.coins - price, collection: [...profile.collection, card] };
      saveProfile(profile);
      marketListing = marketListing.filter((_, i) => i !== index);
      renderMarketScreen();
    });
    marketListingEl.append(btn);
  });
}

// --- Buffs screen ------------------------------------------------------

function renderBuffsScreen(): void {
  buffsGemsEl.textContent = String(profile.gems);
  buffsListEl.innerHTML = "";
  BUFF_POOL.forEach((buff) => {
    const owned = profile.permanentBuffIds.includes(buff.id);
    const btn = document.createElement("button");
    btn.className = `buff-option${owned ? " owned" : ""}`;
    btn.disabled = owned || profile.gems < buff.cost;

    const name = document.createElement("span");
    name.textContent = buff.name;
    const desc = document.createElement("span");
    desc.className = "buff-desc";
    desc.textContent = buff.description;
    const cost = document.createElement("span");
    cost.className = "buff-cost";
    cost.textContent = owned ? "Owned" : `${buff.cost} gems`;
    btn.append(name, desc, cost);

    btn.addEventListener("click", () => {
      if (owned || profile.gems < buff.cost) return;
      profile = {
        ...profile,
        gems: profile.gems - buff.cost,
        permanentBuffIds: [...profile.permanentBuffIds, buff.id],
      };
      saveProfile(profile);
      renderBuffsScreen();
    });
    buffsListEl.append(btn);
  });
}

// --- Match lifecycle -------------------------------------------------

function beginMatch(config: MatchConfig, statusLabel: string): void {
  currentConfig = config;
  const initialState = createMatch(config, homeAttributesForCrew(), run!.cup.opponent);
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
  beginMatch(buildConfig(false), cupStatusLabel(run!.cup));
}

function startSuddenDeathMatch(): void {
  currentContext = "sudden-death";
  beginMatch(buildConfig(true), "Sudden death — next goal wins");
}

function handleMatchComplete(state: MatchState): void {
  const { home, away } = state.score;
  run = recordResult(run!, home, away);

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
    case "cup-cleared": {
      resultTitleEl.textContent = "Cup cleared! \u{1F3C6}";
      resultDetailEl.textContent = "A pack is waiting.";
      const tier = advance.packTier!;
      pendingContinue = () => showPackOpening(tier);
      break;
    }
    case "sudden-death-needed":
      resultTitleEl.textContent = "Level on aggregate";
      resultDetailEl.textContent = "Sudden death — next goal wins.";
      pendingContinue = () => startSuddenDeathMatch();
      break;
  }

  resultRecordEl.textContent = `Run record: ${run.wins}W ${run.draws}D ${run.losses}L (match ${run.matchesPlayed})`;
  showScreen("result");
}

function showPackOpening(tier: PackTier): void {
  const cards = openPack(tier);
  const added = addCardsToCollection(profile, cards);
  profile = added.profile;
  saveProfile(profile);

  packTitleEl.textContent = PACK_TIER_LABELS[tier];
  packCardsEl.innerHTML = "";
  cards.forEach((card) => {
    const btn = renderCardButton(card);
    btn.disabled = true;
    packCardsEl.append(btn);
  });

  packDupesEl.textContent = added.duplicates.length
    ? `${added.duplicates.length} duplicate${added.duplicates.length === 1 ? "" : "s"} converted to ${added.duplicates.reduce((sum, d) => sum + d.coinsAwarded, 0)} coins.`
    : "";

  showScreen("pack");
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
      run = { ...run!, crew: applyPerk(run!.crew, perk) };
      onDone();
    });
    perkOptionsEl.append(button);
  });
  showScreen("draft");
}

function showRunOver(home: number, away: number): void {
  const isAggregateLoss = currentContext === "cup" && run!.cup.round <= 4;
  const scoreLine = isAggregateLoss
    ? `${run!.cup.aggregateHome}-${run!.cup.aggregateAway} on aggregate`
    : `${home}-${away}`;
  const legNote = isAggregateLoss && run!.cup.leg ? ` (leg ${run!.cup.leg})` : "";
  const cupsNote = run!.cupsCleared === 1 ? "1 cup" : `${run!.cupsCleared} cups`;
  runOverDetailEl.textContent = `Lost ${scoreLine} in round ${run!.cup.round}${legNote}, having cleared ${cupsNote}.`;
  runOverStatsEl.textContent = `Final record: ${run!.wins}W ${run!.draws}D ${run!.losses}L across ${run!.matchesPlayed} matches.`;

  // Gems: earned from season performance (decision log), spent on
  // permanent buffs. Banked here alongside the lifetime cups-cleared stat.
  profile = {
    ...profile,
    totalCupsCleared: profile.totalCupsCleared + run!.cupsCleared,
    gems: profile.gems + run!.cupsCleared * GEMS_PER_CUP_CLEARED,
  };
  saveProfile(profile);

  showScreen("runOver");
}

// --- Wiring ------------------------------------------------------------

startRunBtn.addEventListener("click", () => {
  const crew = getActiveCrew(profile);
  if (crew.length !== TEAM_SIZE) {
    openSquadScreen();
    return;
  }
  run = createRunState(TEAM_SIZE, applyStartingBuffs(crew, profile.permanentBuffIds));
  startCupMatch();
});

document.querySelector<HTMLButtonElement>("#nav-squad")!.addEventListener("click", () => {
  openSquadScreen();
});
document.querySelector<HTMLButtonElement>("#nav-market")!.addEventListener("click", () => {
  openMarketScreen();
});
document.querySelector<HTMLButtonElement>("#nav-buffs")!.addEventListener("click", () => {
  renderBuffsScreen();
  showScreen("buffs");
});
document.querySelector<HTMLButtonElement>("#buffs-back")!.addEventListener("click", () => {
  showScreen("home");
});

document.querySelector<HTMLButtonElement>("#squad-back")!.addEventListener("click", () => {
  showScreen("home");
});
squadSaveBtn.addEventListener("click", () => {
  if (squadSelection.some((c) => c === null)) return;
  profile = { ...profile, activeCrewCardIds: squadSelection.map((c) => c!.id) };
  saveProfile(profile);
  renderHome();
  showScreen("home");
});

document.querySelector<HTMLButtonElement>("#market-back")!.addEventListener("click", () => {
  renderHome();
  showScreen("home");
});

continueBtn.addEventListener("click", () => {
  pendingContinue();
});

document.querySelector<HTMLButtonElement>("#pack-continue")!.addEventListener("click", () => {
  showDraft(startCupMatch);
});

newRunBtn.addEventListener("click", () => {
  run = null;
  renderHome();
  showScreen("home");
});

document.querySelector<HTMLButtonElement>("#speed-1x")!.addEventListener("click", () => {
  if (loop) loop.speedMultiplier = 1;
});
document.querySelector<HTMLButtonElement>("#speed-3x")!.addEventListener("click", () => {
  if (loop) loop.speedMultiplier = 3;
});

document.querySelector<HTMLButtonElement>("#simulate-instant")!.addEventListener("click", () => {
  if (!currentConfig) return;
  loop?.stop();
  const result = simulateMatch(currentConfig, homeAttributesForCrew(), run!.cup.opponent);
  render(ctx, result);
  updateScoreboard(result);
  handleMatchComplete(result);
});

renderHome();
showScreen("home");
