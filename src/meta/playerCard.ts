import type { PlayerAttributes } from "../sim/types";

// Settled rarity ladder (see project decision log): Gray (common) -> Blue
// (rare) -> Purple (epic) -> Orange (legendary) -> Diamond (icon).
export type Rarity = "gray" | "blue" | "purple" | "orange" | "diamond";

export const RARITY_ORDER: Rarity[] = ["gray", "blue", "purple", "orange", "diamond"];

export const RARITY_LABELS: Record<Rarity, string> = {
  gray: "Gray",
  blue: "Blue",
  purple: "Purple",
  orange: "Orange",
  diamond: "Diamond",
};

// A trait is a named bonus to one attribute — the mechanical expression
// of "rarity grants a specialised trait that makes it exceptional at one
// specific thing" (decision log). Deliberately simple: no sim-side
// special-casing, just a bigger number in the one stat that matters for
// that identity, applied on top of the rarity's normal roll so it can
// push past that band's ceiling.
export interface Trait {
  id: string;
  name: string;
  attribute: keyof PlayerAttributes;
  bonus: number;
}

export const TRAIT_POOL: Trait[] = [
  { id: "sharpshooter", name: "Sharpshooter", attribute: "shooting", bonus: 15 },
  { id: "playmaker", name: "Playmaker", attribute: "passing", bonus: 15 },
  { id: "wall", name: "Brick Wall", attribute: "tackling", bonus: 15 },
  { id: "speedster", name: "Speedster", attribute: "pace", bonus: 15 },
  { id: "sweeper-keeper", name: "Sweeper Keeper", attribute: "goalkeeping", bonus: 15 },
  { id: "reader", name: "Game Reader", attribute: "positioning", bonus: 15 },
  { id: "engine", name: "Engine", attribute: "stamina", bonus: 15 },
];

export interface PlayerCard {
  id: string; // unique per pull, even for the same name (see profile.ts for dupe handling)
  name: string;
  rarity: Rarity;
  attributes: PlayerAttributes;
  trait: Trait | null;
}

const RARITY_STAT_RANGE: Record<Rarity, [number, number]> = {
  gray: [35, 55],
  blue: [45, 65],
  purple: [55, 75],
  orange: [65, 85],
  diamond: [78, 95],
};

const RARITY_TRAIT_CHANCE: Record<Rarity, number> = {
  gray: 0.05,
  blue: 0.15,
  purple: 0.35,
  orange: 0.65,
  diamond: 1,
};

const FIRST_NAMES = [
  "Mo", "Deniz", "Priya", "Jonas", "Tayo", "Kwame", "Elin", "Marco", "Yusuf", "Nadia",
  "Theo", "Ines", "Bilal", "Sasha", "Rui", "Ana", "Leo", "Mika", "Farid", "Cleo",
  "Omar", "Lucia", "Ravi", "Freya", "Dario", "Amara", "Niko", "Zara", "Elias", "Tamsin",
];
const LAST_NAMES = [
  "Okafor", "Aksoy", "Nair", "Berg", "Adeyemi", "Diallo", "Karlsson", "Ferreira", "Demir", "Costa",
  "Haddad", "Silva", "Novak", "Petrov", "Alves", "Kimura", "Osei", "Larsen", "Rocha", "Amin",
  "Bakker", "Moreau", "Salih", "Torres", "Nakamura", "Kovac", "Idris", "Lindqvist", "Reyes", "Hassan",
];

function randomName(): string {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${first} ${last}`;
}

function rollInRange(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function rollAttributesForRarity(rarity: Rarity): PlayerAttributes {
  const [min, max] = RARITY_STAT_RANGE[rarity];
  return {
    pace: rollInRange(min, max),
    shooting: rollInRange(min, max),
    passing: rollInRange(min, max),
    tackling: rollInRange(min, max),
    positioning: rollInRange(min, max),
    stamina: rollInRange(min, max),
    goalkeeping: rollInRange(min, max),
  };
}

function rollTrait(rarity: Rarity): Trait | null {
  if (Math.random() >= RARITY_TRAIT_CHANCE[rarity]) return null;
  return TRAIT_POOL[Math.floor(Math.random() * TRAIT_POOL.length)];
}

let cardCounter = 0;
function nextCardId(): string {
  cardCounter += 1;
  return `card-${Date.now()}-${cardCounter}`;
}

// Generates one Player Card at a given rarity. Attributes roll within
// that rarity's stat band; a trait (chance scaling with rarity) then adds
// its bonus on top, which is what lets a rarer pull's specialty exceed
// the band's normal ceiling — the mechanical shape of "exceptional at one
// specific thing," not just a uniformly bigger stat block.
export function generatePlayerCard(rarity: Rarity): PlayerCard {
  const attributes = rollAttributesForRarity(rarity);
  const trait = rollTrait(rarity);
  if (trait) {
    attributes[trait.attribute] = clamp(attributes[trait.attribute] + trait.bonus, 0, 100);
  }
  return {
    id: nextCardId(),
    name: randomName(),
    rarity,
    attributes,
    trait,
  };
}
