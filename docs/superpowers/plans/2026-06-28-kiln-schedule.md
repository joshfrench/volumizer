# Kiln Schedule Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a kiln firing schedule calculator at `/schedule/index.html` that lets users define segments (rate, target, hold), calculates stage times live, and renders a firing curve graph.

**Architecture:** Pure static HTML/CSS/JS in one file — no build system, no framework, no external dependencies. State is a plain JS array in memory. A single `render()` function redraws the table and graph on every change. All JS lives in a `<script>` tag at the bottom of the file.

**Tech Stack:** HTML5, CSS (CSS custom properties via `theme.css`), vanilla JS, inline SVG for the graph.

---

## Context: How This Site Works

- **Static site.** No build step. Files are served as-is. Open `index.html` in a browser to test locally.
- **CSS variables** defined in `/theme.css`: `--bg`, `--card`, `--border`, `--text`, `--text-secondary`, `--accent` (#f4791e orange), `--accent-light`, `--danger`.
- **Existing tool** at `/volume/index.html` is the pattern to follow — look at it for CSS patterns (input styling, button styles, card chrome).
- **Container:** max-width 480px, centered, 1rem horizontal padding. Mobile-first — assume 375px viewport width.
- **No test framework.** Verification is via browser console assertions and visual checks.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `/index.html` | Modify | Add "Kiln schedule calculator" link card |
| `/schedule/index.html` | Create | Full tool: HTML structure, CSS, JS |

---

### Task 1: Scaffold the page and link from homepage

**Files:**
- Create: `/schedule/index.html`
- Modify: `/index.html`

- [ ] **Step 1: Create the bare scaffold**

Create `/schedule/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>Kiln Schedule Calculator | Volumizer</title>
<meta name="description" content="Free kiln schedule calculator for glass artists. Define firing segments, calculate stage times, and visualize the firing curve.">
<link rel="stylesheet" href="../theme.css">
<style>
  /* styles go here in later tasks */
</style>
</head>
<body>
<div class="container">
  <header>
    <h1>Kiln Schedule</h1>
  </header>
  <p style="color:var(--text-secondary);font-size:14px;text-align:center">Coming soon</p>
</div>
</body>
</html>
```

- [ ] **Step 2: Add link card to homepage**

In `/index.html`, find this block:

```html
  <div class="link-list">
    <a class="link-card" href="/volume/index.html">Mold investment calculator</a>
  </div>
```

Replace with:

```html
  <div class="link-list">
    <a class="link-card" href="/volume/index.html">Mold investment calculator</a>
    <a class="link-card" href="/schedule/index.html">Kiln schedule calculator</a>
  </div>
```

- [ ] **Step 3: Verify**

Open `/index.html` in a browser. Confirm two link cards appear. Click "Kiln schedule calculator" — it should navigate to `/schedule/index.html` showing the "Coming soon" placeholder.

- [ ] **Step 4: Commit**

```bash
git add schedule/index.html index.html
git commit -m "feat: scaffold kiln schedule page and homepage link"
```

---

### Task 2: HTML structure and CSS

**Files:**
- Modify: `/schedule/index.html`

- [ ] **Step 1: Replace the scaffold body with the full HTML structure**

Replace the entire `<body>` content (including the `<style>` block) in `/schedule/index.html` with the following. This adds all HTML elements and all CSS upfront so subsequent tasks can focus on JS only.

```html
<style>
  @keyframes fadein {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Table card ────────────────────────────── */
  .table-card {
    background: var(--card);
    border: 0.5px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 0.75rem;
  }

  .col-header {
    display: grid;
    grid-template-columns: 16px 58px 68px 42px 54px 1fr 22px;
    gap: 5px;
    padding: 7px 10px;
    background: var(--bg);
    font-size: 10px;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    align-items: center;
  }

  .col-header span { display: block; }
  .col-header .h-rate,
  .col-header .h-target,
  .col-header .h-hold,
  .col-header .h-time { text-align: right; }

  /* ── Segment rows ──────────────────────────── */
  .seg-row {
    display: grid;
    grid-template-columns: 16px 58px 68px 42px 54px 1fr 22px;
    gap: 5px;
    padding: 7px 10px;
    border-top: 0.5px solid var(--border);
    align-items: center;
    animation: fadein 0.2s ease;
  }

  .seg-num {
    font-size: 11px;
    color: var(--text-secondary);
  }

  /* Number inputs shared style */
  .seg-row input {
    width: 100%;
    font-size: 13px;
    padding: 4px 5px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg);
    color: var(--text);
    -webkit-appearance: none;
    -moz-appearance: textfield;
    text-align: right;
  }

  .seg-row input::-webkit-outer-spin-button,
  .seg-row input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

  .seg-row input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-light);
  }

  /* Rate input left-aligns normally, right when AFAP */
  .seg-rate { text-align: right; }
  .seg-rate.is-afap { font-style: italic; color: var(--text-secondary); }

  /* Target and hold: number inside a wrapper with unit suffix */
  .field-wrap {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .field-wrap input { flex: 1; min-width: 0; }

  .unit {
    font-size: 10px;
    color: var(--text-secondary);
    white-space: nowrap;
    flex-shrink: 0;
  }

  /* Calculated time cell */
  .seg-time {
    font-size: 12px;
    color: var(--text);
    text-align: right;
    white-space: nowrap;
    line-height: 1.2;
  }

  .est {
    display: block;
    font-size: 9px;
    color: var(--text-secondary);
    text-align: right;
  }

  /* Notes chip */
  .note-chip {
    font-size: 11px;
    border-radius: 6px;
    padding: 3px 6px;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
  }

  .note-chip.filled {
    background: var(--bg);
    border: 1px solid var(--border);
    color: var(--text-secondary);
  }

  .note-chip.empty {
    border: 1px dashed var(--border);
    color: var(--border);
  }

  /* Delete button */
  .del-btn {
    background: none;
    border: none;
    color: var(--danger);
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    text-align: center;
    -webkit-appearance: none;
    -webkit-tap-highlight-color: transparent;
  }

  /* ── Add segment row ────────────────────────── */
  .add-row {
    padding: 8px 10px;
    border-top: 0.5px solid var(--border);
  }

  .add-btn {
    width: 100%;
    padding: 8px;
    font-size: 13px;
    font-weight: 500;
    color: var(--accent);
    background: none;
    border: 1px dashed var(--accent);
    border-radius: 8px;
    cursor: pointer;
    -webkit-appearance: none;
  }

  /* ── Total time ─────────────────────────────── */
  #total-row {
    display: none;
    justify-content: flex-end;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 1rem;
    padding: 0 2px;
  }

  .total-label {
    font-size: 12px;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  #total-value {
    font-size: 22px;
    font-weight: 500;
  }

  /* ── Graph card ─────────────────────────────── */
  #graph-card {
    display: none;
    background: var(--card);
    border: 0.5px solid var(--border);
    border-radius: 12px;
    padding: 12px;
    margin-bottom: 1.5rem;
  }

  .graph-label {
    font-size: 11px;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 8px;
  }

  #graph { display: block; width: 100%; height: auto; overflow: visible; }

  #afap-note {
    display: none;
    font-size: 10px;
    color: var(--text-secondary);
    text-align: right;
    margin: 4px 0 0;
  }

  /* ── Notes modal ────────────────────────────── */
  .modal-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    align-items: flex-end;
    justify-content: center;
    z-index: 100;
  }

  .modal-overlay.open { display: flex; }

  .modal-sheet {
    background: var(--card);
    border-radius: 16px 16px 0 0;
    padding: 20px;
    width: 100%;
    max-width: 480px;
  }

  .modal-seg-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--text);
    margin: 0 0 3px;
  }

  .modal-seg-summary {
    font-size: 11px;
    color: var(--text-secondary);
    margin: 0 0 12px;
  }

  .modal-sheet textarea {
    width: 100%;
    font-size: 14px;
    font-family: inherit;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text);
    resize: none;
    height: 90px;
    -webkit-appearance: none;
    box-sizing: border-box;
  }

  .modal-sheet textarea:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-light);
  }

  .modal-done {
    margin-top: 10px;
    width: 100%;
    padding: 14px;
    font-size: 16px;
    font-weight: 500;
    color: white;
    background: var(--accent);
    border: none;
    border-radius: 10px;
    cursor: pointer;
    -webkit-appearance: none;
  }

  .modal-done:active { opacity: 0.85; }
</style>
</head>
<body>
<div class="container">
  <header>
    <h1>Kiln Schedule</h1>
  </header>

  <!-- Segment table -->
  <div class="table-card">
    <div class="col-header">
      <span>#</span>
      <span class="h-rate">Rate</span>
      <span class="h-target">Target</span>
      <span class="h-hold">Hold</span>
      <span class="h-time">Time</span>
      <span></span>
      <span></span>
    </div>
    <div id="seg-body">
      <!-- rows rendered by JS -->
    </div>
    <div class="add-row">
      <button class="add-btn" id="add-btn">+ Add segment</button>
    </div>
  </div>

  <!-- Total time -->
  <div id="total-row">
    <span class="total-label">Total</span>
    <span id="total-value"></span>
  </div>

  <!-- Graph -->
  <div id="graph-card">
    <div class="graph-label">Firing Curve</div>
    <svg id="graph" viewBox="0 0 400 160" xmlns="http://www.w3.org/2000/svg"></svg>
    <p id="afap-note">AFAP cooling estimated at 300°F/hr</p>
  </div>
</div>

<!-- Notes modal -->
<div class="modal-overlay" id="notes-modal">
  <div class="modal-sheet" id="notes-sheet">
    <p class="modal-seg-title" id="modal-title"></p>
    <p class="modal-seg-summary" id="modal-summary"></p>
    <textarea id="modal-textarea" placeholder="Notes…"></textarea>
    <button class="modal-done" id="modal-done">Done</button>
  </div>
</div>

<script>
// JS goes here in later tasks
</script>
</body>
```

- [ ] **Step 2: Verify layout**

Open `/schedule/index.html` in a browser. Confirm:
- Header "Kiln Schedule" appears in the site's warm earthy style
- The table card renders (empty, just showing the "+ Add segment" button)
- No JS errors in the console
- The page matches the overall site feel (same background color, same font)

- [ ] **Step 3: Commit**

```bash
git add schedule/index.html
git commit -m "feat: kiln schedule HTML structure and CSS"
```

---

### Task 3: Core JS — state, render, add/delete, calculations, total time

**Files:**
- Modify: `/schedule/index.html` (the `<script>` block)

- [ ] **Step 1: Add the full JS implementation**

Replace the `// JS goes here in later tasks` comment inside the `<script>` block with:

```js
// ── Constants ──────────────────────────────────────────────────────────────
const AMBIENT_TEMP = 70;  // °F — assumed starting temperature
const AFAP_RATE    = 300; // °F/hr — fixed estimate for "as fast as possible"

// ── State ──────────────────────────────────────────────────────────────────
let segments = [{ rate: '', target: '', hold: '', notes: '' }];
let modalIndex = -1;

// ── Helpers ────────────────────────────────────────────────────────────────
function isAfap(val) {
  const s = String(val).trim().toUpperCase();
  return s === 'AFAP' || s === '9999';
}

function fmtTime(hours) {
  if (!isFinite(hours) || hours <= 0) return '—';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ── Calculations ───────────────────────────────────────────────────────────
function calcSegments() {
  let cumTime = 0;
  return segments.map((seg, i) => {
    const afap   = isAfap(seg.rate);
    const rate   = afap ? AFAP_RATE : parseFloat(seg.rate);
    const target = parseFloat(seg.target);
    const hold   = parseFloat(seg.hold) || 0;
    const prevTemp = i === 0
      ? AMBIENT_TEMP
      : (parseFloat(segments[i - 1].target) || AMBIENT_TEMP);

    if (isNaN(target) || isNaN(rate) || rate <= 0) {
      return { rampTime: 0, stageTime: 0, cumTime, isAfap: afap, valid: false };
    }

    const rampTime  = Math.abs(target - prevTemp) / rate;
    const stageTime = rampTime + hold;
    cumTime += stageTime;
    return { rampTime, stageTime, cumTime, isAfap: afap, valid: true };
  });
}

// ── Render ─────────────────────────────────────────────────────────────────
function render() {
  const calcs = calcSegments();

  // Table rows
  document.getElementById('seg-body').innerHTML = segments.map((seg, i) => {
    const calc = calcs[i];
    const timeStr = calc.valid ? fmtTime(calc.stageTime) : '—';
    const estSpan = calc.isAfap && calc.valid ? '<span class="est">est.</span>' : '';
    const rateClass = isAfap(seg.rate) ? ' is-afap' : '';
    const noteChip = seg.notes
      ? `<div class="note-chip filled" data-action="note" data-index="${i}">${seg.notes}</div>`
      : `<div class="note-chip empty"  data-action="note" data-index="${i}">+ note</div>`;

    return `
      <div class="seg-row" data-index="${i}">
        <span class="seg-num">${i + 1}</span>
        <input class="seg-rate${rateClass}" type="text" inputmode="decimal"
               value="${seg.rate}" data-field="rate" placeholder="°F/hr">
        <div class="field-wrap">
          <input type="number" inputmode="decimal"
                 value="${seg.target}" data-field="target" placeholder="0">
          <span class="unit">°F</span>
        </div>
        <div class="field-wrap">
          <input type="number" inputmode="decimal"
                 value="${seg.hold}" data-field="hold" placeholder="0">
          <span class="unit">h</span>
        </div>
        <div class="seg-time">${timeStr}${estSpan}</div>
        ${noteChip}
        <button class="del-btn" data-action="delete" data-index="${i}" aria-label="Remove segment ${i + 1}">×</button>
      </div>`;
  }).join('');

  // Total time
  const calcsValid = calcs.filter(c => c.valid);
  const totalHours = calcsValid.reduce((s, c) => s + c.stageTime, 0);
  const totalRow   = document.getElementById('total-row');
  if (calcsValid.length > 0 && totalHours > 0) {
    totalRow.style.display = 'flex';
    document.getElementById('total-value').textContent = fmtTime(totalHours);
  } else {
    totalRow.style.display = 'none';
  }

  renderGraph(calcs);
}

// ── Event delegation ───────────────────────────────────────────────────────
const segBody = document.getElementById('seg-body');

// input: update state immediately; skip re-render for rate (wait for blur)
segBody.addEventListener('input', e => {
  const row = e.target.closest('.seg-row');
  if (!row) return;
  const i     = parseInt(row.dataset.index, 10);
  const field = e.target.dataset.field;
  if (!field) return;
  segments[i][field] = e.target.value;
  if (field !== 'rate') render();
});

// blur on rate: normalize AFAP/9999, then render
segBody.addEventListener('blur', e => {
  if (e.target.dataset.field !== 'rate') return;
  const row = e.target.closest('.seg-row');
  if (!row) return;
  const i   = parseInt(row.dataset.index, 10);
  const val = e.target.value.trim().toUpperCase();
  segments[i].rate = (val === 'AFAP' || val === '9999') ? 'AFAP' : e.target.value;
  render();
}, true /* useCapture so blur fires on delegated elements */);

// click: delete or open notes
segBody.addEventListener('click', e => {
  const action = e.target.dataset.action || e.target.closest('[data-action]')?.dataset.action;
  const index  = parseInt(
    e.target.dataset.index ?? e.target.closest('[data-index]')?.dataset.index, 10
  );
  if (isNaN(index)) return;

  if (action === 'delete') {
    segments.splice(index, 1);
    render();
  } else if (action === 'note') {
    openNotesModal(index);
  }
});

// add segment
document.getElementById('add-btn').addEventListener('click', () => {
  segments.push({ rate: '', target: '', hold: '', notes: '' });
  render();
  // scroll new row into view
  const rows = document.querySelectorAll('.seg-row');
  rows[rows.length - 1]?.scrollIntoView({ block: 'nearest' });
});

// ── Notes modal (stub — wired up in Task 4) ────────────────────────────────
function openNotesModal(index) {
  // implemented in Task 4
  console.log('openNotesModal', index);
}

// ── Graph (stub — implemented in Task 5) ──────────────────────────────────
function renderGraph(calcs) {
  // implemented in Task 5
  document.getElementById('graph-card').style.display = 'none';
}

// ── Bootstrap ─────────────────────────────────────────────────────────────
render();
```

- [ ] **Step 2: Verify in the browser — visual check**

Open `/schedule/index.html`. Confirm:
- One empty row appears with inputs for rate, target, hold
- "Time" column shows "—" for the empty row
- "+ Add segment" button adds new rows
- × removes rows
- Typing `100` in rate, `200` in target, `6` in hold shows "7h 18m" in Time (1.3h ramp + 6h hold)
- Typing `AFAP` or `9999` in rate, then clicking away, normalizes to "AFAP" displayed italic
- An AFAP row with target 1200 and previous target 1525 at 300°F/hr: ramp = 325/300 = 1.08h; with hold 4h → 5h 5m with "est." below it
- Total time row appears when at least one row has valid data

- [ ] **Step 3: Verify via browser console — calculation assertions**

Open the browser console on `/schedule/index.html` and paste:

```js
// Load the full Ducks schedule and check calculations
segments = [
  { rate: '100',  target: '200',  hold: '6', notes: '' },
  { rate: '100',  target: '1250', hold: '2', notes: '' },
  { rate: '600',  target: '1525', hold: '3', notes: '' },
  { rate: 'AFAP', target: '1200', hold: '4', notes: '' },
  { rate: 'AFAP', target: '900',  hold: '4', notes: '' },
  { rate: '27',   target: '800',  hold: '0', notes: '' },
  { rate: '48',   target: '700',  hold: '0', notes: '' },
  { rate: '159',  target: '70',   hold: '0', notes: '' },
];
const c = calcSegments();
console.assert(Math.abs(c[0].stageTime - 7.3)   < 0.01, `Seg1: expected 7.3h, got ${c[0].stageTime.toFixed(3)}`);
console.assert(Math.abs(c[1].stageTime - 12.5)  < 0.01, `Seg2: expected 12.5h, got ${c[1].stageTime.toFixed(3)}`);
console.assert(Math.abs(c[2].stageTime - 3.458) < 0.01, `Seg3: expected 3.458h, got ${c[2].stageTime.toFixed(3)}`);
console.assert(c[3].isAfap === true,                     'Seg4: should be AFAP');
console.assert(Math.abs(c[3].rampTime - 1.083)  < 0.01, `Seg4 ramp: expected 1.083h, got ${c[3].rampTime.toFixed(3)}`);
console.assert(c[3].valid === true,                      'Seg4: should be valid');
const total = c.reduce((s, x) => s + x.stageTime, 0);
console.assert(Math.abs(total - 43.09) < 0.1, `Total: expected ~43.09h, got ${total.toFixed(2)}`);
console.log('All assertions passed. Total:', total.toFixed(2) + 'h');
render();
```

Expected console output: `All assertions passed. Total: 43.09h` (no failed assertions).

- [ ] **Step 4: Commit**

```bash
git add schedule/index.html
git commit -m "feat: kiln schedule core JS — state, render, calculations, add/delete"
```

---

### Task 4: Notes modal

**Files:**
- Modify: `/schedule/index.html` (replace the `openNotesModal` stub in the `<script>` block)

- [ ] **Step 1: Replace the `openNotesModal` stub and wire up modal events**

Find this block in the `<script>` tag:

```js
// ── Notes modal (stub — wired up in Task 4) ────────────────────────────────
function openNotesModal(index) {
  // implemented in Task 4
  console.log('openNotesModal', index);
}
```

Replace it with:

```js
// ── Notes modal ────────────────────────────────────────────────────────────
function openNotesModal(index) {
  modalIndex = index;
  const seg = segments[index];

  document.getElementById('modal-title').textContent = `Segment ${index + 1} — notes`;

  const rateStr   = isAfap(seg.rate) ? 'AFAP' : (seg.rate ? `${seg.rate}°F/hr` : '—');
  const targetStr = seg.target ? `${seg.target}°F` : '—';
  const holdStr   = parseFloat(seg.hold) > 0 ? `hold ${seg.hold}h` : 'no hold';
  document.getElementById('modal-summary').textContent = `${rateStr} → ${targetStr} · ${holdStr}`;

  const ta = document.getElementById('modal-textarea');
  ta.value = seg.notes;
  document.getElementById('notes-modal').classList.add('open');
  ta.focus();
}

function closeNotesModal() {
  if (modalIndex >= 0) {
    segments[modalIndex].notes = document.getElementById('modal-textarea').value;
    render();
  }
  document.getElementById('notes-modal').classList.remove('open');
  modalIndex = -1;
}

document.getElementById('modal-done').addEventListener('click', closeNotesModal);

// close when tapping the overlay backdrop (not the sheet itself)
document.getElementById('notes-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('notes-modal')) closeNotesModal();
});
```

- [ ] **Step 2: Verify**

In the browser:
- Click a "+ note" chip on any row — the modal slides up from the bottom
- The title shows "Segment N — notes"
- The summary line shows the segment's rate/target/hold (e.g., "100°F/hr → 200°F · hold 6h")
- Type some notes and tap "Done" — the chip updates to show truncated text
- Tap the chip again — the modal reopens with the saved text
- Tap outside the modal sheet (on the dark overlay) — modal closes, notes saved
- Reopening the modal after closing via backdrop also shows saved notes

- [ ] **Step 3: Commit**

```bash
git add schedule/index.html
git commit -m "feat: kiln schedule notes modal"
```

---

### Task 5: Firing curve graph

**Files:**
- Modify: `/schedule/index.html` (replace the `renderGraph` stub in the `<script>` block)

- [ ] **Step 1: Replace the `renderGraph` stub**

Find this block in the `<script>` tag:

```js
// ── Graph (stub — implemented in Task 5) ──────────────────────────────────
function renderGraph(calcs) {
  // implemented in Task 5
  document.getElementById('graph-card').style.display = 'none';
}
```

Replace it with:

```js
// ── Graph ──────────────────────────────────────────────────────────────────
function renderGraph(calcs) {
  const graphCard = document.getElementById('graph-card');
  const svgEl     = document.getElementById('graph');
  const afapNote  = document.getElementById('afap-note');

  const validCalcs = calcs.filter(c => c.valid);
  if (validCalcs.length === 0) {
    graphCard.style.display = 'none';
    return;
  }
  graphCard.style.display = 'block';
  afapNote.style.display  = calcs.some(c => c.isAfap && c.valid) ? 'block' : 'none';

  // ── SVG coordinate system ─────────────────────────────────────────────
  // viewBox: 0 0 400 160
  // Plot area: x 36–390, y 8–140  (PAD_L=36, PAD_R=10, PAD_T=8, PAD_B=20)
  const PAD_L = 36, PAD_R = 10, PAD_T = 8, PAD_B = 20;
  const W = 400, H = 160;
  const plotW = W - PAD_L - PAD_R;  // 354
  const plotH = H - PAD_T - PAD_B;  // 132

  const totalTime = calcs[calcs.length - 1].cumTime || 1;
  const maxTemp   = Math.max(...segments.map(s => parseFloat(s.target) || 0));
  const yMax      = maxTemp * 1.12;  // 12% headroom for peak label
  const yMin      = 0;

  const tx = t => PAD_L + (t / totalTime) * plotW;
  const ty = T => (PAD_T + plotH) - ((T - yMin) / (yMax - yMin)) * plotH;

  // ── Build polyline points ──────────────────────────────────────────────
  const pts = [`${tx(0).toFixed(1)},${ty(AMBIENT_TEMP).toFixed(1)}`];
  segments.forEach((seg, i) => {
    const calc   = calcs[i];
    if (!calc?.valid) return;
    const target = parseFloat(seg.target);
    const hold   = parseFloat(seg.hold) || 0;
    const endRamp = calc.cumTime - hold;
    pts.push(`${tx(endRamp).toFixed(1)},${ty(target).toFixed(1)}`);
    if (hold > 0) {
      pts.push(`${tx(calc.cumTime).toFixed(1)},${ty(target).toFixed(1)}`);
    }
  });

  // ── Find peak (highest target temperature) ────────────────────────────
  let peakTemp = 0, peakTime = 0;
  segments.forEach((seg, i) => {
    const calc   = calcs[i];
    if (!calc?.valid) return;
    const target = parseFloat(seg.target) || 0;
    const hold   = parseFloat(seg.hold) || 0;
    if (target > peakTemp) {
      peakTemp = target;
      peakTime = calc.cumTime - hold; // end of ramp to this temp
    }
  });

  // ── Horizontal grid lines at 500°, 1000°, 1500° ──────────────────────
  const gridLines = [500, 1000, 1500]
    .filter(t => t > yMin && t < yMax)
    .map(t => `
      <line x1="${PAD_L}" y1="${ty(t).toFixed(1)}" x2="${W - PAD_R}" y2="${ty(t).toFixed(1)}"
            stroke="var(--border)" stroke-width="0.5" stroke-dasharray="2,3"/>
      <text x="${PAD_L - 4}" y="${(ty(t) + 3).toFixed(1)}"
            font-size="8" fill="var(--text-secondary)" text-anchor="end">${t}°</text>
    `).join('');

  // ── X-axis tick labels at 0%, 25%, 50%, 75%, 100% of total time ───────
  const xTicks = [0, 0.25, 0.5, 0.75, 1.0].map(f => {
    const t    = f * totalTime;
    const h    = Math.round(t);
    const label = `${h}h`;
    const anchor = f === 0 ? 'start' : f === 1.0 ? 'end' : 'middle';
    return `<text x="${tx(t).toFixed(1)}" y="${H - 4}"
                  font-size="8" fill="var(--text-secondary)" text-anchor="${anchor}">${label}</text>`;
  }).join('');

  // ── Peak marker ────────────────────────────────────────────────────────
  const px = tx(peakTime);
  const py = ty(peakTemp);
  // keep label from clipping right edge
  const labelX = Math.min(px + 4, W - PAD_R - 32);
  const peakMarker = `
    <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3" fill="var(--accent)"/>
    <text x="${labelX.toFixed(1)}" y="${(py - 4).toFixed(1)}"
          font-size="8" fill="var(--accent)" font-weight="500">${Math.round(peakTemp)}°F</text>
  `;

  // ── Compose SVG ────────────────────────────────────────────────────────
  svgEl.innerHTML = `
    <!-- axes -->
    <line x1="${PAD_L}" y1="${PAD_T}" x2="${PAD_L}" y2="${PAD_T + plotH}"
          stroke="var(--border)" stroke-width="0.5"/>
    <line x1="${PAD_L}" y1="${PAD_T + plotH}" x2="${W - PAD_R}" y2="${PAD_T + plotH}"
          stroke="var(--border)" stroke-width="0.5"/>
    <!-- y-min label -->
    <text x="${PAD_L - 4}" y="${(ty(0) + 3).toFixed(1)}"
          font-size="8" fill="var(--text-secondary)" text-anchor="end">0°</text>
    <!-- grid lines + y labels -->
    ${gridLines}
    <!-- x labels -->
    ${xTicks}
    <!-- firing curve -->
    <polyline points="${pts.join(' ')}"
              fill="none" stroke="var(--accent)" stroke-width="2"
              stroke-linejoin="round" stroke-linecap="round"/>
    <!-- peak marker -->
    ${peakMarker}
  `;
}
```

- [ ] **Step 2: Verify with the Ducks schedule**

In the browser console, paste the Ducks segments from Task 3 Step 3, then call `render()`. Confirm:

- Graph card appears below the total time
- The curve starts at the bottom-left (~70°F at 0h)
- It climbs steadily to 1250°F with a flat hold, then a steep rise to 1525°F peak
- Peak dot and "1525°F" label appear at the top of the curve
- Two stepped cooling descents after the peak (AFAP drops)
- Final segment returns to ~70°F at the bottom-right
- Dashed gridlines appear at 500°, 1000°
- X-axis shows ~0h, 11h, 22h, 32h, 43h
- AFAP footnote appears below the graph
- Graph hides when all rows are cleared (click × on every row)

- [ ] **Step 3: Commit**

```bash
git add schedule/index.html
git commit -m "feat: kiln schedule firing curve graph"
```

---

## Self-Review Checklist

- [x] Scaffold + homepage link — Task 1
- [x] Full CSS matching existing visual language — Task 2
- [x] State array, render loop, add/delete, event delegation — Task 3
- [x] AFAP normalization on blur, `is-afap` class, `est.` suffix — Task 3
- [x] `calcSegments()` using 70°F ambient, 300°F/hr AFAP rate — Task 3
- [x] Total time display (hidden when no valid segments) — Task 3
- [x] Notes modal with segment context line, save on Done + backdrop click — Task 4
- [x] Graph: polyline from segment data, holds as flat segments, peak marker — Task 5
- [x] Graph: axes, gridlines at 500/1000/1500°, x-axis tick labels — Task 5
- [x] AFAP footnote on graph when any AFAP segment present — Task 5
- [x] Graph hidden when no valid segments — Task 5
- [x] Type consistency: `isAfap()`, `calcSegments()`, `fmtTime()`, `render()`, `renderGraph(calcs)`, `openNotesModal(index)` — consistent across all tasks
