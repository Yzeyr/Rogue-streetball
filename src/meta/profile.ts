import { STARTER_CREW } from "./crew";
import type { Crew } from "./crew";
import type { PlayerCard, Rarity } from "./playerCard";

// The thing that survives between runs — decision log's "most progress":
// the unlocked Player Card pool plus Coins/Gems balances. RunState (see
// run.ts) is what resets on a loss; this is what doesn't.
export interface PlayerProfile {
  collection: PlayerCard[]; // every card ever kept, including the starters
  coins: number;
  gems: number;
  totalCupsCleared: number; // lifetime, across every run — a stat, not (yet) spendable
  activeCrewCardIds: string[]; // which 5 card ids form the next run's squad, positional
  permanentBuffIds: string[]; // purchased permanent Gem buffs (see perks/buffs)
}

const STORAGE_KEY = "rogue-streetball-profile-v1";

export function createProfile(): PlayerProfile {
  return {
    collection: [...STARTER_CREW],
    coins: 0,
    gems: 0,
    totalCupsCleared: 0,
    activeCrewCardIds: STARTER_CREW.map((card) => card.id),
    permanentBuffIds: [],
  };
}

// localStorage can fail (private browsing, quota, disabled) — losing
// persistence shouldn't crash the game, just silently fall back to
// session-only play.
export function saveProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // ignored — see comment above
  }
}

export function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createProfile();
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
    if (!Array.isArray(parsed.collection) || !Array.isArray(parsed.activeCrewCardIds)) {
      return createProfile(); // corrupt or old-shape value — don't crash the game over it
    }
    return { ...createProfile(), ...parsed };
  } catch {
    return createProfile();
  }
}

export function getActiveCrew(profile: PlayerProfile): Crew {
  const byId = new Map(profile.collection.map((card) => [card.id, card] as const));
  return profile.activeCrewCardIds
    .map((id) => byId.get(id))
    .filter((card): card is PlayerCard => Boolean(card));
}

const DUPE_COIN_VALUE: Record<Rarity, number> = {
  gray: 10,
  blue: 25,
  purple: 60,
  orange: 150,
  diamond: 500,
};

export interface AddCardsResult {
  profile: PlayerProfile;
  added: PlayerCard[];
  duplicates: { card: PlayerCard; coinsAwarded: number }[];
}

// Adds newly pulled cards to the collection. A card sharing a name with
// one already owned is a duplicate (see decision log: "duplicate Player
// Card pulls convert into Market currency," now Coins) — it doesn't
// bloat the collection, it funds the Market instead.
export function addCardsToCollection(profile: PlayerProfile, cards: PlayerCard[]): AddCardsResult {
  const owned = new Set(profile.collection.map((card) => card.name));
  const added: PlayerCard[] = [];
  const duplicates: AddCardsResult["duplicates"] = [];
  let coinsGained = 0;
  // "Home Advantage" permanent buff (see buffs.ts): +50% Coins from dupes.
  const dupeMultiplier = profile.permanentBuffIds.includes("home-advantage") ? 1.5 : 1;

  for (const card of cards) {
    if (owned.has(card.name)) {
      const coinsAwarded = Math.round(DUPE_COIN_VALUE[card.rarity] * dupeMultiplier);
      duplicates.push({ card, coinsAwarded });
      coinsGained += coinsAwarded;
    } else {
      owned.add(card.name);
      added.push(card);
    }
  }

  return {
    profile: {
      ...profile,
      collection: [...profile.collection, ...added],
      coins: profile.coins + coinsGained,
    },
    added,
    duplicates,
  };
}
