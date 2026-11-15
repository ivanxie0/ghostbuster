# GhostBuster — design spec ("Night Shift / Paper Trail")

The response to `DESIGN_BRIEF.md` §13. Implement it with `ghostbuster-tokens.css`, which is drop-in for
`app/globals.css`. `preview.html` shows the tokens and the results-page money moments as a static page
(open it in a browser and press the buttons to replay the flip and the verdict).

Everything in brief §3 (rules) and §11 (approved copy) is kept. Copy changes below are limited to the
"directory" wording fixes the brief asked for, marked **[copy fix]**.

---

## 0. Build order (if time runs short, stop after any step)

The deadline is 12:00 PM, so the steps are ranked by what the judges will see.

1. **Tokens + fonts** (`ghostbuster-tokens.css`, §2). This alone fixes the low-contrast mono text (issue 5). ~20 min
2. **Copy fixes**: the "directory" wording (§1.4). ~15 min
3. **Results page**: header strip, action slot, provider row + deadline ruler, row flip, paper verdict (§4.3, §5). ~2 h
4. **Mobile footer fix** (§4.1.5). ~20 min
5. **Ghost Map fake-mode state + hide links in fake mode** (§4.6). ~20 min
6. Search form polish, packet header, How it works, demo panel (minor restyles). Whatever time is left

Don't restyle the landing story beyond the token swap. It already works and mostly matters for the video.

---

## 1. Direction

### 1.1 Two options considered

- **A. Night Shift.** Refine the current charcoal theme: fix contrast, simplify the results header, and make
  the row flip bigger. Low risk, but it doesn't add an idea.
- **B. Paper Trail.** Dark paper in a white theme: switch everything to a cream "legal pad" look. It reads
  well on a projector, but it throws away the palette you asked for twice and becomes yet another light editorial site.

### 1.2 Chosen: **Night Shift / Paper Trail**, a hybrid with a meaning behind it

> **The ghosts live in the dark. The evidence comes out on paper.**

- Everything **live and uncertain** (the search, the scanning, the calls) happens on the charcoal
  "night shift" surface you liked, with the terracotta ghost.
- Everything that is **evidence** (the problem story sheets, the verdict and the packet) is printed on a
  cream **paper sheet** with near-black ink, a red rubber stamp and ruled lines.
- So the climax of the demo literally turns into paper: when the run finishes, the verdict prints onto
  a paper sheet over the dark mission control, gets stamped, and the "Open grievance packet" button leads
  to the same paper in the packet viewer. The site and the packet finally match (fixes issue 7), and the
  story holds together for judges without anyone having to explain it.

**Mood references (descriptions):** a night-shift case worker's desk lamp on a dark room; a court clerk's
date stamp; dot-matrix call logs; Claude's charcoal/cream/terracotta palette; the ASCII and box-rule
language of the aubreyasta reference.

**Why it fits:**
- *A patient-advocacy tool.* Paper, stamps and ledgers mean "this is a record you can use". It feels calm
  and official instead of "AI startup". There are no stat cards and no pastel callouts.
- *A 3-minute live demo.* There are three high-contrast changes a judge can see from two metres: a row
  turns red with a bar shooting past a marker, a sheet of paper appears, and a stamp lands. Each one is a
  big change in brightness, not a small change in colour.

### 1.3 Design rules (the "taste" in one list)

1. **No stat cards.** Numbers go inline in sentences, in a ledger with dotted leaders, or in an ASCII box rule.
2. **One accent.** Terracotta is the brand and the call to action. The status colours are only used for status.
3. **Mono = data, serif = statements, sans = instructions.** Never mono for sentences people must read.
4. **No text below `--text-3`.** Don't fade text with opacity. Use the solid tokens.
5. **Status is never colour alone.** Every status has a glyph and a word.
6. **The ghost is the mascot, not decoration.** It appears in 4 planned places (§7), never as filler.

### 1.4 Copy fixes **[copy fix]** (data-source rule, brief §3.10 and issue 1)

| Where | Old | New |
|---|---|---|
| Search button | Check my directory → | **Check providers near me →** |
| Landing step 1 | Check the directory — We pull your plan's listed providers | **Check providers near you** — We pull licensed providers near you from the national provider registry, then use Bright Data to check each one's public profile. |
| Results list heading | Listed in the {insurer} directory | **Licensed {specialty plural} near {zip}** · sub (mono, text-3): `from the national provider registry` |
| Activity line 1 | Searching the {insurer} directory for therapists near 92103 | **Finding licensed therapists near 92103 in the national provider registry** |
| Activity line 2 | Found 10 listed providers. Cross-checking public profiles… | **Found 10 licensed providers. Checking each public profile…** |
| Tally label | listed | **found** |
| Packet stat box (Jai) | Listed in directory | Suggest **Providers found** (needs Jai's OK) |

The hero ("Your insurance directory is full of *ghosts.*") and the problem story are about the real-world
problem, so they stay.

---

## 2. Tokens

All values are in `ghostbuster-tokens.css`. Contrast ratios were checked (WCAG relative luminance) against the surface they are used on.

### 2.1 Colour: night surfaces (default)

| Token | Hex | Use | Contrast |
|---|---|---|---|
| `--night` | `#262624` | page background | n/a |
| `--night-1` | `#30302e` | raised panels, selected row | n/a |
| `--night-2` | `#3a3936` | inputs, hover on panels | n/a |
| `--night-deep` | `#1c1c1a` | transcript well, log well | n/a |
| `--line` | `rgba(250,249,245,.12)` | hairlines | n/a |
| `--line-strong` | `rgba(250,249,245,.24)` | input borders, row borders | n/a |
| `--text` | `#faf9f5` | primary text | 14.4 : 1 on night |
| `--text-2` | `#d9d6cc` | body, secondary | 10.4 : 1 |
| `--text-3` | `#aeaa9f` | labels, metadata (**the floor**) | 6.5 : 1 on night, 5.7 on night-1 |
| `--accent` | `#d97757` | buttons, ghost, brand | 4.9 : 1 (large/UI only) |
| `--accent-text` | `#e08a6c` | accent words in text | 5.8 : 1 |
| `--on-accent` | `#141413` | text on terracotta buttons/footer | 5.9 : 1 |

**Buttons use dark ink on terracotta**, not white (white on `#c96442` is 3.9 : 1, which fails AA).

### 2.2 Colour: provider statuses on night

| Status | Token | Hex | Glyph | Label | Contrast (night / night-1) |
|---|---|---|---|---|---|
| `ghost` | `--st-ghost` | `#a39f95` | `◌` | Ghost / Confirmed ghost | 5.6 / 4.9 |
| `unverified` | `--st-unverified` | `#c9c5ba` | `·` | Not checked | 8.8 / 7.7 |
| `calling` | `--st-calling` | `#9db2ff` | `)))` (animated) | Calling… | 7.4 / 6.5 |
| `available` | `--st-available` | `#7fd1a2` | `✓` | Available | 8.3 / 7.3 |
| `violation` | `--st-past` | `#ff8f7a` | `!` | Past legal deadline | 6.8 / 6.0 |
| `no_answer` | `--st-noanswer` | `#e8bf6a` | `–` | No answer | 8.7 / 7.6 |

Each status also has a `-bg` tint (the colour at 14% alpha) for badges and the flipped row's wash.
The demo tag and notices use `--st-noanswer` (amber), because amber means "caution: read this".
Demo tags always carry the word "Demo".

### 2.3 Colour: paper (evidence: story sheets, verdict, packet)

| Token | Hex | Use | Contrast on paper |
|---|---|---|---|
| `--paper` | `#f6f1e7` | sheet | n/a |
| `--paper-2` | `#ece5d6` | ruled bands, table header | n/a |
| `--paper-rule` | `#d6cdb9` | ruled lines, dotted leaders | n/a |
| `--ink` | `#141413` | text | 16.4 : 1 |
| `--ink-2` | `#45423b` | body | 8.9 : 1 |
| `--ink-3` | `#6b675d` | metadata (floor) | 5.0 : 1 |
| `--stamp` | `#b3361f` | stamp, past-deadline on paper | 5.4 : 1 |
| `--ink-available` | `#1f7a4a` | available on paper | 4.7 : 1 |
| `--ink-noanswer` | `#8a5a00` | no answer on paper | 5.3 : 1 |
| `--ink-accent` | `#a8472b` | serif italic accent on paper | 5.2 : 1 |

### 2.4 Type

Load with `next/font/google`:

| Role | Font | Weights |
|---|---|---|
| Display (statements) | **Newsreader**, opsz axis | 400, 500, italic 400 |
| UI and body | **Public Sans** (a civic, government-form feel; replaces Inter) | 400, 500, 600 |
| Data, labels, ASCII | **JetBrains Mono** | 400, 500, 700 |

Public Sans is a deliberate swap: it reads as "public service", not "SaaS". If it causes any trouble,
Inter is a zero-risk fallback. The scale has no dependency on the font.

Scale (the root stays 16px; the demo runs at 150%, so a 17px body appears as roughly 25px):

| Token | Size / line height | Font | Use |
|---|---|---|---|
| `--fs-hero` | `clamp(2.75rem, 6vw, 5rem)` / 1.02 | Newsreader 400, tracking -0.02em | landing hero, footer headline |
| `--fs-display` | `clamp(2rem, 3.6vw, 3rem)` / 1.08 | Newsreader 400 | verdict headline, page titles |
| `--fs-h2` | `clamp(1.5rem, 2.4vw, 2rem)` / 1.15 | Newsreader 400 | section titles, consent title |
| `--fs-h3` | 1.25rem / 1.3 | Public Sans 600 | provider name, card heads |
| `--fs-body` | 1.0625rem (17px) / 1.6 | Public Sans 400 | body |
| `--fs-small` | 0.9375rem (15px) / 1.5 | Public Sans 400 | row detail, notes |
| `--fs-label` | 0.8125rem (13px) / 1.3, uppercase, tracking 0.08em | JetBrains Mono 500 | labels (**never smaller**) |
| `--fs-data` | 0.9375rem (15px) / 1.5 | JetBrains Mono 400 | log, case line, dates |
| `--fs-num` | `clamp(2rem, 3vw, 2.75rem)` / 1 | Newsreader 400, tabular | inline counts |

Italic serif words in `--accent-text` (on night) or `--ink-accent` (on paper) give emphasis, as now.

### 2.5 Space, radius, elevation

- **Space:** a 4px base. Tokens 1=4, 2=8, 3=12, 4=16, 5=24, 6=32, 7=48, 8=64, 9=96. Page gutter is
  `clamp(16px, 4vw, 48px)` and max content width is 1200px.
- **Radius:** `--r-sm` 4px (badges, inputs), `--r-md` 8px (panels, rows), `--r-paper` 2px (paper is
  nearly square-cornered, so it reads as paper). Pills are only used for the phase indicator and the demo pill.
- **Elevation:** night panels get no shadow, only a 1px `--line`. Paper gets
  `--shadow-paper: 0 1px 0 rgba(0,0,0,.25), 0 18px 40px -12px rgba(0,0,0,.55)` so it lifts off the dark page.
- **Focus:** `outline: 2px solid var(--text); outline-offset: 3px` on night, and `--ink` on paper.
  Terracotta buttons get the cream outline. It is always visible and never removed.

### 2.6 Motion

| Token | Value | Use |
|---|---|---|
| `--dur-1` | 120ms | hover, press |
| `--dur-2` | 240ms | badge swaps, log line in |
| `--dur-3` | 420ms | row flip |
| `--dur-4` | 700ms | paper print, sheet slide |
| `--ease-out` | `cubic-bezier(.2,.8,.2,1)` | entrances |
| `--ease-snap` | `cubic-bezier(.3,1.4,.5,1)` | stamp, flip settle (slight overshoot) |
| `--ease-io` | `cubic-bezier(.65,0,.35,1)` | scroll-driven moves |

Under `prefers-reduced-motion: reduce`, every animation becomes a 1ms opacity change and the transforms
are removed (see §8). The state change is still visible through colour, glyph and text.

---

## 3. Global chrome

### 3.1 Crisis banner (every page, sticky top, z 50)
- Height 40px, background `--night-deep`, bottom border `--line`, centred.
- Text: `In crisis? Call or text` **`988`** `— the Suicide & Crisis Lifeline, 24/7`. The 988 is a
  `tel:988` link in `--text` with weight 600, underlined (2px offset). The rest is `--text-2` at `--fs-small`.
- At 375px it wraps to 2 lines with no truncation. It is hidden with `@media print`.

### 3.2 Header
- 56px, `--night`, bottom border `--line`.
- Left: the wordmark **Ghost**Buster in Newsreader 500 at 22px (`Ghost` in `--text`, `Buster` in
  `--accent-text`), next to a 3-line mini ASCII ghost (§7.2) at 9px mono.
- Right: `How it works` (and `Ghost Map`, only when not in fake mode), as text links at `--fs-small` in
  `--text-2`, then a divider, then the mono label `Evidence log + templates · not legal advice` in `--text-3`.
- At 375px it shows the wordmark plus `not legal advice` only (the label must stay visible) and the nav moves to the footer.

### 3.3 Demo pill + panel (operator overlay)
See §6.13.

---

## 4. Screens

Breakpoints: `sm` ≤ 640, `md` 641–1023, `lg` ≥ 1024.
**Design for the real demo viewport:** a 1440×900 laptop at 150% zoom is **960×~520 CSS px**
after browser chrome. That is the `md`/`lg` boundary and it is short. Every money moment must fit in 960×520. The specs below say what is above the fold at that size.

### 4.1 Landing `/`
The structure stays as it is (the user liked it). Changes:

1. **Hero.** Night. Label `For California HMO & Medi-Cal members` (mono label, `--accent-text`).
   Headline at `--fs-hero`, with *ghosts.* in italic `--accent-text`. Sub at `--fs-body` in `--text-2`.
   Primary button **Find care →** and `Takes about a minute. No account.` in `--text-3`.
   ASCII ghost on the right (§7.1), at 48% width on lg. On sm it sits *above* the headline, scaled to
   60% width, with a gentle float. Add a second text link `See how it works` beside the button.
2. **The problem sheet becomes paper.** The sheet that slides up over the pinned hero is now `--paper`
   with `--ink` text: the problem is evidence. The sticky step headings keep their mechanics. Step numbers
   are mono `01 / 04` in `--ink-3` (no longer faint). The ASCII illustrations (directory, call log,
   calendar, tally) are printed in `--ink-2`, with the "bad" bits in `--stamp` (e.g. `DISCONNECTED`,
   `day 29`, `appointments: 0`), as if marked up with a red pen.
   Pitch facts (optional, exact wording from brief §11) go at the end of step 04 as footnoted lines with
   superscript sources. The JAMA line must keep "five states, not California".
3. **What GhostBuster does.** Back to night (the sheet ends with a torn-edge divider, a 12px CSS
   zigzag mask). Title "We make the calls. You keep the receipts." The 3 steps are a horizontal
   **numbered path** joined by a dashed mono line `- - - ->`, not cards. Each step has a mono number,
   an h3 and a small sentence. Use **[copy fix]** step 1. The two outcomes are two *ledger lines*, not boxes:
   `If someone can see you ........ We show you who, when, and the number to call to book.`
4. **What to know.** A 2×2 grid on lg and a stack on sm. Each item is an h3 plus a body line with a
   mono glyph in front (`[AI]`, `[§]`, `[!]`, `[demo]`). No borders, just a top hairline per item.
5. **Revealed terracotta footer: fix for mobile (issue 2).**
   - Use `min-height: 100svh`, never `height`. Content uses padding instead of being centred in a fixed box.
   - The headline "Find out who's really there." is `font-size: clamp(2.25rem, 9vw, 5rem)` with
     `overflow-wrap: anywhere` off and normal wrapping. At 375px it wraps to 3 lines and is never clipped.
   - The ASCII box rules (`+-- START HERE ---+`) are built as **CSS**, not literal strings:
     a `fieldset` with a `legend` styled as `+-- START HERE` in mono, and a 1px dashed `--on-accent` border.
     That keeps the look but lets the text wrap. Literal ASCII rule strings are only allowed with
     `white-space: nowrap; overflow: hidden` on a decorative `aria-hidden` line.
   - The big ASCII ghost is `display:none` below 640px (the hero already has one).
   - Reveal mechanics: on sm, if the footer is taller than the viewport, **turn the reveal off**
     (`position: static`). Use a `matchMedia('(max-width: 640px)')` check, or just CSS
     `@media (max-width:640px){ .footer-reveal{position:static} .page-above{margin-bottom:0} }`.
   - The 988 block inside the footer: `IN CRISIS?` legend, then "Call or text **988** — Suicide & Crisis
     Lifeline, 24/7" at `--fs-body`, wrapping.

### 4.2 Search `/search`
- Night page, centred column at max 640px. Title `Find care` (`--fs-display`), sub at `--fs-body`.
- The form sits **directly on the page** (no card box). Each field is a row: mono label on top, control
  below, hint to the right of the label (right-aligned, `--text-3`). Rows are separated by 24px with no hairlines.
- Fields as in the brief. The segmented controls follow §6.2.
- **Deadline hint** next to "Appointment": `Legal deadline: 10 business days` in mono, with the number in
  `--text`. It updates with a 240ms flip (§8) when specialty or appointment type changes. This is a nice touch: the law shows up live.
- **Coverage note:** below Plan type. HMO/Medi-Cal: a plain `--fs-small` paragraph in `--text-2` with
  the expander. PPO/Not sure: a **notice** (§6.10, amber) with the title `Check before relying on these
  deadlines` and the same text. Copy is unchanged.
- Submit: full-width on sm, auto width on lg, **Check providers near me →** **[copy fix]**. Busy label:
  `Starting…` with the 3-dot mono spinner (§6.1).
- Error: below the field that has the problem, `--st-past` with a `!` glyph, and `aria-describedby` wired up.
- 960×520 check: Insurance, plan type and ZIP are above the fold. With the preset (Shift+D) the demo skips this page anyway.

### 4.3 Results `/results/[id]`: the core screen

**The fix for issue 3:** the front-loaded header is replaced with one **case strip** and one **action slot**,
so the provider list is visible above the fold at 960×520 in every phase.

```
┌ case strip ─────────────────────────────────────────────────────────────────┐
│ FILE GB-327D24 · Blue Shield of California · HMO · 92103   [◉ Calling offices]│
│ Therapists, legal limit 10 business days                    [Demo data]  Map→ │
│ 10 found · 5 ghosts · 3 of 5 called · 2 past deadline    (inline mono counts) │
└──────────────────────────────────────────────────────────────────────────────┘
┌ action slot (changes per phase) ─────────────────────────────────────────────┐
└──────────────────────────────────────────────────────────────────────────────┘
┌ provider list (7/12) ──────────────────┐ ┌ transcript (5/12, sticky) ───────┐
│ rows…                                   │ │                                  │
│                                         │ ├ live activity ────────────────── ┤
└─────────────────────────────────────────┘ └──────────────────────────────────┘
legal caveat line (always visible, under the list header too, see below)
```

**Case strip** (night, no box, bottom hairline):
- Line 1: case line in mono `--fs-data` `--text-3`, with `FILE GB-327D24` in `--text-2`; the **phase indicator** (§6.11) is on the right.
- Line 2: title at `--fs-h2`: `Therapists,` *`legal limit 10 business days`* (italic, accent). Right side: demo tag + `San Diego Ghost Map →` (hidden in fake mode, §4.6).
- Line 3: **the count line**, one sentence of inline numbers: `10 found · 5 ghosts · 3 of 5 called · 2 past deadline`.
  Each number is in `--fs-num` Newsreader with its colour: ghosts `--st-ghost`, past deadline `--st-past`,
  and the called count in `--st-calling` while calling. The words are mono `--fs-label` in `--text-3`
  under the numbers. On sm it wraps into 2×2. Numbers flip when they change (§8).
  This **replaces** both the "5 of 10 listings appear unavailable" sentence and the 4-cell tally
  (they said the same thing twice).

**Legal caveat** (rule §3.11, always visible): placed directly under the list header as a single line,
`§ A provider can lawfully set a longer wait if they note in your record that it won't harm your
health. Telehealth appointments count.` in `--fs-small` `--text-2`, with a `§` glyph in `--accent-text`.
It is also repeated inside the paper verdict as a footnote.

**Action slot** by phase:

| Phase | Action slot content | Height at 960 |
|---|---|---|
| `scraping` | One line: `Scanning public profiles…` + an indeterminate ASCII scan bar `[=====>      ]` moving (mono, `--st-calling`) + `This takes about 10 seconds.` | 48px |
| `verifying`, nothing called | **Consent card** (§6.9), expanded | ~360px; the page auto-scrolls so the card's button is in view |
| `verifying`, nothing callable | Line: `No listings left to call. Every provider found appears unavailable.` → Ending B still runs on the backend | 48px |
| calling | **Call progress line**: `◉ Calling 5 offices · 2 done` + a 5-segment mono bar `[■■□□□]`, one segment per office, each segment coloured by result as it lands | 48px |
| `done` → Ending A | **Ending A** paper sheet (§6.12b) | ~320px |
| `done` → Ending B | **Verdict** paper sheet (§6.12a), printed in (§5.2) | ~420px |
| error | Connection notice (§6.10) above the strip, the rest unchanged | +48px |

The point of keeping the slot to one line while calling: at 960×520, the case strip (~150px) and the
call progress line (48px) leave about **5 provider rows visible**, which is all the called ones. The
judges watch the rows flip.

**Provider list** order: keep the backend order, but **sort callable rows first** once consent is given
(unverified/calling/resolved first, ghosts after), so the rows being called sit together at the top. Do
this with a stable sort on status group. Ghost rows collapse to a compact single line (§6.6) to save height.

**Right panel** (lg: sticky top 104px = banner + header; max-height `calc(100svh - 120px)`; split 60/40):
- **Call transcript** (§6.7, §6.8) on `--night-deep`.
- **Live activity** (§6.8), a mono log on `--night-deep`, with the newest line at the bottom and auto-scroll unless the user has scrolled up.
- md (641–1023, which **includes the 960 demo viewport**): keep 2 columns, but the right panel uses
  `minmax(300px, 5fr)`; the transcript bubbles go full width and the agent/office labels sit above the text.
- sm: one column. Order: case strip → action slot → list → transcript → activity. Tapping a row scrolls to the transcript with a `← back to list` link.

**Other states:**
- *Loading:* the case strip skeleton plus 6 row skeletons (night-1 blocks with a slow 1.6s shimmer, none under reduced motion). The phase pill shows `Loading`.
- *Empty while scraping:* 6 row skeletons, each with a mono `◌ ░░░░░░░░░░░░` placeholder.
- *Connection error:* a notice above the strip: `Connection issue: {message} — retrying…` with a live 2s countdown dot. Nothing else changes, and the last data stays on screen.
- *Expired:* the action slot is replaced by a centred block: small ASCII ghost (§7.3, the "fading" variant), `This search has expired`, `The server restarted. Start a new search.`, and a **New search** button. The list and panel are hidden.

### 4.4 Packet `/packet/[id]`
- The sticky header stays on night: `← Back to results` · title `Your timely access grievance`
  (`--fs-h2`) · sub (mono) · on the right, the **English / Español** segmented control (§6.2) · `Save as PDF ↓`
  (solid) · `Download .html` (outline).
- Body: the iframe sits on night as a **paper sheet** (`--paper`, `--shadow-paper`, max width 860px,
  centred, 48px top margin). It is the same sheet as the verdict, so the move from verdict to packet feels continuous (§5.3).
- Spanish note: a notice above the sheet: `Borrador de traducción — revise con un hablante fluido / Draft translation.`
- Footer line under the sheet: `Evidence log + templates, not legal advice. Review and fill in your member ID before sending.` in `--text-2`.
- sm: the header wraps to 2 rows (back + title, then controls) and the sheet goes full-bleed with 12px padding.

### 4.5 How it works `/how`
- Keep the snake diagram, restyled: nodes are mono labels in 1px `--line-strong` boxes with `--r-sm`;
  **AI nodes** (Gemini ×2, ElevenLabs) get a `--st-calling` dashed border; **deterministic** nodes (rules
  engine, packet) get a solid `--text` border; the "Grievance packet" node is a small **paper** chip. Add a
  2-item legend: `- - - AI step (extraction only)` and `——— deterministic code`. That makes the "no AI decides the law" point at a glance.
- Arrows: 1px `--text-3` with mono arrowheads. The caption stays.
- The 5 cards become a numbered list (a mono number, an h3 in Public Sans 600, and the body). There are no boxes; top hairlines separate the items.
- sm: the diagram turns into a vertical list of nodes with `↓` between them (same SVG with a different viewBox, or plain HTML).

### 4.6 Ghost Map `/map` (fixes issue 4)
- **Fake mode:** hide the `Ghost Map` links in the header, results and footer when `/api/health` reports fake mode (the demo panel already knows this).
- If someone opens `/map` in fake mode anyway, show the **schematic map at 40% opacity** with the ZIP
  markers as hollow `◌`, and over it a centred paper card:
  `The Ghost Map needs the live database.` / `This build is running in demo mode, so there's nothing real to map yet.` /
  `From the last live run: Blue Shield · 92103 · therapists — 90 licensed providers checked, 5 appear unavailable.`
  (label it with a mono `SNAPSHOT · live run` and the date; use only if that pre-warmed run is real, which the brief says it is) / buttons `Start a search` and `How it works`.
- **Real mode:** the scorecard table uses mono numbers and inline bars made of block characters `█▏`
  (`--st-ghost` for unavailable, `--st-past` for past deadline), max 20 chars wide. Demo rows carry the
  `Demo` tag and the "not called (calls only go to our test phones)" caption. The ZIP SVG keeps the same
  markers: circle size by provider count, fill `--accent` at 30%, stroke `--accent`, and the selected ZIP gets a cream ring.

---

## 5. The money moments

### 5.1 Moment 1: the list fills in, ghosts struck through
- As providers arrive, each row enters with `rise` (8px up and fade, 240ms, staggered 60ms by index; re-renders don't replay it because the key is the provider id).
- When a row becomes `ghost`: a 2px `--st-ghost` **strike line draws left to right** across the name
  (a `::after` with scaleX 0 to 1, 420ms), then the row dims to its ghost style and collapses to one line.
  The `◌ Ghost` badge appears. The strike is visible from across the room.
- The count line's ghost number flips up by one.

### 5.2 Moment 2: the live call, then the row flips (designed for 2 metres)
**While calling** (row state `calling`):
- A 3px left edge in `--st-calling` with a soft pulse (opacity .5 to 1, 1.2s).
- Badge: `))) Calling…`; the `)))` animates as three arcs lighting in sequence (§8).
- Detail: `AI assistant is on the line…` in `--st-calling`.
- The transcript panel auto-selects this row and shows the equalizer (§6.7).

**On resolve to past deadline** (the moment the judge hangs up and the webhook lands):
1. 0ms: the **status cell flips** (rotateX 0 to -90deg, swap content, -90 to 0, 420ms total, `--ease-snap`).
   The badge becomes `! Past legal deadline` on an `--st-past-bg` tint.
2. 0–420ms: the whole row gets a **wash**: background goes from `--st-past-bg` at 2× strength to the
   resting tint over 1.2s. That big brightness change is what a judge's eye catches.
3. 200ms: the **deadline ruler** draws (§6.5): the bar grows from 0 to the wait (600ms, `--ease-out`)
   and passes the white **limit tick** at 10. The part beyond the tick turns `--st-past`. The numbers
   `Dec 15 · 20 business days` are in `--fs-h3` with `20` in `--st-past`; `limit 10` sits under the tick.
4. The call progress segment for this office fills red, and the count line's "past deadline" number flips.
5. The transcript panel swaps the equalizer for the transcript (bubbles enter one by one, 80ms stagger), and its own Wait vs Limit ruler draws large.

On resolve to **available**, the same sequence runs in green with `✓ Available`, and the bar stops short of the tick.
On **no answer**, the badge flips to `– No answer` in amber, with **no ruler** (it is never treated as past deadline) and the detail text `No answer / no usable appointment date`.
On **confirmed ghost**, the strike draws (5.1) and the badge flips to `◌ Confirmed ghost`.

Implementation note: the flip must survive the 2s polling. Key the status cell on `${id}-${ghost_status}` so it remounts only when the status changes, as you do now.

### 5.3 Moment 3: the verdict prints
When `status` becomes `done` with no available provider:
1. The call progress line fades out (240ms).
2. The **paper verdict sheet** (§6.12a) appears in the action slot, revealed **top to bottom** like
   paper feeding out of a printer: `clip-path: inset(0 0 100% 0)` to `inset(0 0 0 0)` over 700ms with
   `--ease-io`, plus a 6px translateY settle. The page auto-scrolls so the sheet top sits 16px under the header (smooth, 600ms).
3. Then 750ms: the **stamp** lands: `PAST DEADLINE` / `×4 OFFICES · LIMIT 10 BUSINESS DAYS`, in `--stamp`
   on paper, rotated -6deg, scale 1.6 to 1 with `--ease-snap` over 280ms, with a 1px offset ghost
   impression at 25% opacity behind it for ink texture. This is the beat where the presenter pauses.
4. Then 1100ms: the ledger rows fill in one by one (80ms stagger), with dotted leaders, and the **Open grievance packet →** button arrives last.

### 5.4 Moment 4: opening the packet
- Clicking **Open grievance packet →** gives the button a 120ms press, then navigates. On the packet page,
  the paper sheet slides up from 24px below with a fade (420ms). It is visually the same paper as the
  verdict, so it reads as "the verdict became the document".
- Optional, if time allows: use the View Transitions API (`document.startViewTransition`, which Next 15
  supports through `next/navigation` plus CSS `view-transition-name: paper`) on both the verdict sheet and
  the packet sheet, so the paper morphs between pages. Skip it if it is fiddly. The slide-up is enough.

---

## 6. Components (with states)

Shared interactive states:
- **hover:** background or border steps up one level (`--night-1` to `--night-2`), 120ms.
- **focus-visible:** a 2px cream outline, offset 3px.
- **active:** translateY(1px).
- **disabled:** `--text-3` text, dashed border, `cursor: not-allowed`. Never just lower opacity.
- **busy:** the label is swapped and the mono dots `·` `··` `···` cycle at 400ms; `aria-busy="true"`; clicks are disabled.

### 6.1 Buttons
| Variant | Default | Hover | Notes |
|---|---|---|---|
| `.btn-primary` | bg `--accent`, text `--on-accent` (Public Sans 600, 17px), padding 14×22, radius `--r-sm`, a trailing `→` that nudges 3px on hover | bg `#e4876a` | CTAs: Find care, Check providers, Yes check these N, Open grievance packet |
| `.btn-outline` | 1px `--line-strong`, text `--text`, transparent | bg `--night-1`, border `--text-3` | secondary |
| `.btn-paper` | on paper: bg `--ink`, text `--paper` | bg `#2b2a27` | the Open packet button inside the verdict |
| `.btn-link` | text with a 1px underline at 3px offset | underline gets thicker | Map →, Source ↗ |

Minimum target size is 44×44 everywhere.

### 6.2 Segmented control
- A container with a 1px `--line-strong` border, `--r-sm`, a `--night-1` background and 4px padding.
- Options are mono `--fs-data` buttons, padding 10×14, using `role="radiogroup"` and `radio` with arrow-key navigation.
- Selected: bg `--text`, text `--night`, weight 500. That is high contrast and readable from a distance.
- Hover (unselected): bg `--night-2`. Focus: the cream outline on the option.
- Disabled option (Follow-up when not a therapist): hide it, as now. Don't show it disabled.
- sm: allow wrapping to 2 rows (`flex-wrap`) with equal widths.

### 6.3 Select and input
- Height 48px, bg `--night-2`, 1px `--line-strong`, radius `--r-sm`, text `--text` at 17px. Placeholder `--text-3`.
- ZIP: mono with letter-spacing .12em, `inputmode="numeric"`, `maxlength=5`.
- Select: native `<select>` with `appearance:none` and a mono `▾` chevron.
- Focus: border `--text` plus the outline. Error: border `--st-past`, with the message below it with a `!`.

### 6.4 Status badge
- Inline-flex, mono `--fs-label` (uppercase, tracked), padding 4×8, radius `--r-sm`, **tint bg + coloured
  text + glyph**: `◌ GHOST`, `· NOT CHECKED`, `))) CALLING…`, `✓ AVAILABLE`, `! PAST LEGAL DEADLINE`, `– NO ANSWER`, `◌ CONFIRMED GHOST`.
- Large variant (in the transcript panel): `--fs-small` and padding 6×10.

### 6.5 Deadline ruler (new: the visual that makes "past deadline" obvious)
```
Dec 15 · 20 business days
[██████████|██████████          ]
           ^ limit 10
```
- A track of 100% width, 10px tall, `--night-2`, radius 2. The scale is `max(30, wait + 2)` business days.
- Fill up to the limit in `--text-2`; beyond the limit in `--st-past`. For available, the whole fill is `--st-available`.
- The limit tick is a 2px `--text` line, 18px tall, with the mono label `limit 10` below it in `--text-3`.
- Accessible text: `aria-label="20 business days, limit 10"`; the bar itself is `aria-hidden`.
- Used in: provider rows (compact, 6px), the transcript panel (large, 14px, with the numbers in Newsreader `--fs-num`), and the verdict (a mini ruler per office).
- Implementation is a simple flex with two `div`s whose widths are percentages. No library.

### 6.6 Provider row
- Grid: `[edge 3px] [name + detail] [badge]`, padding 16×18, radius `--r-md`, 1px `--line`, bg `--night`; hover bg `--night-1`; **selected**: bg `--night-1`, border `--text-3`, and a 3px left edge in the status colour.
- Name: `--fs-h3` `--text`. Detail: `--fs-small` `--text-2`. Use `--text` for emphasised numbers.
- **Demo** tag after the name (§6.10).
- Profile-checked rows: a mono line `Source ↗ · checked Nov 15, 2026` in `--text-3`, with the link underlined.
- **Ghost (compact):** one line. The name is struck through (2px `--st-ghost` line) in `--st-ghost`, the reason
  is shown after an em dash in `--text-3`, truncated with an ellipsis on lg and wrapping on sm, and the
  badge sits on the right. Height ~48px against ~84px for active rows.
- **Calling:** described in 5.2. **Resolved:** with the ruler, height ~108px.
- The whole row is a `<button>` (or `role="button"` with key handling) that selects the provider, with `aria-pressed` for the selected row.

### 6.7 Transcript panel
- Head: name (`--fs-h3`), masked phone `(•••) •••-4529` · address (`--fs-small` `--text-2`), large badge on the right.
- Wait vs limit: the large ruler (6.5) with `WAIT 20 business days` and `LEGAL LIMIT 10 business days` labels above, numbers in Newsreader.
- **Calling:** an equalizer of 7 mono bars `▁▃▅▇▅▃▁` animated in `--st-calling`, plus `Live call in progress — transcript arrives when the call ends.`
- **Profile ghost:** `Not called — this listing is a ghost: {reason}.` plus `Profile checked · {host} ↗` and the date.
- **Confirmed ghost:** `Confirmed on the call: listed, but not accepting this plan/new patients.`
- **Bubbles:**
  - `Agent:` bubble aligned left, bg `rgba(157,178,255,.12)`, 1px `--st-calling` at 40%, label `AI ASSISTANT` (mono label in `--st-calling`), text `--text` at `--fs-small`.
  - `Office:` bubble aligned right, bg `--night-1`, 1px `--line-strong`, label `OFFICE` in `--text-3`.
  - System lines like `(no answer — voicemail box full)`: centred, mono, `--text-3`, with dashes on both sides `— no answer — voicemail box full —`.
  - Max width 88%, radius `--r-md`, 12px gap. Not the solid blue blocks from the current build: they were the loudest thing on screen and they aren't the point.
- Unpinned, it auto-follows; when the user pins a row, show a mono `PINNED · follow live ↻` chip.

### 6.8 Activity log line
- Mono `--fs-data`. Grid `[time 88px] [glyph 16px] [text]`. The time is in `--text-3`, the text in `--text-2`.
- Glyphs: `›` system, `◌` ghost, `)))` call started, `✓` available, `!` past deadline, `–` no answer, `★` user action, `⚠` fallback.
- **User action** ("You approved AI calls to 5 offices."): text in `--text`, weight 500, with the `★` in `--accent-text`.
- **Fallback** lines: text and glyph in `--st-noanswer`.
- New lines slide in from 6px below (240ms). Clicking a line selects the provider; hover gives bg `--night-1`.

### 6.9 Consent card
- Night-1 panel, 1px `--line-strong`, radius `--r-md`, padding 28. A 3px top edge in `--accent`.
- Label `YOUR PERMISSION NEEDED` (mono, `--accent-text`), title `Want us to call the 5 remaining offices?` at `--fs-h2`.
- Approved body copy, with the 3 `✓` lines as a list: glyphs in `--st-available`, bold phrases in `--text` weight 600.
- `Calls are recorded and transcribed…` at `--fs-small`.
- Demo line as a notice row: `[demo] Hackathon demo: calls only go to our own team's test phones.` in amber.
- If real registry providers are mixed in: an extra line `{k} real providers from the registry won't be called.`
- Button: `.btn-primary` **Yes, check these 5 for me** (busy: `Starting calls…`). Bottom right on lg, full width on sm.
- At 960×520: title + 3 ✓ lines + button fit if the body is 2 columns on md/lg (permission text on the left; ✓ list + button on the right).

### 6.10 Notices and tags
- **Notice:** a 4px left edge in amber, bg `rgba(232,191,106,.10)`, padding 14×16, text `--text`, with a mono title line in amber. Used for coverage (PPO/Not sure), the Spanish draft, connection errors (red variant: edge and title in `--st-past`), and expired.
- **Demo tag:** mono label `DEMO DATA — FICTIONAL PROVIDERS` (header) or `DEMO` (per row), amber text, 1px amber dashed border, radius `--r-sm`. It is dashed on purpose: dashed means "not real".

### 6.11 Phase indicator
- A pill: 1px border in the phase colour, mono `--fs-label`, and a leading dot.
- `Scanning profiles` (**[copy fix]** for "Scanning directory"): `--st-calling`, the dot pulses.
- `Ready to call`: `--accent-text`, steady dot.
- `Calling offices`: `--st-calling`, with the `)))` animated glyph instead of the dot.
- `Complete`: `--text-2`, `✓`.
- The label swaps with a 240ms flip.

### 6.12 Endings
**a. Ending B: the paper verdict** (the demo ending)
```
┌ paper ─────────────────────────────────────────────────────────────── ┐
│ FINDING · TIMELY ACCESS GRIEVANCE READY            ╔══════════════╗   │
│ No provider we reached could offer a               ║PAST DEADLINE ║   │
│ timely appointment.                                ║×4 · LIMIT 10 ║   │
│ You can now ask your plan to arrange timely care,  ╚══════════════╝   │
│ including out-of-network at in-network cost.                          │
│ ───────────────────────────────────────────────────────────────────── │
│ Offices reached ............................................. 5       │
│   Past legal deadline ....................................... 4       │
│   Didn't answer ............................................. 1       │
│ Other listings that appear unavailable ...................... 5       │
│ Legal limit .................................. 10 business days       │
│ ───────────────────────────────────────────────────────────────────── │
│ YOUR PACKET  [x] Evidence log of every call  [x] Grievance letter to   │
│              Blue Shield of California  [x] Phone script  [x] DMHC     │
│ [notice: self-funded PPO warning, if PPO/Not sure]                     │
│ [Open grievance packet →]   Evidence log + template, not legal advice. │
│ § A provider can lawfully set a longer wait… Telehealth counts.        │
└─────────────────────────────────────────────────────────────────────── ┘
```
- Paper, `--shadow-paper`, radius `--r-paper`, padding 36×40 (20 on sm). A faint 28px-pitch ruled background (`repeating-linear-gradient` of `--paper-rule` at 35%), behind the ledger only.
- Label: mono `--ink-3`. Headline: `--fs-display` Newsreader `--ink`, with *timely* in italic `--ink-accent`. Subline: `--fs-body` `--ink-2`.
- Ledger: mono `--fs-data`, dotted leaders (`border-bottom: 2px dotted --paper-rule` on a flex spacer), numbers in `--ink` weight 700, with the past deadline number in `--stamp`. The counts follow the approved Ending B sentence, as rows; include the "said not taking this plan/new patients" row when y > 0.
- Stamp: a top-right box with a 3px `--stamp` double border, mono 700, uppercase, rotated -6deg. On sm it moves above the headline, at smaller size.
- Self-funded notice on paper: a 4px `--ink-noanswer` edge and bg `#f3e6c4`.
- Button: `.btn-paper` **Open grievance packet →**.
- 960×520: after the auto-scroll, the headline, stamp and ledger fit, and the button is one scroll down. That's fine, because the presenter reads the headline and stamp first.

**b. Ending A: good news** (also paper, so evidence stays on paper, but without a stamp)
- Label `GOOD NEWS` in `--ink-available`, then the headline `{Name} can see you {Weekday, Month Day}.` at `--fs-display`.
- `That's {wait} away — within the legal limit of {limit}.` plus a green mini ruler that stops short of the tick.
- Address, then **Call to book · (•••) •••-0110** as `.btn-paper` (a `tel:` link), then the tip line in `--ink-2`.
- `Save the evidence log anyway` as `.btn-link` (only if any offices were past deadline).

### 6.13 Demo control panel (Shift+D)
- Bottom right, 340px wide, `--night-deep`, 1px `--line-strong`, radius `--r-md`, z 60. Role `dialog`, with focus trapped while open and `Esc` to close.
- Title `Demo controls` (mono label) and `Shift+D · Esc` hint.
- Status list: mono rows `Backend ........ Fake mode (in memory)`, with the value coloured green (live/on/configured), amber (fake/simulated/fell back) or `--text-3` (not configured).
- `↺ Reset: preset demo search` as `.btn-outline` at full width; the checkbox `Force fallback to cached data` uses a custom mono `[x]` box.
- **Closed pill:** mono 12px (the one exception to the 13px floor, because it is operator-only) with an amber dashed border: `⚠ Fake mode · simulated data`. Opacity 1. `@media print` hides it.

---

## 7. ASCII and illustration plan

1. **Hero ghost (keep).** The existing `AsciiGhost.tsx` generator stays (a 38×25 grid with the ` .:-=+*#%@` ramp).
   Two upgrades:
   - **Blink:** every ~6s the eye cells swap to `-` for 120ms (rerender just the eye cells). It is subtle and alive.
   - **Hem ripple:** the scalloped hem rows shift their phase by one cell every 400ms (a sine offset), so the bottom of the ghost "waves". Off under reduced motion.
   - Colour `--accent`. On paper (if it is ever used there) it would be `--ink-accent`.
2. **Header mini ghost:** a 3-line, 5-column glyph at 9px mono in `--accent`, next to the wordmark.
   It is decorative (`aria-hidden`):
   ```
   ▄███▄
   █▀█▀█
   ▀▄▀▄▀
   ```
3. **Story illustrations (keep, re-ink):** the four ASCII scenes, printed on paper in `--ink-2`, with red "pen marks" in `--stamp` on the failures (§4.1.2).
4. **Results empty, expired and map-empty:** a **fading ghost** variant: the same generator at 16×11, with the ramp
   reduced to ` .:-` (so it reads faint), in `--text-3`.
5. **Revealed footer ghost:** keep it large in `--on-accent` on terracotta, lg only.
6. **Scan bar, call progress and equalizer:** mono ASCII widgets (`[=====>    ]`, `[■■□□□]`, `▁▃▅▇`), so the ASCII language runs through the live screen rather than only the landing page.

There is no other illustration. No stock icons: glyphs are text.

---

## 8. Motion plan

| Animation | Trigger | Spec | Reduced motion |
|---|---|---|---|
| `rise` | row/log line mount | translateY 8 to 0, opacity 0 to 1, 240ms `--ease-out`, stagger 60ms | opacity only, 1ms |
| `strike` | row becomes ghost | `::after` scaleX 0 to 1 from left, 420ms | instant strike |
| `flip` | badge/number/phase change | rotateX via 2 keyframes, 420ms `--ease-snap`, `transform-origin:center`, `backface-visibility:hidden` | instant swap |
| `wash` | row resolves | bg from 2× tint to tint, 1200ms ease-out | none (tint only) |
| `ruler-grow` | ruler mount | `scaleX` 0 to 1 from left, 600ms, delay 200ms | full bar, instantly |
| `calling-pulse` | calling row edge | opacity .5↔1, 1.2s infinite | steady edge |
| `arcs` | `)))` glyph | each `)` fades in sequence over 900ms, infinite | static `)))` |
| `eq` | equalizer bars | scaleY .3↔1 per bar, 0.9s, staggered | static bars |
| `scan` | scan bar | `=>` head moves across the track, 1.6s linear infinite | the static text `scanning…` |
| `print` | verdict mount | clip-path inset 100% to 0 top-down, 700ms `--ease-io`, plus a 6px settle | opacity fade 1ms |
| `stamp` | 750ms after print | scale 1.6 to 1, rotate -6, opacity 0 to 1, 280ms `--ease-snap` | appears in place |
| `sheet-up` | packet page sheet | translateY 24 to 0 and fade, 420ms | none |
| `ghost-float` | hero ghost | translateY ±6px, 6s ease-in-out infinite | static |
| `ghost-blink`, `hem-ripple` | hero ghost | see §7.1 | off |
| Story sticky headings, sheet slide, footer reveal | scroll | unchanged CSS sticky mechanics | sticky stays (it's layout, not motion); scroll-reveal fades are off |

Implement everything with CSS keyframes and classes plus the existing IntersectionObserver helper.
**No Framer Motion needed.** Every keyframe lives in `ghostbuster-tokens.css`, and the reduced-motion
block at the end of that file neutralises all of them.

---

## 9. Packet document style (optional; for Jai, print-first)

It shares the paper tokens so the iframe matches the verdict:
- `@page { size: Letter; margin: 0.75in }`. Body: Newsreader for headings, Public Sans 10.5pt/1.5 for body, JetBrains Mono 9pt for tables and transcripts. Colours: `--ink` on white for print and `--paper` on screen.
- Top: a boxed notice (1pt black border) with `Evidence log + template — not legal advice` and `In crisis? Call or text 988`, then a dashed `DEMO DATA — FICTIONAL PROVIDERS` box.
- Title `Timely Access Grievance`, with the meta line in mono.
- Replace the 4 stat boxes with the **same ledger** as the verdict (dotted leaders). That matches the site and drops the "stat card" look.
- The overall finding is a single bordered paragraph, with the stamp graphic (CSS, `--stamp`) at top right on screen and plain black when printing.
- Evidence log table: mono, 0.5pt rules, header row on `--paper-2`, and a past-deadline cell in bold with `!`. Don't rely on colour for print.
- Letter: a serif body with room for the member ID (`______________`). Page breaks go before the letter, the phone script and the transcripts.
- Transcripts: `AGENT:` and `OFFICE:` in mono small caps, with the speech indented.

---

## 10. QA checklist before 12:00 PM

- [ ] At 1440×900 with 150% zoom: the results case strip + call progress + ≥4 rows are visible without scrolling while calling.
- [ ] The 988 banner is on every route, including `/packet`, `/how`, `/map` and the expired state, and it is hidden in print.
- [ ] No "directory" in product claims (grep `directory` in `/frontend`; only the hero and story may keep it).
- [ ] No "violation" in any UI string (grep it; the enum value is fine).
- [ ] Phones are masked everywhere except in `tel:` hrefs.
- [ ] The demo tag is visible on the results header and on each demo row.
- [ ] At 375px: no horizontal scroll on any route; the footer headline and 988 line are not clipped.
- [ ] Reduced motion (DevTools → Rendering → emulate): every state is still distinguishable.
- [ ] Production build for the demo (`next build && next start`): no "N" badge. Use a clean Chrome profile with no Grammarly.
- [ ] Ghost Map links are hidden in fake mode.
