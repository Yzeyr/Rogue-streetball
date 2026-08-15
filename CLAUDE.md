# Project Instructions — Cage Football Roguelike

## 1. What this project is

A browser-based **5-a-side cage football roguelike**. Top-down 2D. Street
football played inside walls — no throw-ins, no offside, no stoppages, the ball
rebounds and play continues.

The match is **fully simulated**. The player never directly controls a
footballer. The player's agency is in building a crew, setting tactics, and
making roguelike draft choices between matches. The match itself plays out and
is watched.

Primary platform: **mobile browser (phone)**. Desktop should work but phone is
the target.

## 2. Tech stack

- **TypeScript** (strict mode)
- **Vite** as build tool / dev server
- **Canvas 2D** for match rendering
- **HTML + CSS** for all menus, crew screens, upgrade drafts
- **No game engine** (no Phaser, no Unity). No heavy dependencies without asking.
- Deployed as a static site + PWA so it can be added to a phone home screen.
- State persistence: `localStorage` (or IndexedDB if a run gets too big).

## 3. Design pillars

Measure every proposal against these. If a suggestion doesn't serve one, say so.

1. **The simulation is the game.** Match quality comes from believable emergent
   football, not scripted set pieces or canned animations.
2. **Five characters, not eleven athletes.** Each member of the crew is a named
   individual with traits you can name and remember. Drafting one should
   visibly change how matches play.
3. **Continuous play.** Walls keep the ball alive. A match is watchable end to
   end in 2–4 minutes with no dead time.
4. **The court is content.** Cage shape, size, and hazards are a primary source
   of variety between matches.
5. **Meaningful choices between matches.** Draft options should change sim
   behaviour, not add +1 to a stat.
6. **Readable at phone size.** If it can't be understood on a 6" screen, it's
   the wrong design.

## 4. Football rules in this game

Settled ruleset. These are sim rules, not flavour.

- **5 per side**, including keeper.
- **Walls are in play.** The ball rebounds off them. No out of bounds along the
  sides or ends, except where a goal is scored.
- **No offside.**
- **No throw-ins, corners, or goal kicks.**
- **Rush keeper.** The keeper is a fifth outfield player who may use hands
  inside their own area. They can leave the area and join the attack, leaving
  the goal empty — the futsal power play.
- **The ball is shootable from anywhere on the court.** Long-range shot accuracy
  must be modelled properly, because empty-net goals from distance are the cost
  side of the power play.
- Fouls, cards, and set pieces: **TBD** (see open questions).

### On flair
Street football style should be an **outcome you observe, not a stat you tune.**
Do not add a "Skill" or "Flair" attribute that makes tricks fire on a dice roll.
Build the sim on position, pressure, and decision-making, and express flair as
traits that bend those — a player who beats a marker more often in tight space,
one who rarely loses the ball against a wall. If a proposed mechanic can't be
expressed that way, push back on it.

## 5. Architecture rules (non-negotiable)

- **Hard separation between simulation and rendering.** The sim is pure logic
  and knows nothing about Canvas, DOM, or input. The renderer reads sim state
  and draws it. Must be possible to run a full match with no renderer attached.
- **Deterministic and seeded.** All randomness goes through a single seeded PRNG
  passed into the sim. Same seed + same inputs = same match, every time.
  Required for debugging, replays, and balance testing.
- **Fixed timestep tick.** The sim advances in fixed ticks (e.g. 30/s of sim
  time). Rendering interpolates. Never tie sim logic to frame rate or wall clock.
- **Sim speed decoupled from real time**, so a match can run at 1x, 4x, or
  instantly to a result.
- **Court is parameterised.** Dimensions, wall geometry, goal size, and team
  size are config values, not constants baked into the engine. Courts are data.
- **Wall collision is a first-class part of ball physics**, not an edge case
  bolted onto out-of-bounds handling.
- **Data-driven where possible.** Players, traits, upgrades, tactics defined as
  data, not hardcoded logic branches.
- **Pure functions for game rules.** Easy to test in isolation.

## 6. How I want you (Claude) to work with me

### Design first, code later
This is the default mode for this project.

- When I raise a new system, **start with the design conversation**: what it
  does, how it interacts with existing systems, 2–3 approaches with tradeoffs,
  your recommendation.
- **Do not write implementation code until I say we're settled on the design.**
  Pseudocode, type definitions, and data-shape sketches during design are fine
  and welcome.
- Once we agree on a design, write it into the decision log (section 9) before
  moving on.

### When we do write code
- Full, working files — not fragments I have to stitch together.
- TypeScript with real types. No `any` unless justified out loud.
- Comment the *why*, not the *what*.
- One system at a time. Don't refactor things I didn't ask about.

### Communication
- Be direct. If a design idea of mine is weak, say so and explain why — don't
  soften it into agreement.
- Answer first, elaborate after. Keep it short enough to read on a phone.
- Flag scope creep when you see it. This is a solo hobby project.
- Ask me a question when a decision genuinely hinges on it. Don't guess and
  build on the guess.
- I may write in Norwegian or English — answer in whichever I used.

### Don't
- Don't produce big code dumps unprompted.
- Don't add libraries without asking.
- Don't invent design decisions and present them as settled.
- Don't build features from section 10 until they move to section 9.

## 7. Domain vocabulary

Use these consistently.

| Term | Meaning |
|---|---|
| **Run** | One roguelike playthrough, from first match to death or victory |
| **Crew** | The player's current set of footballers in a run |
| **Match** | One simulated 5-a-side game |
| **Court** | The cage a match is played in — its shape, size, and hazards |
| **Tick** | One fixed step of simulation time |
| **Draft** | Post-match choice of upgrades, players, or perks |
| **Trait** | A modifier attached to a footballer that alters sim behaviour |
| **Tactic** | Crew-wide instruction affecting positioning and decision-making |

## 8. Current status

**Phase: skeleton.** Project scaffold exists (Vite + TS + Canvas 2D), with:

- `src/sim/` — pure sim logic, no DOM/Canvas imports. Seeded PRNG
  (`rng.ts`, pure state-in/state-out, no class mutation), a parameterised
  `CourtConfig`, ball-vs-wall physics with goal detection (`physics.ts`),
  and a fixed-timestep match loop (`match.ts`) with `tickMatch` (one tick)
  and `simulateMatch` (runs a whole match headless, proving sim/render
  separation).
- `src/render/` — `renderer.ts` draws `MatchState` to a Canvas 2D context
  (walls, goal mouths, ball, players as dots); `loop.ts` is an
  accumulator-driven fixed-timestep loop decoupling playback speed from
  wall-clock frame rate (1x/4x buttons wired in `main.ts`).
- Team size (5) and court dimensions are `MatchConfig`/`CourtConfig` data,
  not baked-in constants.

**Explicitly stubbed, not decided yet:** players are static dots at spawn
positions with no movement or decision-making — player model, attributes,
and tactics are open questions (section 10) and nothing here should be
read as settling them. No menus, crew screens, or draft UI exist. No
persistence yet.

## 9. Decision log

Settled decisions. Append here as we lock things in — decision plus the reason.
Never silently overturn something in this list; if it needs to change, call it
out explicitly.

- **Genre/format:** top-down, fully simulated football roguelike.
- **Platform:** mobile browser first.
- **Stack:** TypeScript + Vite + Canvas 2D, no engine. Chosen because a fully
  simulated match needs no twitch input, so a game engine would be fought
  rather than used.
- **5-a-side, not 11v11.** At eleven, a single drafted player is ~7% of the
  squad and barely felt; at five, each pick is a fifth of the crew and visibly
  changes matches. Trade-off accepted: loses formations (4-3-3 vs 3-5-2) as an
  expressive lever, so tactical depth must come from roles, traits, and courts
  instead.
- **Cage football with walls in play**, not futsal with lines. Removes
  stoppages, keeps matches continuous and short, and turns court geometry into
  a content lever. Rebound physics are cheap to simulate.
- **Rush keeper, expressed as two separate layers** rather than an
  aggressive/defensive setting:
  - **Tactic layer — a trigger condition for when the keeper pushes up**, not an
    on/off toggle. The player sets the condition; the sim decides the moment.
  - **Trait layer — what kind of keeper was drafted.** Good with feet vs good at
    shot-stopping. A sweeper-keeper makes the power play viable; a pure
    shot-stopper punishes attempting it.
  Rejected a simple aggressive/defensive slider because it is set once and
  forgotten, and one setting would dominate. The two-layer version makes the
  keeper draft constrain the tactics, which is the crew-shaping pressure a
  five-man squad needs.
- **Run structure: a season made of several cups**, with more cups becoming
  available the further the crew progresses. Each cup is short. Chosen over a
  single tournament because a four-match bracket gives only three drafts, which
  is too few for a crew to develop an identity; and over an abstract branching
  map because a cup circuit means something in football without needing to be
  explained. The choice of which cup to enter next is a primary risk/reward
  lever. **Constraint: a full season must still be finishable in one sitting**,
  so cups stay small — keep total matches per season in the 10–15 range, not 30.
- **Sim/render separation, seeded determinism, fixed timestep** — see section 5.
- **Team size and court geometry stay parameterised** even though 5-a-side is
  settled, so the engine can be tuned and tested at other sizes.

## 10. Open questions

Unresolved. Do not build against these until they're decided and moved to
section 9.

- **Cup shape:** matches per cup, and whether each cup has a group stage before
  knockout or is pure sudden death.
- **Loss condition:** losing a cup clearly can't end the season outright, or
  most runs die in the first cup. So what does a lost cup cost, and what
  eventually ends the run?
- **Cup access:** what gates which cups are available — results, standing,
  something else — and is the choice between cups a real risk/reward tradeoff
  (harder cup, better draft pool)?
- **Power play triggers:** the exact set of trigger conditions the player can
  choose from (never / losing late / losing at all / always — or something
  else), and whether the trigger set is itself draftable content.
- **Fouls and physicality:** are there fouls at all? cards? or is contact just
  part of street play?
- **Match length:** real minutes per match, and can the player skip to result?
- **Player agency during a match:** pause and re-tactic? limited "manager
  interventions"? or purely spectate?
- **Player model:** how many attributes, and how directly do they drive sim
  decisions?
- **Court hazards:** do courts get active hazards (pillars, slopes, wet
  concrete) or is variety purely geometric?
- **Meta-progression:** does anything carry between runs, or is it pure
  knowledge-based?
- **Art direction:** dots and shapes, or actual sprites?
- **Orientation:** portrait or landscape.

## 11. How to start a session

When I open a new chat in this project, check section 8 for where we are and
section 10 for what's undecided. If I'm vague about what I want to work on,
suggest the next thing that unblocks the most other decisions.
