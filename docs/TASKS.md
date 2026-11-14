# Tasks

Tick your own boxes. Checkpoints: **4:00 PM Sat** and **6:00 PM Sat** — quick sync, show what works.
Final submission **Sun 12:00 PM PT** — no commits after.

## Aryan — frontend, app glue, packet
- [x] Scaffold repo, contracts, docs, FAKE_MODE, stubs
- [ ] `/` landing: 988 banner, pitch line, start button
- [ ] `/search` form + PPO/unknown coverage warning
- [ ] `/results/[id]`: polling list, ghost badges, permission + verify button, live call status
- [ ] Ending A view / Ending B view
- [ ] `/packet/[id]` + `packet/render.py` with Jai's templates
- [ ] Integration: switch to FAKE_MODE=false end to end with Neon

## Ivan — db, scraper
- [ ] Apply `db/schema.sql` to Neon (`make seed` does it)
- [ ] Seed data reviewed (`db/seed_providers.json`)
- [ ] `scraper/providers.py`: Bright Data scrape of an insurer directory (pick one insurer for demo)
- [ ] NPI Registry fallback
- [ ] `scraper/ghosts.py`: cross-check profiles → ghost flags + reasons
- [ ] Cache scraped results in Neon; timeout → cache/seed fallback

## Hardik — rules, calls
- [ ] `rules/deadlines.py`: DEADLINES + holidays + `business_days_between` + `check_violation` + tests
- [ ] ElevenLabs agent prompt (discloses AI, asks earliest new-patient opening for plan)
- [ ] Twilio outbound via ElevenLabs to TEAMMATE_PHONE_* only (allowlist enforced)
- [ ] `calls/webhook.py`: parse post-call payload, Gemini date extraction, update provider
- [ ] Timeouts + fallbacks on every external call

## Jai — rules, content, demo
- [x] Verify `docs/RULES.md` against DMHC; send Hardik any changes
- [ ] Coverage warning text (PPO / unknown / self-funded)
- [ ] Letter-to-insurer template + member-services script + DMHC complaint info (`backend/packet/templates/`)
- [ ] `docs/DEMO.md` 3-min script + Q&A answers
- [ ] `docs/PITCH.md` Devpost draft

## Checkpoint 4:00 PM
- [ ] Every module returns real-ish data through the contract (even if partially stubbed)
- [ ] Frontend shows a FAKE_MODE run end to end

## Checkpoint 6:00 PM
- [ ] One real AI call to a teammate phone lands in the webhook and flips a row
- [ ] Neon in use (FAKE_MODE=false) for at least one full run
- [ ] Packet renders with real template text
