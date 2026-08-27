# Handleliste

Delt handleliste + middagsplanlegger for to personer. Vite + TypeScript +
Supabase (Postgres + realtime). Ingen rammeverk, mobil først.

Ligger i egen mappe med eget `package.json` — helt adskilt fra
fotballspillet i rotmappa.

## Kom i gang

1. Lag et gratis prosjekt på [supabase.com](https://supabase.com).
2. SQL Editor → kjør `supabase/01_schema.sql`, deretter `supabase/02_seed_meals.sql`.
3. `cp .env.example .env` og fyll inn URL + anon key fra Project Settings → API.
4. `npm install && npm run dev`

## Datamodell

Fire tabeller. `meals` + `meal_ingredients` er oppskriftene (leses, endres
sjelden). `shopping_list_items` er selve lista (endres hele tiden, har
realtime på seg). `week_plan_items` er ukemenyen.

### `meals`
| kolonne | type | hva |
|---|---|---|
| `id` | uuid | pk |
| `name` | text unik | "Fiskegrateng" |
| `emoji` | text | ikon i lista |
| `description` | text | én linje |
| `servings` | smallint | porsjoner oppskriften er skrevet for |
| `steps` | text[] | 3-5 korte tilberedningssteg |
| `tags` | text[] | "rask", "fredag", "ovn" — til filtrering senere |

### `meal_ingredients`
| kolonne | type | hva |
|---|---|---|
| `id` | uuid | pk |
| `meal_id` | uuid | → `meals.id`, cascade delete |
| `name` | text | vises som skrevet: "Crème fraîche" |
| `normalized_name` | text | nøkkel for sammenslåing: `creme fraiche` |
| `amount` | numeric, kan være null | null = "etter smak" |
| `unit` | text, kan være null | `g` `kg` `dl` `l` `ml` `ss` `ts` `stk` `pk` `boks` `pose` `fedd` |
| `category` | text | butikk-seksjon, se under |
| `sort_order` | smallint | rekkefølge i oppskriften |

### `shopping_list_items`
| kolonne | type | hva |
|---|---|---|
| `id` | uuid | pk |
| `name` | text | "Helmelk" |
| `normalized_name` | text, **unik indeks** | `helmelk` — dette er garantien mot duplikat-rader |
| `quantities` | jsonb | `[{"amount":5,"unit":"dl"}]` |
| `category` | text | butikk-seksjon |
| `checked` | boolean | huket av i butikken; raden blir stående, bare gråtonet |
| `source_meals` | text[] | `{Lasagne,Fiskesuppe}` — vises som "fra Lasagne, Fiskesuppe". Tom = lagt inn manuelt |
| `note` | text | fritekst, f.eks. "den billige" |
| `created_at` / `updated_at` | timestamptz | `updated_at` settes av trigger |

### `week_plan_items`
| kolonne | type | hva |
|---|---|---|
| `meal_id` | uuid unik | → `meals.id` |
| `added_to_list` | boolean | om middagen alt er lagt til handlelista |

Kategorier: `grønt` `kjøtt` `fisk` `meieri` `tørrvarer` `frys` `bakeri` `annet`.

## Hvordan sammenslåingen virker

Kjernekravet: to middager som bruker helmelk skal gi **én** linje.

**1. Navn → nøkkel.** `normalize(name)`: små bokstaver, trim, kollaps
mellomrom, fjern bindestreker/punktum, fjern aksenter (`crème` → `creme`),
og til slutt slå opp i en synonymtabell. Synonymtabellen er den som gjør
"H-melk" og "helmelk" til samme vare:

```
hmelk | hmelk 3 | helmelk 3      -> helmelk
lettmelk 1 | lettmelk 05         -> lettmelk
kremfløte | pisk fløte           -> flote
hakkede tomater | knuste tomater -> hermetiske tomater
...
```

Den er en ren datatabell i klienten, lett å utvide når dere oppdager en
variant som ikke matcher.

**2. Mengde → felles enhet.** Enheter grupperes i dimensjoner:

| dimensjon | basisenhet | omregning |
|---|---|---|
| vekt | g | kg = 1000, hg = 100 |
| volum | ml | l = 1000, dl = 100, ss = 15, ts = 5 |
| antall | stk | — |
| øvrige (`pk`, `boks`, `pose`, `fedd`) | seg selv | summeres bare med seg selv |

Samme dimensjon → summeres. `3 dl + 2 dl = 5 dl`. `500 g + 1 kg = 1,5 kg`.

**3. Visningsenhet.** Brukte alle bidragene samme enhet, beholdes den
(`2 ss + 1 ss = 3 ss`, ikke `45 ml`). Ellers velges største enhet i
stigen der tallet blir ≥ 1: `1500 g → 1,5 kg`, `300 ml → 3 dl`, `15 ml → 15 ml`.

**4. Når det ikke går opp.** Ulike dimensjoner slås ikke sammen, men havner
som flere elementer i `quantities` på **samme rad**, og vises som
`Helmelk — 3 dl + 2 boks`. Aldri to rader for samme vare.

**5. Mengde uten tall.** `amount = null` ("etter smak") legger seg på lista
uten mengde og blokkerer ikke sammenslåing av de andre bidragene.

Sammenslåingen skjer i klienten: les eksisterende rad på `normalized_name`,
slå sammen, skriv tilbake. Den unike indeksen er sikkerhetsnettet — hvis
dere skulle treffe samtidig, feiler den ene innsettingen og prøver på nytt
mot raden som nå finnes.

## Realtime

`shopping_list_items` og `week_plan_items` ligger i `supabase_realtime`.
Klienten abonnerer på alle endringer og oppdaterer lokal state. `meals`
er ikke med — oppskrifter endres ikke mens dere står i butikken, de hentes
én gang ved oppstart.

## Sikkerhet — verdt å vite

Appen har **ingen innlogging**. Den bruker Supabase sin anon-nøkkel, og den
nøkkelen ligger i JS-bundelen som lastes ned til telefonen. RLS-policyene
gir `anon` full lese- og skrivetilgang. I praksis: den som finner URL-en til
appen kan lese og endre handlelista deres.

For en handleliste for to er det en helt grei avveining, og det er derfor
det er satt opp sånn. Men det er en reell åpning, ikke noe jeg har gjemt
bort. Vil du stramme det til er magic-link-innlogging (Supabase Auth,
e-post uten passord) den enkleste veien: policyene byttes fra `to anon` til
`to authenticated`, og dere logger inn én gang per telefon.
