# Stay or Go — Air Force Transition & Financial Planner

A private, installable web app that models an active-duty Air Force member's finances
and compares **staying in** against **separating or retiring** across five paths. It
answers the core question: *what would it take to keep my current quality of life?*

Everything runs **on the device** — no accounts, no server, no data ever leaves the browser.

---

## Run it locally

You already have Python, so no install is needed:

```bash
cd "af-transition-planner"
python3 -m http.server 8137
```

Then open **http://localhost:8137** in your browser.

(That's the same `stay-or-go` config saved in `.claude/launch.json`, so the in-app
preview launcher works too.)

## Install it as an app

Open it in Chrome/Edge/Safari and choose **Install** (or *Add to Home Screen* on a
phone). It then works offline and opens in its own window.

## Put it online (optional)

Drag the `af-transition-planner` folder onto **Netlify** (same as your other project).
It's plain static files — no build step.

---

## What it does

1. **Bottom line** — the civilian salary needed to match today's lifestyle, with the
   "hidden paycheck" (tax-free BAH/BAS, tax-free VA) properly accounted for.
2. **Five paths, side by side** — Stay to 20 & retire · Civilian job · School on the
   GI Bill · Guard/Reserve · Stop working entirely. Each is normalized to today's
   purchasing power so a "100% match" means the same lifestyle you have now.
3. **Stay-or-go decision map** — a diagram that lights up the recommended path, with
   the reasoning written out (cliff vesting, CRDP, cost-of-living, BRS portability…).
4. **Visuals** — a bar chart and a 15-year income timeline for visual learners.
5. **Narrated walkthrough** — plays the analysis aloud using the device's built-in voice.
6. **Education benefits** — GI Bill, transfer to dependents, VR&E (Ch.31), DEA (Ch.35),
   MyCAA, VA home loan — and the dollars each is worth.
7. **Pre-separation checklist** — TAP, SkillBridge, BDD claim, SBP, TSP, SGLI→VGLI,
   healthcare bridge, and more. Your check-marks are saved on the device.

## How the key numbers work

- **Today's spendable** = base-pay take-home (after federal + FICA + state) **plus**
  tax-free BAH and BAS — the money you actually live on.
- **Required civilian salary** grosses that target back up through destination-state
  taxes, adds the cost of replacing Tricare, and subtracts tax-free VA.
- **Pension** = `multiplier × years × high-3 base pay`, where the multiplier is **2.5%**
  (Legacy High-3) or **2.0%** (BRS). Only base pay counts, and only at 20+ years.
- **VA + retirement offset** — at a 50%+ rating with 20 years, **CRDP** lets you draw the
  full pension *and* full VA. Below 50%, the VA waiver makes part of the pension tax-free.

---

## Updating the figures each year

All rates live at the **top of `app.js`** in clearly-labeled tables. Edit these once a
year (the file tells you where each comes from):

| Constant | What it holds | Source |
|---|---|---|
| `VA_BASE`, `VA_ADD` | VA disability compensation + dependent add-ons | VA.gov (effective Dec 1) |
| `FED`, `FICA` | Federal brackets, standard deduction, payroll tax | IRS / SSA |
| `STATES` | Approx. state income-tax rate + military-retirement exemption | state revenue depts. |
| `PAY` | Monthly basic pay by grade × years of service — **exact official 2026 DFAS table** (3.8% raise) | DFAS 2026 pay table |
| `BAS_ENL`, `BAS_OFF` | Flat enlisted / officer subsistence — **exact official 2026 rates** ($476.95 / $328.48) | DoD 2026 BAS |
| `BAH_ZIP3`, `BAH_GRADE_MULT`, `NAT_E5_BAH` | BAH **estimate** by ZIP region × grade (auto-fills BAH) | DoD BAH calculator |

The tables only **auto-fill** the editable pay fields — base pay & BAS from the chosen
grade + years of service, and **BAH from the duty ZIP** (`BAH_ZIP3` keys on the first 3 ZIP
digits; unknown ZIPs use `NAT_E5_BAH`). **Base pay and BAS are the exact published 2026
figures.** BAH is the one **estimate** — it's location-specific (grade × ~300 housing areas
× dependent status), so the authoritative number is on the member's LES / the DoD BAH
calculator; overwrite the BAH field with that for accuracy.

**Optional benefits start empty.** Education fields (GI Bill housing, post-degree salary,
dependent transfers) stay zeroed and out of the math until the member ticks the matching
checkbox — so the comparison never assumes a benefit they won't use.

> **Base pay and BAS are the exact published 2026 figures.** BAH, VA dependent add-ons,
> and the state-tax rates are simplified estimates, and the federal tax math is intentionally
> approximate. The app is a planning aid, not tax or financial advice — verify specifics with
> a personal financial counselor (free via **Military OneSource**), your finance office, and the VA.

## Files

```
index.html              app shell + input form
styles.css              styling (CSS variables for theming)
app.js                  all logic: tax/VA/pension math, 5-scenario engine, charts, tree, narration
manifest.webmanifest    PWA install metadata
sw.js                   service worker (offline caching)
icons/                  app icons (SVG + PNG)
```
