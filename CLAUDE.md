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
| **Perk** | A passive, run-scoped modifier gained via a Draft; active for the rest of the season, lost when it ends. Unlike a Trait, not necessarily tied to one footballer |
| **Power-up** | An active, in-match manager ability, triggered live rather than drafted passively. Separate resource from Perks above |
| **Player Card** | A footballer pulled from a pack, with a rarity tier (Gray/Blue/Purple/Orange/Diamond) — see section 9 |

## 8. Current status

**Phase: skeleton.** Project scaffold exists (Vite + TS + Canvas 2D), with:

- `src/sim/` — pure sim logic, no DOM/Canvas imports. Seeded PRNG
  (`rng.ts`, pure state-in/state-out, no class mutation), a parameterised
  `CourtConfig`, ball-vs-wall physics with goal detection (`physics.ts`),
  and a fixed-timestep match loop (`match.ts`) with `tickMatch` (one tick)
  and `simulateMatch` (runs a whole match headless, proving sim/render
  separation).
  Players move and now play: `formation.ts` builds a role-based shape
  (keeper/back/forward, generic in team size) and computes each player's
  target slot, elastically shifted toward the ball; `movement.ts` steps
  every player toward their slot each tick at a pace-driven speed;
  `attributes.ts` rolls the seven settled attributes (placeholder range
  until packs/rarity exist to generate them properly); `touches.ts` finds
  whoever's within control range of a free ball (any player, either team —
  interceptions fall out for free) and, while the ball is held, gives a
  nearby opponent a Tackling-weighted chance to win it; `decision.ts` has
  the player in control choose shoot/pass/dribble via a utility score
  weighted by attributes, with Positioning-scaled noise, and executes it
  as a ball velocity. `saves.ts` gives a team's keeper a Goalkeeping-
  weighted chance to stop a shot heading at their own goal, run before
  `touches.ts` each tick; a save hands the keeper control the same way any
  touch does.
  `MatchConfig` now carries `durationSeconds` (60, ~1 real minute at 1x
  per the decision log) and `isMatchComplete` is a plain query on
  `MatchState` — `tickMatch` itself still has no notion of "done."
  `createMatch`/`simulateMatch` take an optional `homeAttributes` array
  (the sim's own `PlayerAttributes` type) so a meta-game Crew can supply
  the home team's stats; sim stays unaware Crew exists at all.
- `src/render/` — `renderer.ts` draws `MatchState` to a Canvas 2D context
  (walls, goal mouths, ball, players as blobs); `loop.ts` is an
  accumulator-driven fixed-timestep loop decoupling playback speed from
  wall-clock frame rate (1x/4x buttons wired in `main.ts`). Landscape,
  goals left/right.
- `src/meta/` — first vertical slice of the roguelike layer. `crew.ts`
  has a hand-authored 5-player `STARTER_CREW` (named, not rolled) feeding
  the sim's `PlayerAttributes`; `perks.ts` is a small hand-authored Perk
  pool applied crew-wide; `run.ts` is a thin `RunState` (crew + win/loss
  record) with no cups, currency, or persistence yet.
- `src/main.ts` now drives a real screen flow instead of loading straight
  into a match: home (crew list, "Start run") → match (existing sim/
  render, unchanged) → result → draft (pick 1 of 3 Perks) → next match,
  looping indefinitely. Verified end-to-end in-browser, no console errors.
- Team size (5) and court dimensions are `MatchConfig`/`CourtConfig` data,
  not baked-in constants; the formation builder is generic in team size too.

**Explicitly stubbed, not decided yet:** no cups/season structure yet —
the loop above is just "next match forever," not the settled two-legged-
tie cup shape. No packs, Market, rarity, or Player Cards — the crew is
one fixed hand-authored roster, no acquisition system. No persistence
(a page refresh loses the run). No rush-keeper behaviour (keeper never
pushes forward — waiting on the Tactic system). No fouls (tackling can
fail, but nothing stops play on a mistimed one yet). Tactics, power-ups,
and substitutions aren't built.

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
  players) and "most progress" carry over into the next run; in-season Perks
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
- **Perks and power-ups are two separate systems**, not the same thing under
  two names (an earlier log entry conflated them — corrected here). *(This
  entry originally named the passive modifier "Card"; renamed to "Perk" to
  stop colliding with Player Card, see below.)*
  - **Perk:** a passive, run-scoped modifier picked via Draft between
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
  skeleton phase, on top of everything else already sketched (Perks,
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

The following batch was called by Claude rather than negotiated line by
line, at explicit invitation ("take some liberties... we can adjust as we
go"). Recorded with the same weight as anything above — flag if any of
them land wrong, nothing here is precious.

- **Victory milestone trigger and reward.** Triggers on clearing a cup
  (winning the boss match) — reuses the existing cup structure instead of
  adding a new counter. Reward is a Pack, tier scaling with how many cups
  this run has cleared: 1st clear → Bronze, 2nd → Silver, 3rd+ → Gold. This
  was already implied (packs were confirmed as *the* milestone reward
  mechanism a few rounds back) — this just pins down when and at what tier.
- **Power-up mechanics.** A small fixed toolkit (2-3 power-ups) available
  from the start of every run — no separate unlock/acquisition system,
  deliberately, to avoid a fifth acquisition system stacked on
  packs/market/academy/scouting. Equip up to 2 per match. Each is
  single-use per match, not cooldown-based — matches run ~1 real minute, so
  a 10-second effect rarely has room to fire twice anyway. Triggering one
  does **not** pause the sim clock — it's a live, temporary modifier to sim
  parameters for its duration, keeping pillar 3 (continuous play) intact.
  Substitutions are a separate manager-mode category from power-ups:
  limited by bench size, not uses or cooldowns. Expanding the power-up
  roster via unlocks later is a fine future addition, not needed now.
- **Cup access.** After clearing a cup, the next choice is between 2-3
  cups that trade difficulty for reward (tougher opposition for a better
  pack tier or bonus). The gate is simply how many cups you've cleared
  this run — no separate reputation/standing stat to track. Delivers the
  risk/reward lever the original run-structure decision wanted, without a
  new resource.
- **Power play trigger presets.** A fixed list to start: Never / Losing
  late / Losing at any point / Always. Set as a pre-match tactic choice.
  Not draftable content yet — a fine stretch goal, not needed for the
  skeleton.
- **Player attributes: seven.** Pace, Shooting, Passing, Tackling,
  Positioning, Stamina, Goalkeeping. Kept small on purpose — pillar 6
  (readable at phone size) and section 4 (flair should come from traits
  bending these, not a hidden dice-roll stat). Goalkeeping earns a slot
  because rush-keeper means any of the five could end up covering the net,
  not just a designated starter — it's also how the already-settled
  sweeper-keeper-vs-shot-stopper trait layer actually gets expressed (high
  Passing+Pace+Goalkeeping vs. high Goalkeeping alone). Exact formulas
  mapping attributes to sim outcomes (shot accuracy curve, tackle win%,
  etc.) are implementation detail for later.
- **Initial court hazards: Pillars and Wet patches.** Pillars are fixed
  circular obstacles with wall-like rebound physics, placed mid-court. Wet
  patches are zones that reduce ball friction and/or player grip, raising
  stumble/foul chance. Slopes (a constant force vector biasing ball
  movement) are deferred — meaningfully harder physics to get right, not
  needed for a first pass.
- **"Most progress" concretely means:** the unlocked Player Card pool
  (every footballer ever acquired through any channel, whether or not
  they're in this run's 5) plus Market currency balance. Crew was already
  separately confirmed to carry over. Furthest cup/milestone reached is
  worth tracking as a stat even before it unlocks anything mechanical.
- **Orientation: landscape, goals left/right.** Portrait was tried first
  (court rotated vertically, goals top/bottom) but reverted after seeing a
  reference (a polished pixel-art football game, landscape, proper
  scoreboard chrome) that made clear the intended feel is landscape, closer
  to a broadcast-camera view of the pitch. **Explicitly overturning the
  earlier portrait decision, not layering on top of it.** No sim changes
  either time: `CourtConfig` and the goal-on-x-axis physics in
  `physics.ts` never moved; only `renderer.ts`'s `toScreen` mapping
  changed, and it's kept as a named function rather than inlined so
  flipping orientation again stays a small, contained change. Verified
  in-browser both ways.
  **Still open, not yet decided:** the reference's art fidelity (drawn
  pixel sprites, HUD chrome, crests) is a big step up from the current
  placeholder rendering. Recommended next step is a low-lift, no-new-assets
  version — small blocky pixel-style player silhouettes rendered at low
  internal resolution and scaled up crisp/pixelated, instead of the
  current wobbly blob polygons — with true drawn sprite sheets treated as
  a separate, bigger art pass later. Not yet confirmed.
- **Player movement/decision-making architecture: a hybrid.** Formation
  slots drive off-ball movement (cheap, deterministic, the natural hook
  for a future Tactic); a small utility-scored decision only runs for
  whoever's on or near the ball (shoot / pass to X / dribble, weighted by
  attributes and pressure). Chosen over two alternatives: full utility AI
  for all ten players every tick (most emergent, but risks a ball-chasing
  swarm and is hard to tune solo) and pure scripted FSM for everyone
  (cheapest, but reads as scripted — directly against pillar 1's "not
  scripted set pieces"). The hybrid puts the expensive/interesting
  reasoning exactly where a viewer's eye goes, without 10 agents doing
  full reasoning every tick.
  **Agreed build order:** formation slots first (players move without any
  ball skill yet), then on-ball decisions, then defensive
  pressing/tackling as a third pass. **All three layers are built** — see
  section 8 (`formation.ts`, `movement.ts`, `attributes.ts`, `decision.ts`,
  `touches.ts`).
  **Architecture note, in use throughout:** all decision noise (shoot/
  pass/dribble scoring, aim error, tackle rolls) threads through the same
  `rngState` already in `MatchState` rather than a fresh `Math.random()`
  — required by the seeded-determinism rule (section 5). `decideTouch` and
  `applyTouches` are pure state-in/state-out, same shape as the rest of
  the sim.
  **Tackling model:** while the ball is held (mid-dribble), the nearest
  opponent within tackle range gets a per-tick chance to win it, weighted
  by Tackling on both sides; a won tackle is resolved exactly like a fresh
  touch, so the same decision code handles both. A failed attempt just
  costs the try — no foul roll on a mistimed tackle yet, since the actual
  foul/free-kick restart isn't built. That's a natural next hook once it
  is, not something to bolt on here.
- **Goalkeeper saves.** Closes the gap the previous entry flagged: a shot
  no longer always scores just for beating the last outfield defender.
  Every tick, if the ball is heading at a team's own goal and within reach
  of their keeper (`saves.ts`, `SAVE_RADIUS` 2.2m), there's a per-tick
  save chance weighted by Goalkeeping and keeper-to-ball distance — closer
  shots easier to save, and the shrinking distance as the ball closes in
  means a straight-on shot gets several chances, not one roll. A save is
  not a special case: the keeper just takes control exactly like any
  other touch (`touches.ts`'s `resolveTouch`, exported and reused
  directly), so they immediately look to distribute using the same
  shoot/pass/dribble decision every other touch uses — which naturally
  reads as "catches it and throws it out," since a shoot attempt from
  right in front of their own goal scores near-zero. No special-casing.
  **This was called by Claude, not negotiated** ("the AI decides every
  decision from here" — noted at the top of this batch too), so recorded
  with the same "flag if it lands wrong" caveat as the earlier
  liberties-taken batch.
  **Verified:** ran `simulateMatch` headlessly across 8 different seeds
  before vs. after. Before: every seed was a double-digit rout (e.g.
  10-11, 6-11). After: every seed lands in a believable 0-5 goals per
  team range. Confirmed in-browser too, no runtime errors.
  **Still open:** no rush-keeper behaviour (leaving the goal to join
  attack) — the keeper's formation slot still just holds a tight line, it
  doesn't push out under any tactic trigger. That's the already-settled
  two-layer rush-keeper design (tactic trigger + trait) waiting on the
  Tactic system existing at all. Not needed for this pass.
- **Dribbling and player separation, fixed.** Playtesting the artifact
  build surfaced two real bugs, not polish: dribbling looked like ping
  pong (a "dribble" fired the ball almost all the way to the opponent's
  goal in one kick, and player movement had no idea a touch had happened
  — it just kept seeking the static formation slot, so nobody ever
  visibly carried the ball), and players from either team could end up
  standing in the exact same spot (each player's target was computed
  independently from role + ball position, with nothing stopping two
  targets from coinciding and nothing pushing players apart if they did).
  - **Carrying:** `decision.ts`'s dribble branch now pushes the ball only
    ~2.5m forward, not at goal. `BallState` gains `carrierId` (the
    currently-dribbling player, cleared on any shot/pass); `movement.ts`
    lets that one player run at the opponent's goal instead of holding
    formation while carrying, so the same player keeps catching back up
    to the ball they just nudged. Verified headlessly: longest sustained
    carry across a match went from effectively nothing to 4.5 real
    seconds, with a realistic mix of short and long spells.
  - **Separation:** `movement.ts` adds a same-team-and-opponents-agnostic
    separation pass after movement — a few relaxation iterations (cheap
    at 10 players) push any two players closer than 0.75m apart back
    toward that minimum. Verified headlessly: worst-case distance between
    any two players across a full match went from 0m (exact overlap) to
    0.75m.
  - Re-ran the 8-seed scoring sweep after both fixes: still a healthy
    football range (0-8 goals a side), no regression from the keeper fix.
- **Passing was effectively dead; fixed by giving all three on-ball
  actions a shared score baseline.** Flagged in the same playtesting pass
  ("it also needs to pass") — a headless action-mix check confirmed it:
  passing was 0-4% of touches, dribbling 81-100%. Root cause: pass score
  multiplied three fractions together (passing skill × forward progress ×
  range), each under 1, which crushed it to a fraction of dribble's simple
  additive score. Fixed in `decision.ts` by giving shoot/pass/dribble a
  **shared baseline + skill term**, with situational bonuses/penalties
  (goal proximity for shoot, forward progress and range for pass, a flat
  fallback bonus for dribble) doing the differentiating instead of the
  formula shape itself.
  **Iterated three times against a headless action-mix check before
  landing**, each version measured, not guessed:
  1. Multiplicative pass score: pass 0-4%, dribble 81-100%.
  2. Naive additive fix: overcorrected, pass 66-86%, dribble 9-21%.
  3. Shared baseline, first pass: shoot's proximity bonus zone (10m, on a
     20m pitch) was too generous with no blocking/angle model — shoot
     50%, dribble 1-5%.
  4. **Landed:** shrank the shoot bonus zone to 8m and rebalanced the
     dribble fallback bonus — dribble 16-24%, pass 41-45%, shoot 31-41%
     across 4 seeds. Re-verified scoring (0-7 goals a side) and the
     carrying/separation fixes above still hold (0.75m separation, 4.5-6s
     carry streaks) — no regressions from the rebalance.
  **Not modelled, flagged for whenever the power-play/rush-keeper system
  gets built:** no blocking or shot-angle awareness, so "good position to
  shoot from" is currently just raw distance to goal. Long-range shots are
  scoreable (never disqualified) but currently uncommon beyond ~8m — worth
  revisiting once empty-net-from-distance (the settled power-play cost)
  is actually in play, since that mechanic depends on long shots being a
  real, if low-percentage, option.
- **Meta-game vertical slice (Option B of three proposed).** Rather than
  building the data layer or the full screen set first, built the
  thinnest possible end-to-end loop — hardcoded crew, one match, one
  result, one perk draft, repeat — to prove the loop before investing in
  cups/packs/persistence. See section 8 for what exists (`src/meta/`,
  `main.ts`'s screen flow). Chosen over building data-first (types +
  persistence, nothing visible for a while) or screens-first (UI/UX
  settled early, but with fake data and rework risk once real data
  lands).
  **Match duration decided as part of this:** `MatchConfig.durationSeconds`
  is a real field now, set to 60 — literally realizing the "~1 real
  minute at 1x" decision from a few rounds back, which had been left as
  "implementation detail for later." `isMatchComplete` is a query on
  `MatchState`, not a special tick, so `tickMatch` stays a plain
  per-tick step with no notion of "done."
  **Flagged, not yet acted on:** the scoring balance (shoot/pass/dribble
  weights, save/tackle chances) was tuned and verified against a 240-
  second match window a few rounds back. At the real 60-second duration,
  a 10-seed headless check came back with 4 goalless (0-0) matches — the
  proportional drop tracks (60s is a quarter of 240s), but a ~40% chance
  of a scoreless match may undercut "watchable, no dead time" (pillar 3).
  Not touched further without a read on whether that's actually a
  problem, since it's a game-feel call, not a mechanical bug.

## 10. Open questions

Unresolved. Do not build against these until they're decided and moved to
section 9.

*(Empty for now — the previous batch was cleared out in one pass above.
Re-populate as new questions come up.)*

## 11. How to start a session

When I open a new chat in this project, check section 8 for where we are and
section 10 for what's undecided. If I'm vague about what I want to work on,
suggest the next thing that unblocks the most other decisions.
