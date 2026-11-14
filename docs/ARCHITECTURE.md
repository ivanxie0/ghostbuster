# Architecture

```
 ┌──────────────────────────┐   POST /api/search            ┌──────────────────────────────────────────┐
 │  Frontend (Next.js)      │ ────────────────────────────▶ │  FastAPI  backend/app  (Aryan)           │
 │  /frontend  (Aryan)      │   GET /api/search/{id}  (2s)  │   routes.py → store (fake.py | pipeline) │
 │  / → /search →           │ ◀──────────────────────────── │                                          │
 │  /results/[id] →         │   POST /api/search/{id}/verify│                                          │
 │  /packet/[id]            │ ────────────────────────────▶ │                                          │
 └──────────────────────────┘   GET /api/search/{id}/packet └───┬──────────┬──────────┬──────────┬────┘
                                                                │ step 2   │ step 3   │ step 4   │ step 5
                                                                ▼          ▼          ▼          ▼
                                           ┌─────────────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
                                           │ scraper/  (Ivan)    │ │ calls/       │ │ rules/       │ │ packet/      │
                                           │ providers.py        │ │ (Hardik)     │ │ (Hardik)     │ │ (Aryan code, │
                                           │  Bright Data → NPI  │ │ agent.py     │ │ deadlines.py │ │  Jai text)   │
                                           │  → seed fallback    │ │  ElevenLabs+ │ │ business days│ │ render.py    │
                                           │ ghosts.py           │ │  Twilio      │ │ + violation  │ │ letter/script│
                                           └─────────┬───────────┘ └──────┬───────┘ └──────────────┘ └──────────────┘
                                                     │                    │ outbound call (TEAMMATE_PHONE_* only)
                                                     ▼                    ▼
                                           ┌─────────────────────┐   ┌───────────────────────┐
                                           │ Neon Postgres (/db) │   │ ElevenLabs agent      │
                                           │ searches, providers │   │  post-call webhook ───┼──▶ POST /api/webhooks/call-complete
                                           │ (+ cache / seed)    │   └───────────────────────┘      → calls/webhook.py
                                           └─────────────────────┘                                   → Gemini extracts earliest date
                                                                                                     → rules.check_violation
                                                                                                     → update provider row
```

## Step → module → owner
| Step | What | Module | Owner |
|---|---|---|---|
| 1 | Form input, 988 banner, plan warning | `frontend/app/search` | Aryan |
| 2 | Pull listed providers, flag ghosts | `backend/scraper/providers.py`, `ghosts.py` | Ivan |
| 3 | AI calls to remaining providers | `backend/calls/agent.py` | Hardik |
| 3b | Post-call webhook, Gemini date extraction | `backend/calls/webhook.py` | Hardik |
| 4 | Business days vs legal deadline | `backend/rules/deadlines.py` | Hardik (rules verified by Jai) |
| 5 | Ending A list / Ending B packet | `frontend/app/results`, `backend/packet/render.py` | Aryan (+ Jai text) |
| glue | Wiring, timeouts, status transitions | `backend/app/pipeline.py`, `backend/app/fake.py` | Aryan |

## Search status lifecycle
`scraping` (step 2 running) → `verifying` (providers listed, calls pending/in progress) → `done`
(every called provider resolved). Frontend polls `GET /api/search/{id}` every 2s until `done`.

## Two modes
- **FAKE_MODE=true** (default): `app/fake.py` keeps searches in memory and simulates the full run in ~20s
  using the stub modules + `db/seed_providers.json`. No DB, no keys.
- **FAKE_MODE=false**: `app/pipeline.py` writes to Neon and calls the real modules, each wrapped in
  `with_timeout(...)` with a seed-data fallback.
