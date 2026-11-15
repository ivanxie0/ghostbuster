# GhostBuster — CLAUDE.md (read this first, every session)

SanD Hacks Fall 2026 (UCSD). 4-person team, each using Claude Code in parallel on this repo.

## What we're building
Insurance provider directories are full of **"ghost" listings**: providers who aren't taking patients,
moved, or don't answer. California's Knox-Keene timely-access rules (incl. SB 221 for mental health)
require state-regulated plans (most HMOs, Medi-Cal managed care) to offer appointments within set
deadlines, and to arrange care (incl. out-of-network) when they can't. Today the patient has to prove
the failure themselves by calling offices one by one. GhostBuster does that legwork and builds the evidence.

### 5-step user flow
1. User enters insurer, plan type (hmo / ppo / medi_cal / unknown), zip, specialty, new vs follow-up.
2. We pull the insurer's listed providers and cross-check public profiles. Listed-but-not-accepting = **ghost**.
3. With the user's permission, an AI voice agent calls the remaining providers and asks for the
   earliest new-patient opening with that plan.
4. We convert the answer to **business days** and compare it to the legal deadline (rules table).
5. **Ending A**: someone is available in time → show them.
   **Ending B**: nobody meets the deadline → evidence call log + letter to the insurer requesting timely
   care + member-services script + DMHC complaint info (the "packet").

The engine supports ALL specialties via the rules table; **the demo shows the therapy path.**

## Hackathon constraints (non-negotiable)
- Final submission **Sunday 12:00 PM PT. NO git commits after that — disqualification.**
- **Initial Devpost submission (placeholder OK) due Sunday 11:00 AM.** Final needs a public 3-min video,
  write-up and repo link. Hacker Guide says to keep 2 hours for the video and write-up.
- Judging is Sunday 12:30–2:30 PM at our table. **If any teammate is missing, the judge gives a zero.**
- Hacking room closes Saturday 9:00 PM and reopens Sunday 7:00 AM.
- Judged on Idea, Demo, Technical Complexity, Completion (3-min live demo + 2-min Q&A).
- **Code quality is NOT judged. Working demo path > everything.** Don't over-engineer, don't refactor
  other people's code, don't add abstractions "for later".
- The live demo must never hang (see Reliability).

## Product honesty rules (must stay true in every screen/feature)
- First screen always shows **"In crisis? Call or text 988"**.
- If plan type is `ppo` or `unknown`, warn that **self-funded employer plans may not be covered by CA rules**.
- Output is an **"evidence log + template," not legal advice.** Say so on the packet.
- AI calls go **ONLY to `TEAMMATE_PHONE_1/2/3`** (Twilio trial = verified numbers only). The calls module
  must refuse any other number. Never dial a real provider.
- The agent **discloses it is an AI assistant calling on behalf of a patient**, in its first sentence.

## Stack (fixed — do not change)
- Backend: Python FastAPI (`/backend`), target **Python 3.12** (3.11–3.13 supported; `.python-version`)
- DB: Neon Postgres, `DATABASE_URL` in `.env` (never committed)
- Frontend: Next.js (App Router) + Tailwind + TypeScript (`/frontend`)
- Scraping: Bright Data (Web Unlocker / Scraping Browser / MCP); free NPI Registry API as backup
- Voice: ElevenLabs Conversational AI agent + Twilio outbound; post-call webhook delivers transcript
- LLM: Gemini API for extracting the earliest appointment date from transcripts

## Ownership map — never edit another person's folder without asking them
Code to the shared contract (`docs/DATA_CONTRACT.md`, `docs/API.md`) instead. If the contract needs to
change, tell the team first, then update the doc + `backend/app/models.py` + `frontend/lib/types.ts` together.

| Person | Owns |
|---|---|
| **Aryan** | `/frontend`, `/backend/app` (routes, main, glue, fake mode), `/backend/packet` (code) |
| **Ivan** | `/backend/scraper`, `/db` |
| **Hardik** | `/backend/calls`, `/backend/rules` |
| **Jai** | `docs/RULES.md`, `docs/DEMO.md`, `docs/PITCH.md`, packet template text (`backend/packet/templates/`) |

Shared (coordinate before editing): `CLAUDE.md`, `README.md`, `docs/API.md`, `docs/DATA_CONTRACT.md`,
`docs/ARCHITECTURE.md`, `docs/TASKS.md` (everyone ticks their own boxes), `.env.example`, `Makefile`.

## Module seams (function signatures are the contract between owners)
- `scraper/providers.py: get_providers(insurer, zip, specialty) -> list[Provider]` (Ivan)
- `scraper/ghosts.py: run_ghost_check(providers) -> list[Provider]` (Ivan)
- `rules/deadlines.py: DEADLINES, business_days_between(start, end), check_violation(provider, search) -> Provider` (Hardik)
- `calls/agent.py: start_verification(search_id, provider_ids)` (Hardik)
- `calls/webhook.py: handle_call_complete(payload) -> CallResult | None` — pure parse + date extraction, no DB (Hardik)
- `app/store.py` picks fake vs real backend; call `store.get(search_id)` etc. from anywhere
- `packet/render.py: render_packet(search_id) -> str` (Aryan code, Jai text)
- Glue that wires these together: `app/pipeline.py` (real mode) and `app/fake.py` (FAKE_MODE) (Aryan)

## Git workflow
- Commit directly to `main`. Small commits, push often.
- **`git pull --rebase` before every push.** Resolve conflicts, don't discard others' work.
- Commit message format: `[name] area: what` — e.g. `[ivan] scraper: bright data fallback to NPI`.
- **Never commit `.env`** or any key/token/phone number. Never force-push.
- Last commit must land before Sunday 12:00 PM PT.

## Reliability rule
- Every external call (Bright Data, NPI, Gemini, ElevenLabs, Twilio) has a **timeout** and **falls back to
  Neon cache / seed data**. Wrap with `app.pipeline.with_timeout(fn, seconds, fallback)`.
- **`FAKE_MODE=true` makes everything work with zero API keys and no DB** (in-memory, simulated ~20s run).
  Default is `true`. Keep it working — it's our demo safety net.

## Docs
- `docs/ARCHITECTURE.md` — flow diagram, which module owns which step
- `docs/DATA_CONTRACT.md` — tables, columns, enums, example rows
- `docs/API.md` — endpoints, request/response JSON, errors, polling
- `docs/RULES.md` — legal deadlines table (Jai verifying)
- `docs/DEMO.md`, `docs/PITCH.md` — demo script, Q&A, Devpost
- `docs/RESEARCH_NOTES.md` — what to trust / not trust from the background research PDFs
- `docs/TASKS.md` — per-person checklist + checkpoints (4:00 PM, 6:00 PM Sat)
- `README.md` — setup and run commands

## Background research PDFs (not in the repo) — details in `docs/RESEARCH_NOTES.md`
- AI-generated reports; **where they disagree with `docs/RULES.md`, RULES.md wins.**
- Never use from them: UC SHIP as a covered plan, AB 298 / SB 1280 / AB 280 benchmarks, the 55% / 82%
  stats as California numbers, "3–5 calls legally triggers out-of-network", Mastra / Basement prize tracks.
- Blueprint extras (entity resolution, license checks, out-of-network matching, call recording) are out of scope.

## Current status (update this list as you land things — one line each)
- [x] Base scaffold: contracts, docs, FAKE_MODE backend, stub modules, frontend shells (Aryan)
- [x] Contract v2: urgent = calendar hours, `calling` status, `prior_appointment_date` (Aryan)
- [x] Neon schema applied + seeded (Ivan)
- [x] Real scraper / ghost check (Ivan) — providers from NPI (`DIRECTORY_URLS` still empty, no insurer
      directory); ghost check = Bright Data SERP + Web Unlocker + Gemini on public profiles (page must mention the
      provider's city/ZIP). Pre-warmed Blue Shield / 92103 / therapist: 90 checked, 5 real ghosts, 19 with a
      "Profile checked: page says accepting new clients (url)" note in `ghost_reason` on `unverified` rows.
      Needs `BRIGHTDATA_*` (incl. `BRIGHTDATA_SERP_ZONE`) + `GEMINI_API_KEY`; other searches: `python -m scraper.prewarm`
- [x] Rules verified against DMHC (Jai) + business-day tests (Hardik)
- [ ] ElevenLabs/Twilio agent calling teammate phones (Hardik)
- [ ] Webhook + Gemini extraction (Hardik)
- [ ] Frontend screens wired to API (Aryan)
- [x] Packet letter/script templates (Jai) + render (Aryan)
