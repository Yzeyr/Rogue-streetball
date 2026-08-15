import type { PlayerAttributes } from "../sim/types";

export interface CrewMember {
  id: string;
  name: string;
  attributes: PlayerAttributes;
}

// Fixed length 5, positional: crew[0] plays keeper, crew[1-2] back,
// crew[3-4] forward, matching formation.ts's slot order for team size 5.
// Assigning your own formation is a later refinement, not needed here.
export type Crew = CrewMember[];

// Hand-authored, not rolled — real generation (packs, rarity) is a later
// system. Attributes are picked to give each player a rough identity, so
// the crew reads as five people with a role, not five interchangeable
// stat blocks (pillar 2).
export const STARTER_CREW: Crew = [
  {
    id: "starter-keeper",
    name: "Mo Okafor",
    attributes: {
      pace: 45,
      shooting: 30,
      passing: 55,
      tackling: 50,
      positioning: 60,
      stamina: 55,
      goalkeeping: 75,
    },
  },
  {
    id: "starter-back-1",
    name: "Deniz Aksoy",
    attributes: {
      pace: 50,
      shooting: 35,
      passing: 55,
      tackling: 70,
      positioning: 60,
      stamina: 60,
      goalkeeping: 30,
    },
  },
  {
    id: "starter-back-2",
    name: "Priya Nair",
    attributes: {
      pace: 55,
      shooting: 40,
      passing: 60,
      tackling: 65,
      positioning: 55,
      stamina: 55,
      goalkeeping: 25,
    },
  },
  {
    id: "starter-forward-1",
    name: "Jonas Berg",
    attributes: {
      pace: 70,
      shooting: 65,
      passing: 45,
      tackling: 35,
      positioning: 50,
      stamina: 50,
      goalkeeping: 20,
    },
  },
  {
    id: "starter-forward-2",
    name: "Tayo Adeyemi",
    attributes: {
      pace: 60,
      shooting: 70,
      passing: 50,
      tackling: 30,
      positioning: 55,
      stamina: 55,
      goalkeeping: 20,
    },
  },
];
