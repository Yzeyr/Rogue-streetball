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
| **Card** *(rename pending — see open questions)* | A passive, run-scoped modifier gained via a Draft; active for the rest of the season, lost when it ends. Unlike a Trait, not necessarily tied to one footballer |
| **Power-up** | An active, in-match manager ability, triggered live rather than drafted passively. Separate resource from the passive Card above |
| **Player Card** | A footballer pulled from a pack, with a rarity tier (Gray/Blue/Purple/Orange/Diamond) — see section 9 |

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
  lever.
  **Superseded below:** the "must fit in one sitting, 10–15 matches" cap this
  bullet originally carried is gone — see the "season length is now open-ended"
  entry.
- **Sim/render separation, seeded determinism, fixed timestep** — see section 5.
- **Team size and court geometry stay parameterised** even though 5-a-side is
  settled, so the engine can be tuned and tested at other sizes.
- **Match viewing:** real-time playback, a 3x fast-forward, or skip straight to
  the result. A match takes roughly **1 real minute** to watch at normal
  speed (revised down from an earlier "~2 minutes" guess).
- **In-match player agency: manager mode, not spectate-only.** The player can
  pause, adjust tactics, and substitute players during a match. Resolves the
  "player agency" open question in favour of active management over the
  course of a match, not just between them.
- **Court hazards are in scope.** Specific hazard types (pillars, slopes, wet
  patches, etc.) are still undecided.
- **Art direction: rough "blob" player shapes**, not clean dots and not
  detailed sprites — a deliberately crude, hand-drawn-looking silhouette.
  Implemented in `renderer.ts` as a wobbly polygon shaped by a hash of the
  player's id, so each blob's wobble is stable across renders.
- **Cup loss ends the run outright**, not just the cup. Crew (the five
  players) and "most progress" carry over into the next run; in-season Cards
  (see below) earned during that run do not.
- **Cup shape:** 5 rounds per cup. Rounds 1-4 are two-legged aggregate ties
  (Champions League style), each leg played on a different team's home
  court — otherwise two legs are just the same match played twice, so this
  is what makes the format earn its place, and it ties the tie-format
  decision back into the court-is-content pillar. Round 5 is a single "boss"
  match. Pure knockout throughout — no group stage, lose a tie (or the boss)
  and you're out of the cup. Tie-break if level on aggregate: sudden death,
  next goal wins — chosen over a penalty shootout to keep the "ball always
  live" rule intact through the tie-break too.
- **Season length is open-ended: cups chain indefinitely, and a season only
  ends when the crew loses one.** There is no fixed match-count cap and no
  other win condition.
  **This explicitly overturns** the earlier "10–15 matches, finishable in one
  sitting" constraint on the run-structure bullet above — that constraint no
  longer holds as written. "Finishable in one sitting" is not enforced by a
  match cap anymore; it'll have to come from something else (skip-to-result,
  fast drafts, escalating difficulty naturally ending most runs) if it's
  still a goal at all.
- **Victory exists, but as a milestone, not a run-ending state.** "Continuing
  to play is the ultimate victory" — the season still only *ends* on a loss
  (no fixed finish line). But hitting a milestone (exact trigger TBD — likely
  clearing a cup, or every N cups) counts as a victory and banks something
  extra into meta-progression to carry into the *next* season, on top of
  whatever the crew/"most progress" baseline already carries over. Resolves
  the section 7 tension flagged previously: a Run still ends only in death,
  but "victory" is decoupled from run-ending and is now a checkpoint reward
  instead. Section 7's Run definition should be reworded to match — not yet
  done, wording depends on what a milestone reward actually is (see open
  questions).
- **Cards and power-ups are two separate systems**, not the same thing under
  two names (an earlier log entry conflated them — corrected here):
  - **Card:** a passive, run-scoped modifier picked via Draft between
    matches (e.g. +tackle win%, +shot accuracy, +stamina, up to "wilder"
    non-stat effects). Stays active for the rest of the season, lost when
    the season ends. Distinct from a **Trait**, which is permanent and tied
    to one footballer, not the run.
  - **Power-up:** an active, in-match manager ability — e.g. "press a button,
    team runs at 2x speed for the next 10 seconds." Triggered live during a
    match rather than passively drafted. How power-ups are earned, how many
    per match, and whether they're limited-use/cooldown-based is still open.
- **Fouls exist, stop play, and have no disciplinary cards** (no bookings,
  no sendings-off) — a foul is a dead-ball restart (free kick), not a live
  knockdown/turnover. **The restart is quick** — confirmed: ball respawns at
  the foul spot and resumes almost immediately, no real-time pause or
  animation, so it doesn't meaningfully eat into the ~1-minute watch time.
- **New crew members come from packs, opened with the victory-milestone
  reward** (closes part of the "what does a milestone bank" open question).
  **Packs are fully random** — confirmed, overriding an earlier recommendation
  toward a revealed choice-of-N. A pack reveals **3 Player Cards**, all
  received, none picked among. Naming settled: a pulled footballer is a
  **Player Card**, added to the vocab table.
  **Note on pillar 5:** a blind pull is a step away from "draft choices
  should be meaningful, not a stat roll" — flagging once since it's a
  real tension, not re-litigating it since the call's been made.
- **Duplicate Player Card pulls convert into Market currency** (confirmed) —
  closes the loop between blind packs and the deliberate-choice Market
  channel: a dupe isn't wasted, it funds targeting a specific player instead.
- **Additional player-acquisition channels, confirmed in scope: Market,
  Youth Academy, Scouting**, alongside packs. Roles implied but not yet
  specified: Market likely a currency spend on a specific, known player
  (the deliberate-choice counterpart to blind packs); Youth Academy likely
  slow-burn generation of new players over time; Scouting likely another
  targeted-discovery channel.
  **Scope flag:** four parallel acquisition systems (packs, market, academy,
  scouting) is a lot of surface for a solo hobby project still in the
  skeleton phase, on top of everything else already sketched (Cards,
  Power-ups, Traits, Tactics, hazards, fouls, two-legged ties...).
  Recommend designing and building packs first — it's the one with the
  clearest shape — and treating the other three as a later pass once packs
  prove out, rather than speccing all four now. Not yet confirmed.
- **Player rarity tiers, confirmed:** Gray (common) → Blue (rare) → Purple
  (epic) → Orange (legendary) → Diamond/sparkly (icon). This is the rarity
  of an individual Player Card pulled from a pack — separate from a pack's
  own tier (Bronze/Silver/...).
- **Pack tier gates the rarity ceiling** (confirmed — resolves the earlier
  "gate vs weight" open question in favour of gate):
  - **Bronze** → ceiling Epic. Possible pulls: Gray, Blue, Purple.
  - **Silver** → ceiling Legendary. Possible pulls: Gray, Blue, Purple, Orange.
  - **Gold** → can reach Icon, at roughly 1-in-1000 odds. Possible pulls: all
    five tiers.
  Exact odds within a tier (e.g. Bronze's Gray:Blue:Purple split) are a later
  balance detail, not blocking.
- **Rarity grants both higher potential stats and a specialised trait**
  (confirmed — resolves the earlier "stat power vs. trait novelty" open
  question: it's both, not either/or). A higher-rarity pull rolls from a
  higher stat-potential band *and* is more likely to carry a trait that
  makes it exceptional at one specific thing — shooting, ball retention
  under pressure, passing, etc.
  **Calling out explicitly, not smoothing over:** this embraces real power
  progression (a rarer pull is a genuinely better player, not just a
  different one), which is a firmer stance than the "rarity = build
  variety, not raw power" lean I'd floated last round — that lean is
  superseded. The traits themselves still fit section 4's rule (expressed
  as "better at X," same shape as the wall-retention/tight-space examples
  already in that section), so no conflict there. The thing worth watching
  as the player pool grows via packs/market/academy/scouting: pillar 2 wants
  every crew member to stay a name-and-remember pick, and a growing pool
  will naturally bench the weaker early pulls — presumably that's the
  intended squad-building loop (more players unlocked over time than the 5
  that start), not a problem, but worth confirming that's the intent rather
  than assuming.

## 10. Open questions

Unresolved. Do not build against these until they're decided and moved to
section 9.

- **Victory milestone: what exactly triggers it, and what does it bank?**
  Confirmed as a checkpoint concept (see section 9), not a run-ending state —
  but the trigger (every cup? every N cups? something else) and the reward
  (currency, a permanent unlock, a starting bonus next season) are both
  still undefined. Section 7's Run definition needs rewording to match once
  this lands.
- **Power-ups need their own design pass.** Confirmed separate from Cards
  (section 9) and confirmed as manager-triggered live abilities (e.g. "2x
  speed for 10 seconds"), but: how are they earned/equipped before a match,
  how many available per match, limited-use or cooldown-based, does
  triggering one pause the sim clock or run alongside it, and how does it
  relate to substitutions (same "manager button" category, or different)?
- **Naming collision, still open — one more round needed.** Pack pulls are
  now settled as **Player Card**, which is unambiguous. What's still
  unsettled is the *other* one: the passive run-scoped modifier (+tackle
  win%, +stamina, etc, drafted between matches) is currently still named
  **Card** in the vocab table, which reads as a collision with Player Card.
  I'd previously (sloppily) called that passive modifier "the power-up" when
  asking about a rename — but **Power-up** is already the settled name for
  a *different*, separate thing (the live, in-match manager ability, e.g.
  "2x speed for 10 seconds"). Renaming the passive modifier to "Power-up"
  too would recreate the same one-name-two-things problem, just shifted.
  Need a distinct third name for the passive modifier — **Perk** is my
  suggestion, but any name that isn't Card or Power-up works.
- **Cup access:** what gates which cups are available — results, standing,
  something else — and is the choice between cups a real risk/reward tradeoff
  (harder cup, better draft pool)?
- **Power play triggers:** the exact set of trigger conditions the player can
  choose from (never / losing late / losing at all / always — or something
  else), and whether the trigger set is itself draftable content.
- **Player model:** how many attributes, and how directly do they drive sim
  decisions?
- **Which court hazards, specifically** — pillars, slopes, wet patches,
  something else — and how each affects ball/player physics.
- **Meta-progression specifics.** Confirmed something carries between runs
  (crew, "most progress"); not yet specified what "most progress" concretely
  includes.
- **Orientation:** portrait or landscape.

## 11. How to start a session

When I open a new chat in this project, check section 8 for where we are and
section 10 for what's undecided. If I'm vague about what I want to work on,
suggest the next thing that unblocks the most other decisions.
