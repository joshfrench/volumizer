# Kiln Schedule Calculator — Design Spec
**Date:** 2026-06-28

## Overview

A new tool at `/schedule/index.html` that lets glass artists build a kiln firing schedule segment by segment, calculates the running time at each stage, displays a total firing time, and renders a live firing curve graph. No persistence — purely ephemeral, in-memory state.

Linked from the homepage alongside the existing mold investment calculator.

## Data Model

Each segment is a plain JS object:

```js
{ rate: string|number, target: number, hold: number, notes: string }
```

- `rate`: numeric °F/hr, or the string `"AFAP"` (also accepts `"9999"` or `"afap"` as input, normalized to `"AFAP"` on blur)
- `target`: °F setpoint (integer)
- `hold`: hours (decimal, 0 = no hold)
- `notes`: free-form string, may be empty

State is a plain JS array of segment objects held in memory. There is no localStorage, URL encoding, or other persistence.

## Calculations

```
AMBIENT_TEMP = 70  // °F
AFAP_RATE    = 300 // °F/hr, fixed — not user-configurable

for each segment i:
  prevTemp   = segments[i-1].target  (or AMBIENT_TEMP for i === 0)
  effectiveRate = (rate === 'AFAP') ? AFAP_RATE : rate
  rampTime   = Math.abs(target - prevTemp) / effectiveRate  // hours
  stageTime  = rampTime + hold
  cumulative += stageTime

totalTime = sum of all stageTime values
```

AFAP segments display their stage time with an "(est.)" suffix. A footnote appears below the graph whenever any segment uses AFAP: _"AFAP cooling estimated at 300°F/hr"_.

## Page Structure

```
/schedule/index.html   — the tool
/index.html            — add second link card: "Kiln schedule calculator"
```

`/schedule/index.html` inherits `../theme.css` and adds its own `<style>` block for tool-specific rules, following the same pattern as `/volume/index.html`.

Page layout (top to bottom):
1. `<header>` — "Kiln Schedule" title (matches existing header style)
2. Segment table card
3. Total time display
4. Firing curve card

## Segment Table

A single card (`background: var(--card)`, `border: 0.5px solid var(--border)`, `border-radius: 12px`) containing:

**Column header row** — background `var(--bg)`, 10px uppercase secondary text, `letter-spacing: 0.04em`:
```
#  |  Rate  |  Target  |  Hold  |  Time  |  Notes  |  [×]
```

**Data rows** — one per segment, `border-top: 0.5px solid var(--border)`:

```
grid-template-columns: 16px  58px  68px  42px  54px  1fr  22px
                        #     rate  target hold  time  note  ×
```

- `#`: auto-generated row number, 11px secondary text, non-editable
- `Rate`: number input, right-aligned; accepts AFAP/9999/afap — normalized to `"AFAP"` on blur, displayed italic in secondary color
- `Target`: number input with `°F` suffix outside the input
- `Hold`: number input with `h` suffix outside the input; blank treated as 0
- `Time` (calculated, read-only): right-aligned, `font-size: 12px`. Format: `Xh Ym`. AFAP rows add `est.` in 9px below the time.
- `Notes chip`: if empty, shows faint `+ note` (dashed border, secondary color). If populated, shows truncated text in a filled chip (`background: var(--bg)`, `border: 1px solid var(--border)`, `border-radius: 6px`). Tapping either opens the notes modal.
- `×`: delete button, `color: var(--danger)`, `font-size: 16px`

Input styling matches existing tool: `border: 1px solid var(--border)`, `border-radius: 6px`, `background: var(--bg)`, focus state `border-color: var(--accent)` + `box-shadow: 0 0 0 3px var(--accent-light)`, `-webkit-appearance: none`.

**Add segment row** — below all data rows, inside the card:
```html
<button class="add-segment-btn">+ Add segment</button>
```
Styled with `border: 1px dashed var(--accent)`, `color: var(--accent)`, `background: none`, `border-radius: 8px`, full width, `padding: 8px`.

New segments added at the bottom with empty fields.

## Total Time

Below the table card, right-aligned:
```
[secondary uppercase label: "Total"]   [22px font-weight-500 value: "43h 30m"]
```
Matches the `.result-card .value` style from the existing tool (22px, weight 500). Updates live.

Time format: whole hours and minutes only — `Xh Ym`. If under 1 hour: `Ym`. If no segments: hidden.

## Notes Modal

A single `<dialog>` element reused for all segments. Opens anchored to the bottom of the viewport (sheet style) via CSS. Backdrop: `rgba(0,0,0,0.35)`.

Modal content:
- Segment identifier: `"Segment N — notes"` (13px, weight 500)
- Segment summary line: `"100°F/hr → 200°F · hold 6h"` (11px secondary) — gives context without navigating away
- `<textarea>` for free-form notes: `font-size: 14px`, `height: 90px`, `resize: none`, matches existing input border/background styling
- **Done** button: full-width `btn-primary` (accent background, white text, `border-radius: 10px`, `padding: 11px`)

Closing: Done button or tapping the backdrop. Changes are applied immediately (no separate save step — textarea binds directly to segment state).

## Firing Curve Graph

A card below the total time (`border-radius: 12px`, same card style). Contains:
- Section label: `"Firing Curve"` (11px uppercase secondary, `letter-spacing: 0.04em`)
- An inline `<svg>` with `viewBox="0 0 400 160"` and `width: 100%; height: auto`

**Axes:**
- X: time (hours), 0 → totalTime. Tick labels at 0, ~25%, ~50%, ~75%, and end.
- Y: temperature (°F), 0 (or 70) → maxTarget + 10% padding. Gridlines at 500, 1000, 1500°F (dashed, `var(--border)`).
- Axis labels: 8px, `var(--text-secondary)`.

**Curve:**
Points computed from segment data:
- Start: `(0, AMBIENT_TEMP)`
- Per segment: end-of-ramp point `(cumTimeAfterRamp, target)`, then if hold > 0, end-of-hold point `(cumTimeAfterHold, target)` — produces flat horizontal segments for holds

Rendered as a single `<polyline>`, `stroke: var(--accent)`, `stroke-width: 2`, `stroke-linejoin: round`, `stroke-linecap: round`, `fill: none`.

**Peak marker:** `<circle r="3" fill="var(--accent)">` at the highest temperature point, with an `<text>` label `"XXXXF"` in `var(--accent)`, 8px.

**AFAP footnote:** when any segment uses AFAP, render below the SVG: `"AFAP cooling estimated at 300°F/hr"` in 10px secondary text, right-aligned.

Graph and total time are both hidden when there are no segments with enough data to calculate (rate, target both present).

## JS Architecture

Single `<script>` block at the bottom of the page. No modules, no build step.

```js
const AMBIENT_TEMP = 70;
const AFAP_RATE = 300;

let segments = [];  // array of {rate, target, hold, notes}

function calcSegments() { /* returns array of {stageTime, cumTime, isAfap} */ }
function render() { /* redraws table rows, total time, and SVG */ }
function openNotesModal(index) { /* binds dialog to segment, shows it */ }

// Event delegation on table container — one oninput listener
// Modal: one <dialog> element, rebound on each open
// render() called on: any input event, add/delete segment
```

`render()` replaces table row innerHTML and SVG innerHTML on every change — no diffing, no virtual DOM.

## Visual Language

All styling reuses existing patterns from `theme.css` and `/volume/index.html`:
- Card chrome: `background: var(--card)`, `border: 0.5px solid var(--border)`, `border-radius: 12px`, `padding: 1.25rem`
- Input focus: `border-color: var(--accent)` + `box-shadow: 0 0 0 3px var(--accent-light)`
- Primary button: `background: var(--accent)`, white text, `border-radius: 10px`, `padding: 14px`, `font-size: 16px`, `font-weight: 500`
- Secondary color: `var(--text-secondary)` (#8a7a6a)
- Danger/delete: `var(--danger)` (#c0392b)
- Animations: `fadein` keyframe (opacity 0→1, translateY 6px→0, 0.25s ease) on new rows

## Out of Scope (this iteration)

- Fahrenheit/Celsius toggle (°F only)
- Persistence (no localStorage, no URL sharing)
- Print stylesheet
- Segment reordering
- Configurable AFAP rate
- Reference lines on graph (anneal/strain/softening points)
- Energy estimation
