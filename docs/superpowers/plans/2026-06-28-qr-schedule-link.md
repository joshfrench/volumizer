# QR Schedule Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Encode the current kiln schedule as a compact URL param, embed a QR code linking back to that URL in the printed PDF, and pre-populate the schedule when that URL is opened.

**Architecture:** All changes are in `schedule/index.html`. Three additions: (1) URL encode/decode helpers + page-load restoration, (2) a lazy QRious loader alongside jsPDF, (3) QR image + label rendered in the bottom-right of the PDF via `buildFiringLog`.

**Tech Stack:** Vanilla JS, jsPDF 2.5.1 (existing), QRious 4.0.2 (new CDN dependency)

## Global Constraints

- No build step — single-file HTML, all JS inline
- Internal state always stored in canonical °F; `tempUnit` controls display only
- QRious CDN: `https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js`
- Site base URL: `https://starterbubble.com/schedule/`
- URL param name: `s`
- Encoding format: `{unit}:{rate},{target},{holdMins}:...` — digits, `A` (AFAP), `x` (empty), `:`, `,` only; no percent-encoding needed

---

### Task 1: URL encode/decode helpers and page-load restoration

**Files:**
- Modify: `schedule/index.html` — add helpers near the Constants block (around line 420), add `loadFromParam()` call after state initialization

**Interfaces:**
- Produces: `scheduleToParam() → string` (used by Task 3)

- [ ] **Step 1: Add `scheduleToParam()` after the `rateUnitLabel()` function (around line 479)**

Insert this block:

```js
// ── URL share helpers ──────────────────────────────────────────────────────
function scheduleToParam() {
  const meaningful = segments.filter((s, i) =>
    i === 0 || s.rate !== '' || s.target !== ''
  );
  const parts = meaningful.map(s => {
    const r = isAfap(s.rate) ? 'A' : (s.rate || 'x');
    const t = s.target || 'x';
    const h = s.hold ? String(Math.round(parseFloat(s.hold) * 60)) : '0';
    return `${r},${t},${h}`;
  });
  return tempUnit + ':' + parts.join(':');
}

function loadFromParam() {
  try {
    const param = new URLSearchParams(window.location.search).get('s');
    if (!param) return;
    const tokens = param.split(':');
    if (tokens.length < 2) return;
    const unit = tokens[0] === 'C' ? 'C' : 'F';
    const loaded = tokens.slice(1).map(tok => {
      const [r, t, hm] = tok.split(',');
      const rate   = r === 'A' ? 'AFAP' : (r === 'x' ? '' : r);
      const target = t === 'x' ? '' : t;
      const holdMins = parseInt(hm, 10);
      const hold  = holdMins > 0 ? String(holdMins / 60) : '';
      return { rate, target, hold };
    });
    if (loaded.length === 0) return;
    tempUnit = unit;
    segments = loaded;
  } catch (_e) {}
}
```

- [ ] **Step 2: Call `loadFromParam()` right after the existing tempUnit initialization (around line 430), before any render**

The existing block reads:
```js
try { tempUnit = (JSON.parse(localStorage.getItem(SCHED_KEY)) || {}).tempUnit || 'F'; } catch (_e) {}
function saveSchedSettings() { try { localStorage.setItem(SCHED_KEY, JSON.stringify({ tempUnit })); } catch (_e) {} }
```

Add `loadFromParam();` immediately after `saveSchedSettings()` definition:
```js
try { tempUnit = (JSON.parse(localStorage.getItem(SCHED_KEY)) || {}).tempUnit || 'F'; } catch (_e) {}
function saveSchedSettings() { try { localStorage.setItem(SCHED_KEY, JSON.stringify({ tempUnit })); } catch (_e) {} }
loadFromParam();
```

- [ ] **Step 3: Verify URL restoration in the browser**

Open: `schedule/index.html?s=F:300,1000,0:200,1480,0:A,960,60:50,750,0`

Expected: schedule loads with 4 segments — 300°F/hr→1000°F, 200→1480, AFAP→960 (hold 1h), 50→750. No errors in console.

Also open with no param: `schedule/index.html` — expected: single blank row as normal.

- [ ] **Step 4: Commit**

```bash
git add schedule/index.html
git commit -m "feat: add URL encode/decode for schedule state"
```

---

### Task 2: QRious lazy loader

**Files:**
- Modify: `schedule/index.html` — add `ensureQRious()` alongside `ensureJsPDF()` (around line 884), update `generatePDF()` to await both

**Interfaces:**
- Consumes: nothing from Task 1
- Produces: `ensureQRious() → Promise<void>` (used by Task 3)

- [ ] **Step 1: Add `ensureQRious()` immediately after `ensureJsPDF()` (around line 897)**

```js
let _qriousPromise = null;

function ensureQRious() {
  if (_qriousPromise) return _qriousPromise;
  if (window.QRious) return (_qriousPromise = Promise.resolve());
  _qriousPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js';
    s.onload  = resolve;
    s.onerror = () => { _qriousPromise = null; reject(new Error('offline')); };
    document.head.appendChild(s);
  });
  return _qriousPromise;
}
```

- [ ] **Step 2: Update `generatePDF()` to load both libraries in parallel**

Replace the existing `generatePDF()`:
```js
async function generatePDF() {
  const btn = document.getElementById('pdf-btn');
  btn.disabled = true;
  btn.textContent = 'Generating…';
  try {
    await Promise.all([ensureJsPDF(), ensureQRious()]);
    buildFiringLog(window.jspdf.jsPDF);
  } catch (_e) {
    alert('Could not load the PDF library. Check your internet connection and try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Download firing log (PDF)';
  }
}
```

- [ ] **Step 3: Verify QRious loads**

Open `schedule/index.html`, enter a valid schedule, click "Download firing log (PDF)". Expected: PDF downloads without errors. Open browser console — no errors about QRious.

Also verify in console: `window.QRious` should be a constructor after clicking the button.

- [ ] **Step 4: Commit**

```bash
git add schedule/index.html
git commit -m "feat: lazy-load QRious alongside jsPDF"
```

---

### Task 3: QR code in PDF

**Files:**
- Modify: `schedule/index.html` — add `buildQRDataUrl()` helper and QR rendering inside `buildFiringLog()` before the `doc.save()` call (around line 1113)

**Interfaces:**
- Consumes: `scheduleToParam()` from Task 1; `window.QRious` loaded by Task 2
- Produces: QR image + label at bottom-right of PDF

- [ ] **Step 1: Add `buildQRDataUrl()` helper immediately before `buildFiringLog()` (around line 914)**

```js
function buildQRDataUrl() {
  const url = 'https://starterbubble.com/schedule/?s=' + scheduleToParam();
  const canvas = document.createElement('canvas');
  new window.QRious({ element: canvas, value: url, size: 256, level: 'L' });
  return canvas.toDataURL('image/png');
}
```

- [ ] **Step 2: Add QR image and label inside `buildFiringLog()`, just before `doc.save()`**

The `doc.save(...)` call is currently the last line of `buildFiringLog`. Insert before it:

```js
  // ── QR code (bottom-right) ────────────────────────────────────────────────
  const QR_SIZE  = 64;   // pt
  const QR_LABEL = 'Scan to edit this schedule';
  const qrX = RIGHT - QR_SIZE;              // 516
  const qrY = PAGE_H - MARGIN_BOTTOM - QR_SIZE - 10;  // 686

  const qrDataUrl = buildQRDataUrl();
  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, QR_SIZE, QR_SIZE);

  doc.setFont('helvetica', 'normal'); doc.setFontSize(6); ink(GREY);
  const labelX = qrX + QR_SIZE / 2;
  doc.text(QR_LABEL, labelX, qrY + QR_SIZE + 7, { align: 'center' });
```

- [ ] **Step 3: Verify QR code in PDF**

Enter a schedule (e.g. 3–4 segments), click "Download firing log (PDF)". Open the PDF.

Expected:
- QR code appears in the bottom-right corner, clear and unobstructed
- Label "Scan to edit this schedule" appears below it in small grey text
- Scan the QR code with a phone — it should open `https://starterbubble.com/schedule/?s=...` with the schedule pre-populated

Also verify the rest of the PDF layout is unchanged.

- [ ] **Step 4: Commit**

```bash
git add schedule/index.html
git commit -m "feat: embed QR code in firing log PDF"
```
