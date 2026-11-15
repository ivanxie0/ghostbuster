Implement the final GhostBuster frontend design in `/frontend`. The approved mockup is `design-handoff/preview-final.html` (one self-contained HTML file; open it in a browser and use the "Preview controls" box to see Landing / Find care / Results, light and dark). Treat it as the source of truth for look, layout and copy.

Read first, in this order:
1. `CLAUDE.md` (honesty rules, FAKE_MODE, ownership, commit format, deadline)
2. `design-handoff/preview-final.html` (the target)
3. `design-handoff/DESIGN_SPEC_V2.md` (why each choice was made: tokens, fonts, Find care question flow, light/dark, trust/accessibility checklist)
4. `design-handoff/ghostbuster-tokens-v2.css` (all tokens and component classes, ready to port)
5. The current frontend: `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `app/search/page.tsx`, `components/results.tsx`, `components/AsciiGhost.tsx`, `lib/api.ts`, `lib/types.ts`

## Ground rules
- `/frontend` is Aryan's folder. Confirm with him (or that he's OK with this) before committing. Do not touch `/backend`, `/db`, or the docs contract.
- This is a restyle, not a rewrite. Keep every API call, type, route, polling loop and FAKE_MODE path exactly as it works now. Change markup and styles around them. The demo must still run end to end with `FAKE_MODE=true`.
- Keep the honesty rules visible: the 988 crisis banner on every screen, the PPO/unknown self-funded warning, "evidence log + template, not legal advice", and the AI-disclosure line.
- Deadline: last commit before Sunday 12:00 PM PT. Commit in small working steps (`[ivan] frontend: ...` or whoever is committing), `git pull --rebase` before each push, and run `npm run build` before every push. If time gets short, stop after step 4 below; a consistent half is better than a broken whole.

## Assets (already in place)
`frontend/public/images/`: `clinic-call.jpg`, `clinic-chart.jpg`, `clinic-visit.jpg`, `waiting-room.jpg`, `results-screenshot.png`, `team-aryan.jpg`, `team-hardik.jpg`, `team-ivan.jpg`, `team-jaideep.jpg`. Reference them as `/images/<name>` with `next/image` (or plain `<img>` with width/height set). Drop the mockup's Unsplash CDN fallback chain and `photoFallback()`; local files are enough. Keep the alt text from the mockup.

Photo credit line goes in the footer exactly as in the mockup (Unsplash free license: Vitaly Gariev x2, National Cancer Institute, Navy Medicine, each linked to its unsplash.com/photos/<id> page).

## Steps
1. **Tokens + fonts + theme.**
   - Port `ghostbuster-tokens-v2.css` into `app/globals.css` (Tailwind v4 `@theme inline` for the vars, plain CSS for component classes). Remove the old palette.
   - In `layout.tsx` replace Inter / Newsreader / JetBrains Mono with `next/font/google`: Schibsted Grotesk (`--font-heading`), Atkinson Hyperlegible Next (`--font-body`), Atkinson Hyperlegible Mono (`--font-mono-src`). If either Atkinson family isn't exported by our Next version, use IBM Plex Sans / IBM Plex Mono instead and say so.
   - Light is the default; dark via `data-theme="dark"` on `<html>`. Add the pre-paint inline script from the mockup `<head>` (reads `localStorage` key `gb-theme`, falls back to `prefers-color-scheme`) and a theme toggle button in the header. Add `suppressHydrationWarning` on `<html>`.
   - The packet "paper" stays light in dark mode (`.paper` re-declares light vars).
2. **Layout shell.** Crisis banner (same wording as the mockup), header with logo, nav (How it works / Your rights / About us), the "evidence log + templates · not legal advice" note, theme toggle, and a solid primary **Find care →** button that is always visible. Footer as in the mockup. Header goes static at ≤640px, nav buttons hide at ≤480px.
3. **Landing (`app/page.tsx`).**
   - Hero: headline, the unified search bar (insurer / ZIP / type of care / Find care) that starts the flow with those answers prefilled, the "From our live test run" line, and the sources line.
   - Right column: the animated ASCII ghost (see step 6) with the "ghost listing (noun)" caption.
   - Stats quote row, the four story rows 01–04 (02 = `clinic-call.jpg`, 03 = `waiting-room.jpg` above the deadline ruler, 04 = `clinic-chart.jpg`), "We make the calls" with `results-screenshot.png` and the 3 numbered rows, the two outcome blocks ("If someone can see you" with `clinic-visit.jpg`, "If nobody can in time" with the stamp), "Honest about what it is", team section with the four photos and names, FAQ `<details>`, the terracotta "Find out who's really there" band with the footer ghost.
   - Copy: use the mockup's text verbatim. No em dashes, no colored keyword in headlines.
4. **Find care (`app/search/page.tsx`).** Rebuild as the one-question-per-page flow from the mockup: big radio rows, hint text, inline errors, Back/Continue, a live "Your search" summary panel on the right, then a "Check your answers" page with Change links, the consent checkbox for calls, and Submit. Keep the existing request shape and the call to start a search exactly as they are now; only the UI that collects the fields changes. Keep the PPO/unknown warning where the plan type is answered.
5. **Results (`components/results.tsx`).** Restyle only: provider rows as divider rows with status badges (`data-st`), the deadline ruler per row, the dark live-call console with the ASCII tally (`[■■□□□] 2 of 5 called`, driven by real counts), the verdict on paper with the stamp, the row flip animation. All data still comes from the existing polling.
6. **ASCII ghost.** Replace `components/AsciiGhost.tsx` with the mockup's `ghostFrame(W,H,t,blink,html)`: the shaded ghost plus a teal medical cross on the chest (with a clear ring around it) and a two-tube stethoscope with a chest piece on the right. It returns HTML with `<span class="gx-cross">` / `<span class="gx-steth">`; render into a `<pre aria-hidden="true">` with `dangerouslySetInnerHTML` (the content is generated locally, no user input). Hero: 42×30, animated (t += 0.35 every 120ms, blink every 3–6.5s, clear the interval on unmount). Footer: 34×22, static. `prefers-reduced-motion`: render one static frame. Copy the `.gx-*` color rules and the `#heroGhost` sizing rules from the CSS.
7. **Check.** `npm run build` passes, no console errors. With `FAKE_MODE=true`, run the full demo path (landing → search bar → Find care flow → results run to completion → packet) in light and dark at 1440, 960 and 375 wide: no horizontal scroll, all images load, crisis banner visible, keyboard focus visible on every control, text contrast AA. Retake `docs/screenshots/` at 1440×900 if DEVPOST.md lists them.

When done, reply with what changed per file, anything you skipped or substituted, and anything that needs Aryan's review.
