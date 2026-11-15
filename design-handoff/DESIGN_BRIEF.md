# GhostBuster — design handoff brief

You are redesigning the web front end of **GhostBuster**, a hackathon project. You are free to propose
something completely new. This brief gives you everything that must stay true, every screen and state
that has to exist, the current design (so you can keep, change or discard it), and what the team liked
and disliked so far.

Screenshots of the current build are in `screenshots/` next to this file (listed in section 12).

---

## 1. The product in one paragraph

Insurance provider directories are full of **"ghost" listings**: therapists and doctors who are listed
but aren't taking new patients, moved, or never answer. California law (Health & Safety Code §1367.03,
the Knox-Keene timely-access rules) requires state-regulated health plans to offer an appointment within
set deadlines, e.g. **10 business days for a therapist**, and to arrange care (including out of network,
at in-network cost) when their network can't. Today the patient has to prove the network failed by
calling offices one by one. **GhostBuster does the legwork:** it finds licensed providers near the user,
flags the ghosts, calls the rest with an AI voice agent (with the user's permission), compares each
answer to the legal deadline, and then either shows someone who can see them in time, or hands them an
evidence packet (call log + grievance letter to the plan + phone script + regulator steps).

**One-liner (from the team's pitch):** GhostBuster finds licensed providers near you, flags the "ghosts"
who aren't really available, calls the rest for you, and when no one can see you within California's
legal deadline it hands you a ready-to-file grievance with the evidence attached.

**Who it's for:** a California HMO or Medi-Cal member, often someone who needs a therapist and may be
stressed or struggling. Tone must be calm, trustworthy, plain-spoken. Not cute about mental health.

---

## 2. Context you must design for

- **Hackathon:** SanD Hacks Fall 2026 (UCSD), 4-person team.
- **Deadline:** final submission **Sunday Nov 15, 2026, 12:00 PM PT. No git commits after that.**
  Whatever you design has to be implementable by a coding assistant in a few hours. Prefer a strong
  direction with a small number of reusable pieces over a sprawling system.
- **Judging:** a **3-minute live demo + 2-minute Q&A** at the team's table, scored on Idea, Demo,
  Technical Complexity, Completion. Code quality is not judged; a demo that works and looks great is.
- **The demo is shown on a laptop, browser zoomed to 150%, to judges standing at a table.** Type and key
  numbers must read from a metre or two away. The money moments are:
  1. the results list filling in, with ghosts struck through,
  2. a live AI phone call (a judge answers a real phone) and that provider's row **flipping** to its result,
  3. the final verdict ("No provider we reached could offer a timely appointment"),
  4. opening the grievance packet.
- The landing page story is mostly for the Devpost page and the 3-minute video, not the live demo
  (the live demo jumps straight to the search form or uses a preset).

---

## 3. Non-negotiable rules (must stay true on every screen)

These come from the team's product-honesty rules and legal wording. Do not design them away.

1. **Crisis line on every screen, including the first:** "In crisis? Call or text **988** — the Suicide &
   Crisis Lifeline, 24/7" with a `tel:988` link. Hidden only when printing.
2. **Not legal advice:** the output is an "**evidence log + template, not legal advice**". Say so near
   the packet, on the packet page, and in the site chrome (currently the header says
   "Evidence log + templates · not legal advice").
3. **Coverage warning:** if plan type is **PPO** or **Not sure**, show a strong warning that
   **self-funded employer plans may not be covered by California's rules**. Everyone sees the short
   version; PPO/Not sure get the emphasized version. Exact text in section 11.
4. **AI disclosure:** the AI assistant says it is an AI calling on behalf of a patient in its first
   sentence. The consent screen must say so before the user approves calls.
5. **Consent before calling:** calls only start after the user explicitly approves ("Yes, check these
   N for me"). The consent card explains what the assistant will and won't do (section 11).
6. **Demo safety:** during the hackathon the assistant only dials the team's own phones, never a real
   clinic. Say so on the consent card ("Hackathon demo: calls only go to our own team's test phones").
7. **Fictional data is labeled:** demo providers are fictional and must carry a visible
   **"Demo data — fictional providers"** tag (or a per-row "Demo" tag when mixed with real providers).
8. **Phone numbers are masked** in the UI as `(•••) •••-4529`. The real number is only used in `tel:`
   links (e.g. "Call to book").
9. **Wording rules (legal accuracy):**
   - Per provider: **"Past legal deadline"**. **Never say "violation"** about a single office.
   - Overall result: **"No provider we reached could offer a timely appointment."**
   - Why: the legal duty sits with the **plan's network**, not each office.
   - Ending B subline (approved): "You can now ask your plan to arrange timely care, including
     out-of-network at in-network cost."
10. **Data-source wording (approved, use exactly when describing where providers come from):**
    "We pull licensed providers near you from the national provider registry, then use Bright Data to
    check each one's public profile." **Do not claim we read insurer directories.** (The current build
    still says "directory" in a few places; see Known issues.) The *problem story* can talk about
    insurer directories, because that is the real-world problem; the *product steps* must not claim we
    read them.
11. **Legal caveat always visible on results:** "A provider can lawfully set a longer wait if they note
    in your record that it won't harm your health. Telehealth appointments count."
12. **Accessibility basics:** readable contrast (the demo is on a projector-ish laptop at 150%), visible
    focus states, works at phone width (375px) with no horizontal scroll, respects
    `prefers-reduced-motion`.

---

## 4. Implementation constraints (so the design can actually be built)

- **Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS v4** (CSS-first config: tokens live in
  `app/globals.css` under `:root` and `@theme inline`). No component library is installed.
- Fonts via `next/font/google` (any Google font is fine).
- No new heavy dependencies; motion via CSS (and a tiny IntersectionObserver helper that exists).
  If you really want a library (e.g. Framer Motion), say so and why.
- The results page **polls the backend every 2 seconds** and re-renders; anything animated on status
  change must survive frequent re-renders (current approach: remount with a `key` to replay an animation).
- A **fake mode** runs the whole flow with simulated data in ~20 seconds; it's the demo safety net.
- The packet itself is **server-rendered HTML** (a printable document, white paper, from
  `backend/packet/render.py`) shown in an iframe. Its internal look is owned by another teammate; you
  can propose a style for it, but treat it as a separate, print-first document (black on white).
- Owner of `/frontend` is Aryan; legal/packet copy is Jai's. Copy in section 11 is approved; changing
  meaning needs their OK. Visual design is open.

---

## 5. Pages and routes (all of them)

| Route | Purpose |
|---|---|
| `/` | Landing: hero, the problem story, what GhostBuster does, honesty notes, call to action |
| `/search` | The search form (step 1 of the flow) |
| `/results/[id]` | Live "mission control": providers, ghosts, consent, live calls, transcript, activity log, ending |
| `/packet/[id]` | The grievance packet viewer (iframe) with Save as PDF / Download / English–Español toggle |
| `/how` | How it works: architecture diagram + 5 explainer cards (judges / Devpost) |
| `/map` | San Diego Ghost Map: insurer scorecard + ZIP view from real data (empty in fake mode) |
| Overlay | Demo control panel (Shift+D) + small fallback indicator pill, bottom-right, every page |

Global chrome: sticky crisis banner (top), header with wordmark "GhostBuster" and "Evidence log +
templates · not legal advice". Nothing else in the nav today; `/how` and `/map` are linked from the
landing footer and results header.

---

## 6. The user flow, screen by screen, with every state

### 6.1 Landing `/`
Current structure (see screenshots 01–05):
1. **Hero:** label "For California HMO & Medi-Cal members"; headline "Your insurance directory is full of
   *ghosts.*"; sub "We find out who's actually taking patients — and if nobody can see you in time, we
   build the evidence to make your plan fix it."; primary button **Find care →**; "Takes about a minute.
   No account."; an animated **ASCII-art ghost** (orange) on the right.
2. **The problem** (a sheet that slides up over the pinned hero): "Finding a therapist who takes your
   insurance shouldn't be a second job." then 4 numbered steps, each with a heading that **sticks while
   its text scrolls**, an ASCII illustration, and two paragraphs:
   - 01 The directory says yes. (ASCII directory listing, everyone "accepting")
   - 02 The phone says no. (ASCII call log: not taking patients, moved, disconnected, voicemail full)
   - 03 The law is on your side. (ASCII calendar: day-10 legal limit vs day-29 earliest opening)
   - 04 But the proof is on you. (ASCII tally: calls made, hours on hold, appointments 0)
3. **What GhostBuster does:** "We make the calls. You keep the receipts." + 3 steps + two outcome boxes
   (If someone can see you / If nobody can in time).
4. **What to know:** 4 honesty points (It says it's an AI · It's evidence, not legal advice · Not every
   plan is covered · This is a hackathon demo).
5. **Revealed footer:** the page lifts away to uncover a full-screen terracotta panel: "Find out who's
   really there." + ASCII box-rule sections "START HERE" (Find care button) and "IN CRISIS?" (988) + large
   ASCII ghost + links to Ghost Map and How it works.

Full copy for these sections is in section 11.

### 6.2 Search `/search` (screenshots 06, 07)
Heading "Find care", sub "Tell us about your plan. We'll check who's really available." One card with:
- **Insurance company** (select): Blue Shield of California, Anthem Blue Cross, Health Net, Kaiser
  Permanente, Molina Healthcare, L.A. Care, Medi-Cal plan. (Choosing "Medi-Cal plan" sets plan type to Medi-Cal.)
- **Plan type** (segmented, hint "Check your member card"): HMO · PPO · Medi-Cal · Not sure.
  Below it, the **coverage note** (plain for HMO/Medi-Cal, emphasized warning for PPO/Not sure) with a
  "Who does this apply to?" expander.
- **ZIP code** (5 digits, monospace).
- **What kind of care?** (segmented): Therapist · Psychiatrist · Primary care · Specialist.
- **Appointment** (segmented, hint shows the legal deadline live, e.g. "Legal deadline: 10 business
  days"): New patient · Follow-up · Urgent. Follow-up only exists for Therapist. If Follow-up: an
  optional date field "Date of your last appointment" ("Optional — the follow-up clock starts here").
- Error line (e.g. "Enter a 5-digit ZIP code.").
- Primary button **Check my directory →** (busy: "Starting…"). *(Wording conflicts with the data-source
  rule; suggest "Check providers near me →" or similar.)*

Deadlines shown: therapist / primary care new = 10 business days; psychiatrist / specialist new = 15
business days; urgent = 48 hours; therapist follow-up = 10 business days from the prior appointment.

### 6.3 Results `/results/[id]` — the core screen (screenshots 08, 09, 10)
Header: case line (currently mono `FILE GB-327D24 · Blue Shield of California · HMO · ZIP 92103`),
title "Therapists, *legal limit 10 business days*", a **phase pill** (top right), a **demo-data tag**,
and a "San Diego Ghost Map →" link.

Phase pill states (search status → label):
- `scraping` → "Scanning directory" (pulsing) + an indeterminate progress bar under the summary
- `verifying`, no calls yet → "Ready to call"
- any provider `calling` → "Calling offices"
- `done` → "Complete"

Summary block (currently): headline sentence "**5** of 10 listings appear unavailable." then a tally of
4 numbers — Listed · Ghosts · Checked by phone · Past deadline — then the legal caveat note.

**Consent card** (shown when status is `verifying`, nothing called yet, and there are callable
providers): "Want us to call the 5 remaining offices?" + what the assistant will do + "Yes, check these
5 for me" (busy: "Starting calls…"). Full copy in section 11. If some listed providers are real registry
providers (not demo), it says they won't be called.

**Ending A** (done, at least one provider available in time): "Good news" — "{Name} can see you
{Weekday, Month Day}." — "That's {wait} away — within the legal limit of {limit}." — address —
**Call to book · (•••) •••-0110** (tel: link) — optional "Save the evidence log anyway" (if some offices
were past deadline) — tip: "say you're a {insurer} {plan} member and ask for the {date} new-patient slot."

**Ending B** (done, nobody available in time): label "Timely access grievance ready"; headline "No provider
we reached could offer a timely appointment."; subline "You can now ask your plan to arrange timely care,
including out-of-network at in-network cost."; the counts (offices reached, past legal deadline, said
not taking the plan/new patients (if any), no answer, other listings unavailable, legal limit); packet
contents (evidence log of every call, grievance letter to {insurer}, member-services phone script, next
steps with the DMHC); the self-funded warning again if PPO/Not sure; button **Open grievance packet →**;
"Evidence log + template, not legal advice." The page auto-scrolls to the ending when the run finishes.
**Ending B is the one shown in the demo.**

Below: two columns.
- **Provider list** (left), heading "Listed in the {insurer} directory" *(wording issue, see section 10)*.
  One row per provider: name (struck through if ghost), one-line detail, status badge, optional
  "Demo" tag, and for profile-checked rows a small "Source ↗ · checked Nov 15, 2026" line. Rows are
  clickable and select the provider for the right panel. Rows flash/flip when their status changes.
- **Right panel** (sticky): **Call transcript** for the selected provider (auto-follows the latest
  event unless the user pinned one) and **Live activity** log (timestamped lines, newest at bottom,
  clickable to select that provider).

Provider statuses (this is the vocabulary; colors are up to you but must be distinguishable and
consistent):

| Status | Label | Meaning | Row detail text |
|---|---|---|---|
| `ghost` | Ghost | Listed, but not actually available (profile says not accepting, moved, cash-only, dead number…) | the reason, e.g. "Profile says waitlist closed until next year" |
| `ghost` + confirmed | Confirmed ghost | The office said on the call it isn't taking this plan / new patients | "listed, but not accepting this plan/new patients" |
| `unverified` | Not checked | Looks real, not called yet | "Looks real — not called yet" or a "Profile checked: page says accepting new clients" note |
| `calling` | Calling… | AI is on the line right now (animated) | "AI assistant is on the line…" |
| `available` | Available | Earliest opening within the legal deadline | "Earliest **Dec 8** · **6 business days** vs 10 business days limit" |
| `violation` | Past legal deadline | Earliest opening is past the deadline (never say "violation" in UI) | "Earliest **Dec 29** · **29 business days** vs 10 business days limit" |
| `no_answer` | No answer | Voicemail / no usable date — never treated as past deadline | "No answer / no usable appointment date" |

Transcript panel content for a selected provider:
- name, masked phone · address, big status badge
- for available / past deadline: a **Wait vs Legal limit** pair (e.g. 29 business days vs 10 business days)
- while calling: an animated "Live call in progress — transcript arrives when the call ends." (equalizer bars)
- confirmed ghost: "Confirmed on the call: listed, but not accepting this plan/new patients."
- profile ghost: "Not called — this listing is a ghost: {reason}." + "Profile checked · {host} ↗" link + checked date
- transcript as a chat: lines prefixed `Agent:` (AI assistant), `Office:` (receptionist), and system
  lines in parentheses like `(no answer — voicemail box full)`.

Example transcript:
```
Agent: Hi, I'm an AI assistant calling on behalf of a patient, and this call is being recorded and
       transcribed. I'm checking availability with Elena Marsh, LCSW for a patient with Blue Shield of
       California insurance. Do you take that plan, and what's the earliest new-patient appointment you
       have, in person or by telehealth?
Office: Let me check... our earliest new-patient opening is Tuesday, December 15.
Agent: Thank you. ...
```

Activity log lines (examples, in order of a run):
- "Searching the Blue Shield of California directory for therapists near 92103"
- "Found 10 listed providers. Cross-checking public profiles…"
- "Ghost listing: Sarah Lindqvist, LMFT — NPI Registry shows practice moved to Sacramento, CA"
- "5 ghosts flagged. 5 offices look real — waiting for your OK to call."
- "You approved AI calls to 5 offices." (user action, emphasized)
- "Calling Elena Marsh, LCSW…"
- "Elena Marsh, LCSW: Earliest opening is 20 business days after request (deadline 10). Past legal deadline"
- "Priya Natarajan, LPCC: No answer / no usable appointment date"
- "Fallback · calls: timed out after 60s → simulated demo call" (real mode only; amber)
- "All calls complete."

Other states: loading ("Loading…"), connection error banner ("Connection issue: … — retrying…"),
expired search ("This search has expired — The server restarted. Start a new search." + New search button),
empty provider skeletons while scraping.

### 6.4 Packet `/packet/[id]` (screenshot 11)
Sticky header: "← Back to results", title "Your timely access grievance", sub "Evidence log · grievance
letter · next steps (phone script, DMHC) · transcripts", **English / Español** toggle, **Save as PDF ↓**
(prints the iframe), **Download .html**. Spanish shows a note "Borrador de traducción — revise con un
hablante fluido / Draft translation." Below: the white document in an iframe. Footer: "Evidence log +
templates, not legal advice. Review and fill in your member ID before sending."

The document itself (server HTML) contains: a not-legal-advice + 988 notice, a DEMO DATA notice, title
"Timely Access Grievance", meta line, 4 stat boxes (Listed in directory / Listings that appear
unavailable / Offices reached / Past legal deadline), the overall finding, the legal standard, Part 1
Evidence log (call table), the grievance letter, phone script, DMHC steps, transcripts.

### 6.5 How it works `/how` (screenshot 12)
"How it *works*" + intro "One search, start to finish: find the licensed providers near you, check their
public profiles, call the rest with your permission, and measure the answers against California's
timely-access law." Then an **architecture diagram** (inline SVG, snake layout):
Member → Next.js → FastAPI → NPI Registry → Bright Data → Gemini (profile classifier) → Neon Postgres →
ElevenLabs agent (over Twilio, says it's an AI) → Post-call webhook → Gemini (earliest-date extraction)
→ CA rules engine (HSC §1367.03, business days + holidays) → Grievance packet.
Caption: "Gemini (extraction only) · deterministic rules · every arrow out of FastAPI has a timeout and
a cached fallback." Then 5 cards: Live web data (Bright Data) · Real AI phone calls (ElevenLabs +
Twilio) · Deterministic legal rules engine · Never fakes results for real providers · Clinic-friendly by
design. (Full card text in section 11.)

### 6.6 Ghost Map `/map` (screenshot 13)
"San Diego *Ghost Map*". Intro explains real rows are licensed providers from the national registry
checked against public profiles (not an insurer's directory), and "Demo data" rows are fictional.
- **Insurer scorecard** table: per insurer, rows for real vs demo: providers checked · % appearing
  unavailable (with bar) · % past deadline (with bar), with sub-captions like "5 of 90 checked" or
  "not called (calls only go to our test phones)".
- **By ZIP code:** a hand-drawn SVG schematic of San Diego with ZIP markers (92037 La Jolla, 92122
  University City, 92103 Hillcrest, 92101 Downtown, 91932 Imperial Beach, 92173 San Ysidro) sized by
  providers, a ZIP selector, and a detail panel.
- **In fake mode** it only shows "The backend is in fake mode (no database), so there's nothing to map
  yet." This is a dead end in a fake-mode demo; design a better empty state.

Real-mode data available (pre-warmed): Blue Shield / 92103 / therapist: 90 providers checked, 5 real
ghosts.

### 6.7 Demo control panel (overlay, Shift+D)
Small dialog bottom-right: "Demo controls", "Shift+D to toggle · Esc to close"; status list (Backend:
Fake mode (in memory) / Live · Neon; Real phone calls: On (teammate phones) / Off · simulated; Gemini:
configured / not configured; Bright Data: configured / not configured; This search: no fallbacks / fell
back: …); button "↺ Reset: preset demo search" (Blue Shield of CA · HMO · 92122 · therapist · new);
checkbox "Force fallback to cached data". When closed, a small pill shows e.g. "⚠ Fake mode · simulated
data". This is an operator tool; keep it unobtrusive but legible.

---

## 7. Data you'll be showing (shapes and sample values)

```ts
type PlanType = "hmo" | "ppo" | "medi_cal" | "unknown";            // labels: HMO, PPO, Medi-Cal, Not sure
type Specialty = "primary_care" | "specialist" | "psychiatrist" | "therapist";
type AppointmentType = "new" | "follow_up" | "urgent";              // New patient, Follow-up, Urgent
type SearchStatus = "scraping" | "verifying" | "done";
type GhostStatus = "ghost" | "unverified" | "calling" | "available" | "violation" | "no_answer";

interface Search { id; insurer; plan_type; zip; specialty; appointment_type; prior_appointment_date;
                   created_at; status }
interface Provider { id; name; specialty; phone; address; source_url; ghost_status; ghost_reason;
                     earliest_date /* YYYY-MM-DD */; business_days_wait; deadline_days; violation;
                     call_transcript; checked_at }
interface SearchDetail { search: Search; providers: Provider[]; fallbacks?: { stage; detail; at }[] }
```

Typical demo run (fake mode, all fictional, 10 providers, ~20 s):
| Name | Outcome |
|---|---|
| Rachel Okafor, LMFT | Ghost — insurer lists as accepting; public profile says "not accepting new clients" |
| Sarah Lindqvist, LMFT | Ghost — NPI Registry shows practice moved to Sacramento, CA |
| Marcus Hale, LCSW | Ghost — profile says waitlist closed until next year |
| Dr. Grace Tanaka, PsyD | Ghost — profile states "cash pay only, no insurance" |
| Jordan Alvarez, LPCC | Ghost — listed phone number is disconnected |
| Elena Marsh, LCSW | Called → earliest Dec 15, 20 business days → Past legal deadline |
| Dr. Daniel Reyes, PsyD | Called → earliest Dec 29, 29 business days → Past legal deadline |
| Priya Natarajan, LPCC | Called → No answer |
| Dr. Michael Brennan, PhD | Called → earliest Dec 8, 15 business days → Past legal deadline |
| Dr. Nora Whitfield, PhD | Called → earliest Dec 22, 25 business days → Past legal deadline |

Result: 10 listed · 5 ghosts · 5 checked by phone · 4 past deadline · 1 no answer → Ending B.
(Exact dates and day counts shift with the day the demo runs.)
(Ending A variant: one provider available within 10 business days.)

---

## 8. Design history and what the team said (preferences)

1. **Started from a reference site, https://aubreyasta.vercel.app** (a personal portfolio). The ask was
   "this type of aesthetic but not a portfolio". What we took from it: paper-white page, near-black
   ink, a big serif display face paired with a monospace for labels, one red "block" accent behind a
   word, ASCII art, outlined mono buttons. Its scroll effects: headings that stay pinned while text
   scrolls until the next one pushes them off, content sheets sliding over a pinned hero, and a
   full-screen colored footer ("Start a conversation.") that is **revealed** as the page above scrolls
   away, with ASCII box-rule sections (`+-- CORRESPONDENCE ----+`) and a big ASCII image.
2. Then: **"make it more professional but still look good."** → softened to Inter for UI, a serif for
   headlines only, rounded white cards, muted colors, removed the gimmicks.
3. Then: **"keep the ghost ASCII from before, I like it"**, and **"background gray and ghost orange,
   similar to Claude."**
4. Then: **"make the first page longer, an explanation of the problem… cool animations like how the
   text stays at the top as you scroll until the next text box hits, and the background goes up as an
   image appears… like the white background goes all the way up until the orange background with
   'start a conversation' appears… make a message like that and cool ASCII art."** → built the problem
   story, sticky headings, sliding sheet, revealed orange footer "Find out who's really there."
5. Then: **"make everything Claude colors, the background a darker gray"** and, about the results
   summary (big title, four white stat cards, a pink-bordered verdict card): **"this looks like every
   other AI website, could you make it a different style?"** → dark charcoal theme, the four cards became
   an ASCII "tally" strip, the verdict became a case file with a rubber stamp and a dotted-leader ledger.
6. Now: the user wants a **completely fresh design pass to "perfect it"**, possibly something
   entirely different.

**Liked:** the ASCII ghost (keep some form of it), ASCII art generally, the Claude-like palette
(charcoal/cream/terracotta), scroll storytelling (sticky headings, sheet reveal, revealed footer), a
distinctive non-template look.
**Disliked:** generic "AI startup" UI — rows of rounded stat cards with big numbers, soft pastel bordered
callout cards, everything looking like a SaaS dashboard template.

You don't have to keep the current theme. If you go a different direction, keep the spirit: distinctive,
editorial, trustworthy, with the ghost as the mascot/motif.

---

## 9. The current design system (for reference, keep or replace)

- **Palette (dark, Claude-like):** page `#262624`, raised surface `#30302e`, text cream `#faf9f5`
  (muted text = cream at 45–85% opacity), hairlines `rgba(250,249,245,0.1)`, accent terracotta
  `#d97757` (deeper button `#c96442`, light accent text `#e8957a`), status colors: blue `#8aa4ff`
  (calling/checked), red `#f0806e` (past deadline/errors), green `#6cc391` (available), amber `#e5b85c`
  (no answer, notices, demo tags), near-black `#141413` (text on the orange footer).
- **Type:** Newsreader (serif) for display headings, italic for emphasis words in the accent color;
  Inter for UI and body; JetBrains Mono for labels, data, logs, ASCII.
- **Components:** `.btn` (outlined) and `.btn-solid` (terracotta), `.card` (rounded 12px surface),
  `.window` (panel with a small caps header bar), `.field` (inputs), `.notice` (amber), `.label` (small
  caps), status badges as rounded pills.
- **Motion:** status "flip-in" when a badge/number changes, row flash, slide-in for new log lines, rise
  on load, scroll-reveal fade-up, floating ghost, equalizer bars during a live call, indeterminate scan
  bar, rubber-stamp thump on the verdict. All disabled under reduced motion.
- **ASCII ghost:** generated in code (`components/AsciiGhost.tsx`): a 38×25 grid, a ghost silhouette
  (dome head, scalloped hem, two oval eyes and a mouth cut out) shaded with the ramp ` .:-=+*#%@`, lit
  from the upper left. Rendered as `<pre>` in the accent color, ~15px mono.

---

## 10. Known issues and critiques in the current build (fix or design around)

1. **"Directory" wording vs data-source rule.** Hero "Your insurance directory is full of ghosts" is
   fine as the problem framing, but product claims aren't: step "Check the directory — We pull your
   plan's listed providers", button "Check my directory →", results heading "Listed in the {insurer}
   directory", activity line "Searching the {insurer} directory…", tally label "listed". Real mode pulls
   from the national NPI registry. Judges may ask.
2. **Mobile footer is broken:** at 375px the orange footer's headline is cut off ("Find out who's") and
   the 988 line inside it is clipped (screenshot 15).
3. **Results page front-loads too much** above the provider list: ghost-rate sentence + tally + note +
   consent/verdict. The ghost-rate sentence and the "ghosts" tally number say the same thing.
4. **Ghost Map is an empty dead end in fake mode** but is linked from the landing and results pages.
5. **Small muted mono text is low contrast** on charcoal (e.g. "01 / 04", labels at 45–55% opacity);
   risky on a projector at 150% zoom.
6. **Landing is long** for a live demo (fine for the video; the live demo should start at the form or a preset).
7. The packet document (white HTML in an iframe) has its own plain style and doesn't match the site.
8. Dev-only noise during a dev-server demo: Next.js "N" badge, hydration warnings from browser
   extensions (Grammarly). Use a production build for the demo.

---

## 11. Approved copy (keep the meaning; light edits OK for layout)

**Crisis banner:** In crisis? Call or text 988 — the Suicide & Crisis Lifeline, 24/7

**Coverage note** (everyone; emphasized for PPO / Not sure):
> California's appointment deadlines apply to state-regulated coverage: plans licensed by the Department
> of Managed Health Care (most HMOs, many PPOs, most Covered California plans, Medi-Cal managed care) and
> health insurance policies regulated by the California Department of Insurance.
> *(expander "Who does this apply to?")* They do not apply to self-funded employer or union plans, which
> are under federal law even if an insurer's name is on your card, or to Medicare. Not sure which you
> have? Ask HR or member services "Is my plan self-funded?" before relying on these deadlines.

**Consent card:**
> Want us to call the {N} remaining offices?
> With your permission, our AI assistant will act as your **authorized representative** and phone each
> office below. It will:
> ✓ say at the start of the call that it's an **AI assistant calling on behalf of a patient** and that the
> call is being transcribed
> ✓ ask only for the **earliest opening, in person or by telehealth**, with {insurer} {plan}
> ✓ **not** share your name, contact info, or health details
> Calls are **recorded and transcribed** so the transcript can go in your evidence log.
> Hackathon demo: calls only go to our own team's test phones.
> [Yes, check these {N} for me]

**Legal caveat (results):** A provider can lawfully set a longer wait if they note in your record that
it won't harm your health. Telehealth appointments count.

**Ending B:** Timely access grievance ready · No provider we reached could offer a timely appointment. ·
You can now ask your plan to arrange timely care, including out-of-network at in-network cost. · Legal
limit: {limit}. Of {n} offices we reached, {x} were past the legal deadline, {y} said they aren't taking
this plan or new patients, and {z} didn't answer. {w} more listings appear unavailable. · Your packet has
the evidence log, a grievance letter to {insurer}, a phone script, and next steps with the DMHC. · If your
PPO is a self-funded employer plan, these California rules may not apply — the call log is still useful
evidence. · Evidence log + template, not legal advice.

**Ending A:** Good news · {Name} can see you {Weekday, Month Day}. · That's {wait} away — within the legal
limit of {limit}. · Call to book · {masked phone} · Save the evidence log anyway · Tip: say you're a
{insurer} {plan} member and ask for the {date} new-patient slot.

**Landing — problem story:**
- Section title: "Finding a therapist who takes your insurance shouldn't be a second job."
- 01 The directory says yes. — "Your health plan publishes a directory of in-network providers. Search
  for a therapist near you and it hands back a long, reassuring list." / "On paper, the network looks
  full. That list is also what the plan points to when it says it has enough providers."
- 02 The phone says no. — "Then you start calling. One office stopped taking new patients. One moved
  away. One number is disconnected. One never calls back." / "These are ghost listings: providers who
  appear in the directory but can't actually see you. Nobody tells you which ones they are. You find out
  one call at a time."
- 03 The law is on your side. — "California's timely-access rules set deadlines for state-regulated
  plans: 10 business days for a therapist or primary care appointment, 15 for a specialist, 48 hours for
  urgent care that needs no prior authorization." / "When a plan can't offer an appointment in time, it
  has to arrange one for you, including out of network."
- 04 But the proof is on you. — "To use those rules, you need to show the plan failed: who you called,
  when, and what they said. Today that means the person who needs care does the legwork, office by
  office." / "GhostBuster does that legwork for you and writes it down."

**Landing — what we do:** "We make the calls. You keep the receipts." — "One search. About a minute of
your time. Either an appointment you can actually get, or the paperwork that makes your plan find you
one." Steps: Check providers near you (reword from "Check the directory") · Call the rest for you ("With
your OK, an AI assistant calls each office and asks for the earliest new-patient opening.") · Hold the
plan to the law ("California sets appointment deadlines. If nobody meets them, you get an evidence
packet."). Outcomes: If someone can see you — "We show you who, when, and the number to call to book." ·
If nobody can in time — "You get the call log, a letter to your plan, a phone script, and how to reach
the regulator."

**Landing — what to know:** It says it's an AI. ("The assistant opens every call by saying it is an AI
assistant calling on behalf of a patient. It never shares your name or health details.") · It's evidence,
not legal advice. ("You get a call log and letter templates to send to your plan. What you do with them
is your call.") · Not every plan is covered. ("The deadlines apply to state-regulated California plans.
Self-funded employer plans and Medicare follow federal rules instead.") · This is a hackathon demo.
("Built in a weekend at SanD Hacks. In the demo, calls only go to our own team's phones, never to a real
office.")

**Landing — footer:** "Find out who's really there." · START HERE: Find care → · about a minute · no
account · free · IN CRISIS?: Call or text 988 — Suicide & Crisis Lifeline, 24/7 · © 2026 GhostBuster ·
Evidence log + templates, not legal advice · San Diego Ghost Map → · How it works →

**How it works cards:**
1. Live web data (Bright Data) — "For each licensed provider from the national NPI registry, Bright Data
   searches for their public profile and fetches the page. Gemini reads it for 'not accepting new
   patients'. Every flag links to its source page."
2. Real AI phone calls (ElevenLabs + Twilio) — "An ElevenLabs voice agent calls over Twilio, says up
   front that it's an AI calling for a patient, and asks for the earliest opening. The post-call webhook
   returns the transcript. This build only dials our team's own phones."
3. Deterministic legal rules engine — "No AI decides the law. Plain code counts business days (weekends
   and California/federal holidays) and compares them with the HSC §1367.03 deadlines, checked against
   the statute text. Gemini only pulls the date out of the transcript."
4. Never fakes results for real providers — "Real registry providers never get a simulated call or a
   made-up result. Fictional demo providers are labeled 'Demo data', every stage has a timeout and a
   cached fallback, and each fallback is shown in the activity log."
5. Clinic-friendly by design — "The rules for calling real offices: at most one call per office per
   week, only during office hours, and results shared between patients so an office isn't called again
   and again. During the hackathon it only dials our team's own phones."

**Pitch facts you may use in the design (exact wording, sourced):**
- "A study published last month called almost six thousand therapists and psychiatrists listed in
  insurer directories. About one call in eight ended with an appointment option." (JAMA Health Forum,
  Oct 2026; five states, not California — don't present it as a California number.)
- "California's regulator fined Kaiser fifty million dollars in 2023 for exactly this: therapy waits
  nearly double the legal limit." (DMHC, Oct 12, 2023.)
- Do **not** use other statistics (no "55%", "82%", or "3–5 calls legally triggers out-of-network").

---

## 12. Screenshots (current build, 1440×900 unless noted)

| File | What it shows |
|---|---|
| `01-landing-hero.jpg` | Hero with orange ASCII ghost |
| `02-landing-problem-sheet.jpg` | The problem sheet sliding up over the pinned hero |
| `03-landing-story-step.jpg` | Story step 02 with sticky heading and ASCII call log |
| `04-landing-what-we-do.jpg` | "We make the calls. You keep the receipts." |
| `05-landing-orange-footer.jpg` | Revealed orange footer with ASCII box rules and ghost |
| `06-search-form.jpg` | Search form (HMO) |
| `07-search-not-sure-warning.jpg` | "Not sure" selected: emphasized coverage warning |
| `08-results-consent.jpg` | Results header, ghost-rate line, tally, legal note, consent card |
| `09-results-live-calls.jpg` | Provider list mid-run (ghosts struck through, rows calling), transcript, activity log |
| `10-results-ending-b-verdict.jpg` | Ending B verdict with stamp and findings ledger |
| `11-packet.jpg` | Packet page with the white grievance document |
| `12-how-it-works.jpg` | Architecture diagram |
| `13-ghost-map-fake-mode.jpg` | Ghost Map empty state in fake mode |
| `14-mobile-landing-hero.jpg` | Phone width (375px) hero |
| `15-mobile-footer-clipped.jpg` | Phone width footer bug (headline and 988 line clipped) |

---

## 13. What we'd like back from you

Produce a design a coding assistant can implement directly in Next.js + Tailwind v4 within a few hours:

1. **Direction:** a short concept (name, mood, 2–3 references or descriptions), and why it fits a
   patient-advocacy tool and a 3-minute live demo. If you're unsure, offer 2 directions briefly, then
   commit to one in detail.
2. **Tokens:** full color palette with hex values (background, surfaces, text levels, lines, accent,
   all 6 provider statuses, notice/demo tags), contrast-checked; type scale (fonts, sizes, weights,
   line heights) for display / headings / body / labels / mono data; spacing and radius; shadows;
   motion durations and easings.
3. **Per-screen specs** for every route and state in section 6: layout (desktop 1440 and phone 375),
   hierarchy, exact copy placement, and how each state looks (scraping, ready to call/consent, calling,
   done → Ending A, done → Ending B, errors, expired, empty map).
4. **The money moments, designed explicitly:** how a provider row changes when its call resolves, how
   the verdict arrives, and how the transition to the packet feels — all readable at 150% zoom from a
   couple of metres.
5. **Components** with states (default/hover/focus/active/disabled/busy): buttons, segmented control,
   select, input, status badge, provider row, transcript bubbles, activity log line, consent card,
   verdict, demo tag, notices, phase indicator, demo panel.
6. **ASCII / illustration plan:** where the ghost and any ASCII art appear, and how (keep the ghost
   in some form).
7. **Motion plan** with reduced-motion fallbacks.
8. Optional: a style suggestion for the printable packet document (black on white, print-first).

Keep every rule in section 3 and the approved copy in section 11 intact.
