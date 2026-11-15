# GhostBuster — design spec v2: "Daylight Paper Trail"

**This builds on v1. It isn't a remake.** Everything in `DESIGN_SPEC.md` still holds: the flow, every screen
and state, the copy fixes, the results-page mechanics (case strip, action slot, row flip, deadline
ruler, paper verdict and stamp, demo panel), the motion plan and every rule in `DESIGN_BRIEF.md` §3. v2
changes only **the skin and the landing page**, so the site reads like a real healthcare product
rather than a portfolio.

Files:
- `ghostbuster-tokens-v2.css`: drop-in replacement for v1 tokens. It keeps the same class names (`.row`, `.badge`, `.ruler`, `.paper`, `.stamp`, `.flip`…), so v1 components reskin without code changes.
- `preview-v2.html`: open it in Chrome. It shows the full landing page, then the results page in the new skin. The two buttons replay the row flip and the verdict.
- `RESEARCH_NOTES.md`: what the research found, with sources (useful for Q&A with judges).

---

## v3 update: less "AI", a real intake flow, an obvious CTA

These research-backed changes **override** anything earlier in this file where the two differ.

**What reads as AI-generated, and the fix**
| Tell (from design write-ups on AI-made sites) | What we did |
|---|---|
| Rows of identical cards (icon + heading + text, ×3) | Removed every card grid. "How it works" is now numbered divider rows; outcomes are a two-column split with a vertical rule; "What to know" is a definition grid with hairlines; the story is alternating photo/text rows. |
| Everything is a pill; soft drop shadows everywhere | Buttons, badges, inputs and segmented controls now have **4px corners**; cards 8px; shadows only on things that float (the search bar, the example card, paper). |
| Small uppercase "eyebrow" labels above every section | Removed. Sections lead with the heading. |
| Boxes inside boxes (the old search form) | One unified search bar with fields split by thin rules, no inner boxes. |

**1. Hero search bar** (Zocdoc/Airbnb pattern: the homepage *is* the search)
- One container with a 2px ink border and 8px radius, plus three segments split by 1px rules: **Insurance company** (select), **ZIP code**,
  **Type of care** (select). Each segment shows a small bold label above a 17px value; clicking anywhere in a segment focuses it;
  the focused segment gets a teal tint and a 3px teal bottom bar.
- Action: a solid teal **"Find care"** block with a magnifier icon, 76px tall, attached to the right edge. Under 1180px wide
  (which includes the 960px demo zoom) the button drops to a full-width row under the fields; on phones everything stacks.
- Under the bar: **Free** · about a minute · no account / We never ask your name or health details / No calls without your OK.
- Submit goes to `/search` with insurer, ZIP and care prefilled, and **starts at the plan-type question**
  (skipped if "Medi-Cal plan" was chosen).

**2. Header CTA:** a solid teal rectangular **"Find care →"** button, always visible (hidden only under 480px, where the
hero search is the first thing on screen). It's repeated after "How it works" and in the orange footer. That makes three clear
entry points, so judges can't miss it.

**3. Find care `/search`: a guided question flow** (GOV.UK / NHS "one thing per page", proven to be easier for anxious
or low-confidence users and to read as trustworthy)

Layout: the question column on the left (about 60%) and a sticky **"Your search"** panel on the right that fills in live as people answer.
This makes it obvious the site is taking in their information. On phones the panel moves below the question.

Each question page has: a `‹ Back` link, a progress line ("Question 2 of 4" plus 4 short bars), the question as the page `<h1>` (inside the
fieldset `<legend>`), one hint line, full-width radio rows, and a **Continue** button. Validation runs on Continue, with an error
summary at the top ("There's a problem. Select your plan type, or choose "Not sure".") and focus moving to the heading.

| # | Question (h1) | Hint | Options (radio rows with sub-hints) |
|---|---|---|---|
| 1 | Which insurance company is on your card? | We use this to name your plan in the grievance letter. We don't check your coverage or contact your insurer. | the 7 insurers |
| 2 | What type of plan do you have? | It's usually printed on the front of your member card. | HMO · PPO · Medi-Cal · Not sure, then the approved coverage note (the amber "Check this before relying on the deadlines" box for PPO/Not sure) |
| 3 | What kind of care do you need? (+ sub-question "What kind of appointment?") | Pick the closest match. Each one has its own legal deadline. | Therapist / Psychiatrist / Primary care / Specialist; then New patient / Follow-up (therapist only, with the optional last-appointment date) / Urgent |
| 4 | Where do you want to be seen? | Enter a 5-digit California ZIP code. We search for licensed providers near it. | one large monospace input (error: "Enter a 5-digit ZIP code.") |
| ✓ | Check your answers | Make sure these are right. They decide which providers we check and which legal deadline applies. | a summary list with "Change" links, then "What happens next" (3 numbered lines), then **Check providers near me →** (56px), with "Legal deadline: 10 business days" beside it |

The right panel shows Insurance, Plan type, Care and ZIP code (empty fields say "Not answered yet" in grey), and the **legal deadline in large
type**, which flips in as soon as care and appointment type are known, plus "We never ask your name, contact details or health information.
No calls happen until you approve them."

Implementation: one client component with `step` in `useState` (mirror it to `?step=` if you want the browser Back button to
work). Radio rows are real `<input type="radio">` inside `<label>`; style them with `:has(input:checked)`.
Submit calls the same create-search API as today. For the demo, the Shift+D preset still skips straight to results.

**4. Results / packet:** unchanged apart from the squarer shape language.

---

## 0. Build order (deadline 12:00 PM)

1. **Tokens + fonts** (swap `globals.css`, three `next/font` imports). The whole app goes light. ~25 min
2. **Header + crisis banner + footer** (logo mark, nav, legal links, "last reviewed"). ~25 min
3. **Landing hero with the search bar in it**, the proof strip, and the photos. ~60 min
4. **Results page**: no layout change. Check that the reskin reads well; the console stays dark. ~20 min
5. **Landing: how it works, outcomes, trust, FAQ**. ~45 min
6. Team section (needs your real photos), accessibility and privacy pages (one paragraph each). ~30 min

If time runs out, steps 1–4 alone already change the first impression.

---

## 1. What changed and why

| v1 (portfolio feel) | v2 (product feel) | Why |
|---|---|---|
| Dark charcoal page | Warm off-white page, white cards; **only the live-call console stays dark** | Healthcare marketplaces earn trust with calm brightness (Headway is the closest analog: insurance search plus therapy). The dark console keeps the "mission control" moment from v1. |
| Newsreader serif with an italic accent word, plus Inter | **Schibsted Grotesk** (headings) + **Atkinson Hyperlegible Next** (UI/body) + **Atkinson Hyperlegible Mono** (data). No italic serif accent. | A serif heading with one italic coloured word, Inter, Space Grotesk, Instrument Serif and Geist are the documented tells of AI-made sites. Schibsted Grotesk is a real brand typeface (commissioned by the Scandinavian media group Schibsted, designed by Bakken & Bæck). Atkinson was designed by the Braille Institute for low-vision readers, which is a true story you can tell judges. |
| Dark only | **Light and dark mode**, with a toggle in the header. It follows the visitor's system setting by default and remembers their choice. | Requested. Both themes pass contrast checks. |
| Terracotta CTA | **Deep care-teal CTA** (`#0d5c58`, white text 7.8:1); terracotta kept for the ghost logo, emphasis words and the revealed footer | Teal reads as "health" and trust; terracotta keeps the identity you liked and stops competing with the CTA. |
| ASCII ghost as the hero art | A **vector ghost logo** (same silhouette) in the header. The ASCII ghost stays in the revealed footer; ASCII receipts stay in the story | A product needs a logo, not a big art piece in the hero. The ASCII is still there, as texture. |
| Hero = headline + button | Hero = headline + **the search form itself** + three trust ticks + a real photo with a **live example-result card** | Headway puts the form in the hero ("the form arrives early"). Your attached examples float stat cards over the photo; we float *our real product UI* instead, labelled "Demo data". |
| No social proof | **Proof strip** of the law, data source and regulator, a cited study quote, team section, FAQ, footer with Privacy/Accessibility/Contact and "Content last reviewed" | NN/g's 4 trust factors and Stanford's credibility guidelines, done honestly (no fake numbers). |

Kept: the crisis banner (now a solid near-black bar, the One Medical-style top notice), the sticky story
headings, the sheet/scroll storytelling (cards reveal on scroll), the revealed terracotta footer
("Find out who's really there.", now mobile-safe), the paper verdict, the stamp, the deadline ruler and every status colour's meaning.

---

## 2. What we took from which sites (and didn't copy)

| Site | What's good there | How GhostBuster uses it |
|---|---|---|
| **Headway** (therapy + insurance marketplace) | Light, calm palette, insurance/ZIP inputs in the hero, warm therapy photography, provider counts near the form | Search bar in the hero; warm photos; trust ticks under the form. We don't copy its mint/green palette. |
| **Oscar** (insurer) | Friendly, plain-language copy; a serif display face; well-written microcopy | Source Serif headings; plain-language FAQ; a calm, non-salesy voice. |
| **One Medical** | Minimal, modern, short scannable blocks with bold icons; a top notification banner | Short card blocks; the crisis banner styled as a deliberate top notice. |
| **Zocdoc** | Patient-first booking flow; insurance-first search | Insurance is the first field; the results page reads like a booking flow, not a dashboard. |
| **Mayo Clinic / big hospitals** | Navigation restraint; credibility through sources | Four nav items max; cited sources; "last reviewed" date. |
| **Your two examples** | Big photo of real people, floating info cards, clean blue-white palette, rounded shapes | Photo + floating card, rounded 20px photo frames. **Not** taken: fake stats ("870+ doctors", "150K+ recovered", "No. 1"), fake reviews, stock doctors posing. We don't have those numbers, and judges notice. |

---

## 3. Tokens (see `ghostbuster-tokens-v2.css`)

**Colour.** All text pairs pass WCAG AA; ratios were computed on the surface each is used on.

| Token | Hex | Use | Contrast |
|---|---|---|---|
| `--page` | `#fbf8f3` | page | n/a |
| `--surface` | `#ffffff` | cards, inputs | n/a |
| `--sunk` | `#f3eee6` | wells, track of the ruler, placeholders | n/a |
| `--line` / `--line-strong` | `#e6dfd3` / `#cfc6b6` | borders | n/a |
| `--ink` / `--ink-2` / `--ink-3` | `#1b1a18` / `#47443e` / `#686459` | text levels (ink-3 is the floor) | 16.4 / 9.2 / 5.6 : 1 |
| `--primary` | `#0d5c58` | CTAs, links, focus ring | 7.4 : 1; white on it 7.8 : 1 |
| `--terra` / `--terra-text` | `#b5532f` / `#a64b2a` | logo, emphasis words / small terracotta text | 4.7 : 1 (large) / ≥5 : 1 |
| `--terra-footer` | `#d97757` | revealed footer panel | ink on it 5.9 : 1 |
| Status | ghost `#6e6a61`, unverified `#47443e`, calling `#2b52c4`, available `#1d7347`, past `#b3361f`, no answer `#855700` | badge text on matching tints | all ≥ 5 : 1 on white |
| Console (dark) | `#1f1e1c` bg, text `#f4f1ea`, calling `#9db2ff`, past `#ff8f7a`, available `#7fd1a2` | transcript + activity log | 7–15 : 1 |

**Type: three researched pairings.** All are free on Google Fonts. Swap pairings by changing the three
`next/font` imports; the CSS uses `--font-heading`, `--font-body` and `--font-mono-src` and never names a font.

| Pairing | Headings | Body / UI | Data | Why |
|---|---|---|---|---|
| **Editorial (default)** | Schibsted Grotesk 650–700, tight tracking | Atkinson Hyperlegible Next | Atkinson Hyperlegible Mono | A news-brand grotesk with personality, plus the Braille Institute's low-vision font: trustworthy, readable and not on any "AI default" list |
| Workhorse | Mona Sans (GitHub's brand family) | Hanken Grotesk | IBM Plex Mono | Feels the most like a funded startup (Söhne/Circular territory) |
| Civic | IBM Plex Sans | IBM Plex Sans | IBM Plex Mono | IBM's corporate family: the safest, most institutional option |

`next/font` imports for the alternatives: `Mona_Sans` + `Hanken_Grotesk` + `IBM_Plex_Mono` (Workhorse), or
`IBM_Plex_Sans` + `IBM_Plex_Mono` (Civic). Give each the matching `variable` name above. Plex needs explicit `weight: ['400','500','600','700']`.

Sizes: hero `clamp(2.5rem, 5.2vw, 4.25rem)`, weight 700, tracking −0.035em; display/H2 weight 650–700,
tracking −0.022 to −0.028em; H3 20px/650; body 17px/1.6; data 14–15px. Headings use `text-wrap: balance`.
Emphasis is **colour only** (*ghosts.* in terracotta, same weight, no italic), or the `.mark` highlighter underline.

**Avoid (research-backed AI tells):** Inter everywhere, Space Grotesk, Instrument Serif, Geist, Plus Jakarta, DM Sans and a serif italic accent word in the hero.

Eyebrow labels are now **sans 13px bold, uppercase, in terracotta**, not faint mono. This fixes the v1
"small muted mono" contrast problem at 150% zoom.

**Shape:** radius 6 (inputs) / 12 (cards, rows) / 20 (photos, big cards) / pill (buttons, badges);
paper stays nearly square (4px) so it reads as paper. Soft two-layer shadows only on cards and paper.

**Focus:** a 3px teal outline with a 3px offset everywhere; cream on the dark console.

**Light and dark mode**
- Light is the base `:root`; `[data-theme="dark"]` on `<html>` overrides the same variables. Every component
  reads variables, so nothing else changes. Dark values: page `#161615`, surface `#201f1d`, text `#f4f1ea` /
  `#cfcabf` / `#a09b90` (floor 6.5:1), teal `#6cc4b9` with dark text on buttons (8.3:1), terracotta `#e8906f`.
  The v1 status colours return, and every badge is ≥4.7:1 on its tint.
- The **paper verdict and the packet stay light paper in both themes**. Evidence is a document, and a bright sheet
  appearing on a dark page is a strong demo moment. The terracotta footer and the console look the same in both.
- No flash on load. Put this in `app/layout.tsx` inside `<head>`:
  ```tsx
  <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('gb-theme');if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='light'}})()` }} />
  ```
  and add `suppressHydrationWarning` on `<html>`.
- Toggle: a 42px round button in the header (a moon icon in light mode, a sun in dark), `aria-label="Switch between light and dark mode"`.
  On click, flip `document.documentElement.dataset.theme` and save `gb-theme` in localStorage (wrapped in try/catch).
- For the live demo, pick one theme before you start. Dark reads well on a laptop in a dim hall; light reads better in a bright room.

---

## 4. Images

**Rules**
1. **Download the files into `/public/images/`.** Don't hotlink. Hotlinked Unsplash images can fail on some
   networks, which is why the hero photo didn't load for you. The preview now tries the CDN link, then a link
   built from the Unsplash photo ID, then shows a labelled placeholder. In the app, open each photo page, click
   Download (pick the "Large" size) and save the file as e.g. `hero.jpg`. That keeps the demo working offline
   on hackathon Wi-Fi. Use `next/image` with explicit width/height, `priority` on the hero, and a
   `sizes` attribute.
2. Every image gets real alt text (written below). Decorative ones get `alt=""`.
3. **Represent people across the whole set, not one "diverse" photo.** Vary race, age, gender and
   body. Show ordinary people at home, not models in lab coats.
4. Don't use photos of children in therapy contexts, and don't use photos that frame a person as
   "troubled". Several popular free therapy photos on Unsplash do both, so I skipped them.
5. **No photos that imply real providers or endorsements.** No stock "doctor" staring at the camera
   next to provider data: it could read as a real clinician.
6. The team section must use **your real photos**. Real people behind the site is a top credibility signal.

**Picks.** All are under the free Unsplash License (commercial use OK, no attribution required). I
couldn't view the photos themselves from here, only their pages and descriptions, so check each
crop before committing.

| Slot | Photo page | Alt text |
|---|---|---|
| Hero (4:5, right) | https://unsplash.com/photos/woman-talking-on-phone-while-working-on-laptop-at-desk-vbd1ONgbZlY | A woman smiles while talking on the phone at her desk at home |
| Story 02 "The phone says no" (16:8) | https://unsplash.com/photos/man-talking-on-phone-at-desk-with-laptop-rlaeA80SunU | A man on the phone at his kitchen table with a laptop open |
| Story 04 "The proof is on you" (16:8) | https://unsplash.com/photos/man-reading-document-at-kitchen-table-with-coffee-4XBvbznJFno | A man reads a letter at his kitchen table in the morning |
| Outcome "someone can see you" | https://unsplash.com/photos/two-women-sitting-beside-table-and-talking-LQ1t-8Ms5PY (wocintechchat collection) | Two women talking across a table |
| Optional: "Telehealth appointments count" note, How it works | https://unsplash.com/photos/doctor-consulting-patient-via-video-call-on-laptop-EVX9pt2dD1o | A clinician on a video call with a patient |
| Alternate hero | https://unsplash.com/photos/woman-talking-on-phone-while-working-on-laptop-at-table-j5B2A4R4NKU | A woman talks on the phone at her kitchen table |

**Gaps to fill if you have 10 minutes:** an older adult and a person with a visible disability. Try
Unsplash searches like "older man phone call home" and the Disability:IN stock collection (linked in
`RESEARCH_NOTES.md`). Check the licence on each.

---

## 5. Screen-by-screen changes

### 5.1 Global chrome
- **Crisis banner:** a solid `--ink` bar with cream text. The 988 is bold, underlined and a `tel:` link. It stays the first thing on every page.
- **Header** (sticky under the banner; static on phones so the 2-line banner never covers it):
  vector ghost logo plus **GhostBuster** (Atkinson 700), then nav: How it works · Your rights · Who built this,
  then the label "Evidence log + templates · not legal advice" (shortens to "Not legal advice" under
  1180px, so it fits the 960px demo viewport), then a **Find care** pill button (hidden under 480px, because the hero has the form).
- **Logo mark:** the SVG in `preview-v2.html` (dome head, 4-scallop hem, two eye cut-outs), `--terra`,
  30px. Use it as the favicon too (`app/icon.svg`).
- **Footer:** "© 2026 GhostBuster · Evidence log + templates, not legal advice" · How it works ·
  Privacy · Accessibility · Contact · "Content last reviewed Nov 15, 2026". It sits below the revealed terracotta panel.

### 5.2 Landing `/` (section order)
1. **Hero:** eyebrow, approved headline (*ghosts.* in italic terracotta), approved sub, **search bar**
   (Insurance · ZIP · Care, then a full-width "Check providers near me →"). It routes to
   `/search?insurer=…&zip=…&specialty=…` with those three prefilled. Plan type and appointment type are
   still chosen there, because they drive the coverage warning and the deadline. Three teal ticks: *Free · about a minute · no account* / *We never ask your name or
   health details* / *No calls without your OK*. Right side: the hero photo, plus a floating white card
   "Example result · Demo data" with one struck-through ghost row and one past-deadline row with its ruler.
2. **Proof strip** (white band): "Built on public law and public data". Three columns: the timely-access law
   (§1367.03), the national provider registry, the state regulator. Then the line *"GhostBuster is an
   independent hackathon project and isn't affiliated with any agency or health plan."*
3. **Problem story:** a sticky left column (title, plus the JAMA quote with its "five states, not California"
   caveat) and four step cards on the right. Two cards have photos, two keep the ASCII receipts on a
   `--sunk` well. Cards fade up on scroll. This replaces the dark sliding sheet but keeps the "heading stays while
   text scrolls" idea.
4. **How it works:** three numbered cards (step 1 uses the approved data-source wording), then two outcome
   cards: a photo card with "✓ If someone can see you", and a paper card with a small stamp for "! If nobody can in time".
5. **What to know** (white band): the four honesty points, unchanged copy, with no boxes.
6. **Who built this:** four square photos with name and role. Real photos only.
7. **FAQ:** five `<details>` items. All copy comes from the approved text (consent card, coverage note, not-legal-advice).
8. **Revealed footer** (terracotta, kept): uses `min-height:100svh` on desktop and turns static on phones. Box rules
   are CSS fieldsets, so they never clip. The ASCII ghost is desktop-only.

### 5.3 Search `/search`
The same fields and logic as v1 §4.2, on a white card centred on the page. Segmented controls become pills
(the selected one is a white pill with a shadow). The coverage warning uses `.notice` (amber tint); the deadline
hint stays live.

### 5.4 Results `/results/[id]`
**Layout and mechanics are exactly v1 §4.3 and §5.** The skin changes:
- The case strip sits on the page background; counts are in Source Serif and coloured by status.
- Rows are white cards. Resolved rows get a left status edge and a tint that fades left to right. Ghost rows sit
  flatter (on the page colour, no shadow) and are struck through.
- **The transcript and activity log are the dark console.** That's the "live" part, and it
  contrasts hard with the light page, which helps from 2 metres.
- The verdict prints in as **paper** with the red stamp, as in v1. The Open-packet button is now teal.

### 5.5 Packet, How it works, Ghost Map, demo panel
- Packet: a light header. The iframe document sits on the page as the same paper sheet (continuity with the verdict).
- How it works: the diagram nodes become white cards with a 1px border. AI nodes get a dashed blue border and
  deterministic nodes a solid ink border, with the same legend as v1.
- Ghost Map: v1's fake-mode treatment, on light.
- Demo panel: keep it dark (it's an operator tool, the same family as the console).

---

## 6. Trust checklist (how each research finding shows up)

| Finding | Where it's applied |
|---|---|
| First impressions form in about 50ms and colour everything after (Lindgaard) | A calm, uncluttered hero: one headline, one form, one real photo. Nothing flashing on load. |
| NN/g: design quality | A consistent type scale, one radius system, no typos, no broken links. Run the QA list. |
| NN/g: upfront disclosure | "Free · no account", "not legal advice" in the header, AI disclosure before calls, the demo-data tags. |
| NN/g: comprehensive, current content | FAQ; "Content last reviewed" date; cited sources. |
| NN/g: connected to the rest of the web | Link the statute (leginfo), the DMHC Help Center and the NPI registry. GitHub link in the footer. |
| Stanford: make it easy to verify | The "Source ↗ · checked {date}" links on rows; cited facts with their caveats. |
| Stanford: show real people behind the site | Team section with real photos and roles; "Built at SanD Hacks". |
| Stanford: make it easy to contact you | Contact link in the footer (a team email). |
| Stanford: visual design matches purpose | A healthcare look, not a portfolio. |
| Don't fake proof | No invented counts, ratings or testimonials. The only numbers shown are cited or are the user's own results. |

## 7. Inclusion checklist
- People across race, age, gender, body and ability **across the whole set**, shown in everyday settings.
- **We never ask for gender, name or health details.** Say so in the hero. It's both privacy and inclusion.
- Gender-neutral copy everywhere ("your provider", "they"). No "Mr./Ms.".
- Plain language: short sentences, legal terms explained once ("business days", "out of network").
- Atkinson Hyperlegible for low-vision readers; 17px body; contrast ≥ 4.5:1 everywhere.
- Spanish: the packet already has a draft translation. A header "Español" link is a nice extra if time allows; mark it "draft".

## 8. Legal and compliance checklist (what to show and say)
- **Accessibility: WCAG 2.1 AA.** It's the standard the HHS Section 504 rule sets for federally funded health
  programs, and ADA/Unruh website lawsuits are common in California. Add a one-paragraph `/accessibility`
  page saying you target WCAG 2.1 AA, with a contact for problems.
- **AI voice calls:** the FCC treats AI-generated voices as "artificial voice" under the TCPA, which
  brings consent requirements. Your demo only dials team phones that have consented. Say this on the consent card
  (already approved copy) and in Q&A.
- **AI disclosure in California health communications (AB 3030)** covers providers' AI messages about
  clinical information, not scheduling. GhostBuster isn't a provider and only asks about appointments, but it
  follows the spirit anyway: it discloses AI up front and offers a human path (the patient can call themselves; the packet has the script).
- **Privacy:** no third-party tracking pixels or session-replay scripts on any page. Health sites are being sued over pixels.
  Add a one-paragraph `/privacy` page listing what is stored (search inputs and call results) and what isn't.
- Keep the existing rules: not legal advice, the self-funded warning, demo-data labels, masked phones, "past legal deadline" (never "violation").

## 9. QA additions (on top of v1 §10)
- [ ] All photos load from `/public/images` with the network off.
- [ ] The hero search bar submits correctly, and the keyboard tab order is Insurance → ZIP → Care → button.
- [ ] At 960px wide (the demo zoom), the header fits on one line and the hero form is above the fold.
- [ ] At 375px: no horizontal scroll (checked in the preview), the banner is not covering the header, and the footer is not clipped.
- [ ] axe DevTools or Lighthouse accessibility shows no contrast errors.
- [ ] No fake numbers anywhere (grep for "+", "%", "No. 1" in copy).
