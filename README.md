# Handoff: Familiens Læseraket (family reading-goal app)

## Overview
A single-page app for one family (Marie, Jacob, Alfred, Hugo) tracking pages read from **1 Aug 2026 to 1 Aug 2027**. Shared goal: **20,000 pages** (family) / **5,000 pages** per person. Members log finished books; an animated rocket travels along a track toward a prize planet as the family total grows. Milestones (25/50/75/100%) trigger confetti + sound; reaching 100% reveals the family's self-chosen prize. All UI copy is Danish — keep strings verbatim as listed below.

## About the Design Files
The bundled `Familiens Læseraket.dc.html` is a **design reference created in HTML** — a working prototype showing intended look and behavior, not production code to copy directly. Recreate it in the target codebase's environment (React, Vue, Svelte, etc.) using its established patterns. If no codebase exists, a small client-only React or Svelte app with localStorage persistence is appropriate; no backend is required (single-device use is accepted by the family — optional future work: sync via a tiny backend).

The file is a self-opening Design Component: markup lives between `<x-dc>` tags with `{{ hole }}` bindings; logic is a `class Component` in the `data-dc-script` block. Read it as spec: inline styles = exact styling; `renderVals()` = derived state and handlers.

## Fidelity
**High-fidelity.** Colors, typography, spacing, copy, animation timings, and sounds are final. Recreate pixel-perfectly.

## Screens / Views

### 1. Forside (home) — default view
Desktop-first, max-width 1180px centered, padding 26px 32px 64px. Page background: `linear-gradient(180deg,#070B1E 0%,#0B1026 45%,#1B2450 100%)`, min-height 100vh. Behind content: ~110 white twinkling stars (1–3.2px circles, random position, `twinkle` 2–5s ease-in-out infinite, random negative delay). A full-viewport `<canvas>` (fixed, pointer-events:none, z-60) renders confetti.

**Header row** (flex, space-between):
- Title "Familiens Læseraket" — Fredoka 600, 27px. Sub-line "1. august 2026 → 1. august 2027" — 14px `#93A0C9`.
- Right: tab pills "Forside" / "Statistik" (padding 9px 18px, radius 999, Fredoka 500 15px; active: bg `rgba(255,255,255,.1)`, border `rgba(255,255,255,.18)`, text `#EAF0FF`; inactive: transparent, text `#93A0C9`) + round sound-toggle button 40px (🔊/🔇, border `rgba(255,255,255,.14)`, bg `rgba(255,255,255,.05)`).

**Counter block** (centered, margin-top 42px):
- Family total — Fredoka 700, 88px, `text-shadow: 0 0 44px rgba(255,107,53,.3)`. Animated count-up (see Interactions). Danish thousands format ("1.234").
- Sub-line: `af 20.000 sider · X % af målet` — 17px `#93A0C9` (one decimal, Danish comma).
- Three chips (radius 999, 13.5px, weight 700, padding 7px 14px):
  - Pace: ahead → `N sider foran planen` (bg `rgba(92,224,138,.13)`, text `#7DE8A4`, border `rgba(92,224,138,.35)`); behind → `N sider efter planen` (bg `rgba(255,201,77,.12)`, text `#FFD97A`, border `rgba(255,201,77,.35)`).
  - `Dag N af 365` and `≈ N sider om dagen herfra` — neutral (bg `rgba(255,255,255,.06)`, text `#93A0C9`, border `rgba(255,255,255,.12)`).
- Empty state (0 books): `Endnu ingen bøger i loggen — tast den første og send raketten afsted.` 15px `#B9C3E6`.

**Rocket track** (relative, height 216px, margin-top 40px). Track coordinate system: usable span runs from 70px (left) to 86px from the right edge; position = `calc(70px + (100% - 156px) * progress)`.
- Dashed baseline at top 106px: `repeating-linear-gradient(90deg, rgba(255,255,255,.22) 0 10px, transparent 10px 24px)`, 3px tall, animated `background-position-x` −24px per 1.7s (marching dashes).
- Progress fill on top of it: 5px, radius 4, `linear-gradient(90deg, rgba(255,107,53,.15), #FF6B35)`, glow `0 0 14px rgba(255,107,53,.55)`, width `calc((100% - 156px) * progress)`, `transition: width 1.2s cubic-bezier(.22,1,.36,1)`.
- Start planet (left 28px): 52px circle `radial-gradient(circle at 35% 30%, #7DE8A4, #2E9E6B 55%, #1C5E45)`; label "Start / 1. aug 2026" 12px `#93A0C9`.
- Milestone markers at 25/50/75%: 16px dot; unreached: bg `#141B3C`, border 2px `rgba(255,255,255,.25)`; reached: bg/border `#FFC94D` + glow `0 0 12px rgba(255,201,77,.7)`, transition .6s. Labels: page count ("5.000", weight 700, 12.5px `#93A0C9`) and percent ("25 %", 11px `#5B6693`).
- Goal planet (right 20px): 78px circle `radial-gradient(circle at 35% 30%, #B79CFF, #7C5CFF 55%, #4630A8)` with pulsing glow (`box-shadow` 18px→34px `rgba(124,92,255,.35→.6)`, 3.2s loop) and an elliptical ring (112×28px, border 3px `rgba(255,255,255,.28)`, rotate −16°). Flag on top: 3×26px white pole + orange triangle (clip-path `polygon(0 0,100% 50%,0 100%)`, 24×15px).
- Prize label under planet: "PRÆMIEN" (11px, uppercase, letter-spacing .1em, `#93A0C9`), then a dashed pill button showing the saved prize or `Vælg præmien` (Fredoka 500 14px, text `#FFC94D`, border 1px dashed `rgba(255,255,255,.28)`; hover border `#FFC94D`). Click → swaps to an inline text input (see Interactions).
- **Rocket** at `left: track(progress)` (top 68px, margin-left −14px, z-5, `transition: left 1.2s cubic-bezier(.22,1,.36,1)`), bobbing ±4–5px (3.4s ease-in-out loop). SVG 110×76 (see Assets) with flickering flame: flame group scales X 1→0.5 / Y 1→0.72 every .26s, transform-origin at nozzle (16,38). Drop-shadow `0 8px 18px rgba(255,107,53,.35)`.
- Flyer toast on add: `+N sider` appears above the rocket (Fredoka 600 19px `#FFC94D`), floats up 56–68px while fading over 1.7s, then unmounts (1.8s timeout).
- Under track, centered: `N sider tilbage til præmien` (or `Målet er nået — præmien er jeres!`) 14.5px `#93A0C9`.

**Person cards** — grid `repeat(4, minmax(0,1fr))`, gap 16, margin-top 44. Card: bg `rgba(255,255,255,.045)`, border 1px `rgba(255,255,255,.09)`, radius 20, padding 18.
- Avatar 44px circle in member color, initial letter (Fredoka 600 20px, text `#0B1026`).
- Name Fredoka 600 18px; below `N bøger` 13px `#93A0C9` (singular "bog").
- Pages: Fredoka 600 25px + `/ 5.000 sider` (13px `#93A0C9`).
- Progress bar: 8px track `rgba(255,255,255,.08)` radius 999; fill in member color, glow `0 0 10px {color}66`, width = pages/5000 capped 100%, transition 1.2s.
- Badge row (6 items, 30×30, radius 9, 15px emoji): earned → bg `rgba(255,255,255,.1)`, border `rgba(255,255,255,.22)`, full color; unearned → opacity .28, grayscale, bg `rgba(255,255,255,.03)`. Tooltip via `title`. Badges: 🚀 Første bog (≥1 book) · 📚 5 bøger · 🌙 1.000 sider · ⭐ 2.500 sider · 🐘 En bog på 300+ sider (any single book ≥300p) · 🏆 Personligt mål nået: 5.000 sider.

**Bottom grid** — `minmax(0,5fr) minmax(0,4fr)`, gap 24, margin-top 44. Same card styling, padding 24.

*Left — "Ny bog læst?" form.* Sub: `Siderne skubber raketten mod præmien.` (14px `#93A0C9`).
- Section label `HVEM HAR LÆST DEN?` (12px, uppercase, ls .09em, 700, `#93A0C9`).
- Reader pills: dot (9px, member color) + name; unselected bg `rgba(255,255,255,.05)` border `rgba(255,255,255,.14)`; selected: bg = member color, text/dot `#0B1026`, transition .18s.
- Inputs (2-col grid, gap 12): Titel (full width) · Forfatter (valgfri) · Sidetal (number, min 1; nested grid `minmax(110px,1fr) minmax(150px,1.2fr)` with date) · Færdig den (date, default today) · emoji row (`Hvad synes du?` — options 🤩 😍 😂 😭 😱 🥱; selected: border/bg orange tint + scale 1.12) · Kommentar (valgfri). Input style: bg `rgba(255,255,255,.06)`, border 1px `rgba(255,255,255,.14)`, radius 12, padding 12px 14px, 15px; focus: border `#FF6B35` + ring `0 0 0 3px rgba(255,107,53,.18)`. Placeholders: "Fx Mumitroldene og den store oversvømmelse", "Tove Jansson", "180", "Den bedste bog i år!". Placeholder color `rgba(234,240,255,.35)`. Dark `color-scheme`.
- Submit: full-width, `Send siderne afsted`, bg `linear-gradient(135deg,#FF6B35,#FF8E53)`, radius 14, padding 16, Fredoka 600 18px, text `#1B0E06`, shadow `0 6px 22px rgba(255,107,53,.35)`; hover lifts −2px with stronger shadow; disabled (missing title/reader/pages) opacity .35, no shadow. Enter in title/pages/comment submits.

*Right — "Logbog".* Header row with count `N bøger · N sider` (13px `#93A0C9`). List (max-height 560, scroll) sorted by date desc. Row (hover bg `rgba(255,255,255,.05)`, radius 14, padding 12px 10px): emoji 24px · title 700 15.5px + `· Forfatter` (`#93A0C9`) · reader chip (pill, bg `{color}22`, text member color, 12px 700) + date `11. aug` (13px `#93A0C9`) · optional italic comment in quotes (13.5px `#B9C3E6`) · right column `+N` pages (Fredoka 600 `#FFC94D`) over a ✕ delete button (`#5B6693`, hover `#FF8A5C`; native confirm `Slet "Titel"?`). Empty state: `Her lander bøgerne, når I taster dem ind. Den første venter på jer.`

### 2. Statistik view
Same header; 2-col grid (gap 24), third card spans full width.
- **Sider pr. person**: horizontal bars — name (64px, 700), 14px track `rgba(255,255,255,.08)` radius 999, fill = member color + glow, width relative to max person; value right-aligned (Fredoka 600 15px).
- **Nøgletal** rows (label `#93A0C9` left, bold value right, divider `rgba(255,255,255,.07)`): Bøger i alt · Sider i alt · Snit pr. bog · Tykkeste bog ("Titel · N sider") · Flittigste læser ("Navn · N sider"); "—" when empty.
- **Sider pr. måned**: 12 columns Aug…Jul (labels 12px `#93A0C9`), bars max-width 46px, height ∝ pages (max 130px, min 8px; 3px `rgba(255,255,255,.08)` stub when 0), fill `linear-gradient(180deg,#FF8E53,#FF6B35)`, radius 6 6 3 3, value above in `#FFC94D` 11.5px 700, height transition .8s.

### 3. Goal overlay (100%)
Fixed, z-80, bg `rgba(4,6,18,.82)` + `backdrop-filter: blur(6px)`; click outside closes. Card: `linear-gradient(180deg,#141B3C,#0B1026)`, border `rgba(255,255,255,.15)`, radius 28, padding 52px 64px, max-width 520, pop-in `scale(.75)→1` .5s `cubic-bezier(.22,1,.36,1)`. Content: 🎉 60px · `MÅLET ER NÅET!` Fredoka 700 42px · `20.000 sider læst som familie. Vildt godt gået, Marie, Jacob, Alfred og Hugo.` · label `PRÆMIEN ER JERES` · prize (Fredoka 600 27px `#FFC94D`) · button `Fejr videre` (orange gradient as submit).

## Interactions & Behavior
- **Add book** (valid = non-empty title + reader + pages ≥ 1): append entry, persist, clear form (emoji resets 🤩, date resets today). Counter counts up old→new over 1300ms ease-out-cubic; rocket/fill/bars transition 1.2s `cubic-bezier(.22,1,.36,1)`; flyer toast; "whoosh" sound; after 900ms a confetti burst (~60 particles) at the rocket's new position.
- **Milestones**: crossing 25/50/75/100% of 20,000 (first time only — persist celebrated list): bigger burst (~220), fanfare arpeggio (C5 E5 G5 C6 triangle notes, 120ms apart). At 100%: goal overlay + ~320-particle storm + extended fanfare (adds E6).
- **Confetti**: canvas particles; colors `#FF6B35 #FFC94D #FF7AC3 #6FB4FF #5CE08A #FFFFFF`; radial velocity 3–10, upward bias, gravity .22, slight rotation, alpha fade ~1.2–2s; rAF loop only while particles alive; scale by devicePixelRatio.
- **Sounds**: Web Audio oscillators, no assets. Whoosh = sine 160→900Hz .5s + triangle 90→500Hz, exp gain envelope ~.15 peak. Mute toggle persisted; audio context resumed on first gesture.
- **Prize edit**: dashed pill → inline input (autofocus, placeholder "Fx en tur i Tivoli"); Enter or blur saves + persists; shown in goal overlay.
- **Delete book**: confirm dialog; totals/bars/counter animate down.
- **Pace math**: `expected = 20000 × clamp((now − 2026-08-01)/(2027-08-01 − 2026-08-01), 0, 1)`; diff rounded → foran/efter chip. `Dag N af 365` (clamped 1–365). Daily need = `ceil((20000 − total)/daysLeft)`.
- **Load**: counter counts 0→total; fill/rocket animate from 0 via CSS transition on first data render.

## State Management
Client-only. localStorage key `familielaeseraket-2026`:
```json
{
  "books": [{ "id": 1723372800000, "t": "Titel", "a": "Forfatter", "p": 180,
              "r": "marie|jacob|alfred|hugo", "e": "🤩", "c": "kommentar", "d": "2026-08-11" }],
  "prize": "string",
  "celebrated": [25, 50],
  "muted": false
}
```
Ephemeral UI state: view (home/stats), form fields, animated display total, prize-edit flag/draft, flyer toast, overlay flag. All aggregates (per-person totals, badges, pace, monthly buckets) derived from `books`. Guard JSON.parse; never wipe the key.

## Design Tokens
- **Colors**: bg gradient `#070B1E → #0B1026 → #1B2450`; ink `#EAF0FF`; muted `#93A0C9`; faint `#5B6693`; soft `#B9C3E6`; accent `#FF6B35` (gradient partner `#FF8E53`, dark text-on-accent `#1B0E06`); highlight `#FFC94D`; success `#7DE8A4`; card bg `rgba(255,255,255,.045)`; card border `rgba(255,255,255,.09)`; goal planet `#B79CFF/#7C5CFF/#4630A8`; start planet `#7DE8A4/#2E9E6B/#1C5E45`. Members: Marie `#FF7AC3`, Jacob `#6FB4FF`, Alfred `#FFC94D`, Hugo `#5CE08A`. Links `#FF8A5C` (hover `#FFB08A`).
- **Type**: Fredoka (400–700) for headings/numbers/buttons; Atkinson Hyperlegible (400/700 + italic) for body. Scale: 88 / 42 / 27 / 25 / 21–20 / 18 / 15–17 body / 13–14 meta / 11–12 labels.
- **Spacing**: section gaps 36–44; card padding 18–24; grid gaps 12–24; chip padding 7×14.
- **Radius**: cards 20, inputs 12, buttons 14, pills/bars 999, overlay 28.
- **Motion**: primary easing `cubic-bezier(.22,1,.36,1)`; progress moves 1.2s; count-up 1.3s; bob 3.4s; flame .26s; twinkle 2–5s; dashes 1.7s; pop-in .5s.
- **Configurable**: familyGoal 20000, personGoal 5000, showBadges — keep as constants/settings.

## Assets
- Google Fonts: Fredoka, Atkinson Hyperlegible (linked, no files).
- Rocket: inline SVG (110×76) built in-file — hull path with `linearGradient` white→`#C2CDEE`, orange nose cone + swept fins (gradient `#FF8E53→#E8531C`), nozzle `#8E9BC4`, porthole (`#8E9BC4` ring, `#5FA8E8` glass, highlight dot), orange stripe, two-layer flame (`#FFC94D` outer / `#FF6B35` inner + glow ellipse). Copy paths verbatim from the HTML.
- Planets/flag/stars: pure CSS. Emoji glyphs are content (reactions, badges, 🔊/🎉) — system emoji font.
- No raster images.

## Files
- `Familiens Læseraket.dc.html` — the complete prototype (markup, styles, logic, SVG). Single source of truth.
