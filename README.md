# GhostBuster

Insurance directories are full of "ghost" providers who aren't really taking patients. GhostBuster
checks the listings, has an AI assistant call the rest, compares the earliest opening to California's
timely-access deadlines, and builds an evidence packet when the plan falls short. SanD Hacks Fall 2026.

**Team: read [CLAUDE.md](CLAUDE.md) first** (ownership, git rules, contracts).
Docs: [ARCHITECTURE](docs/ARCHITECTURE.md) · [DATA_CONTRACT](docs/DATA_CONTRACT.md) · [API](docs/API.md) ·
[RULES](docs/RULES.md) · [TASKS](docs/TASKS.md) · [DEMO](docs/DEMO.md) · [PITCH](docs/PITCH.md)

## Prerequisites
- **Python 3.12** (`.python-version`; 3.11–3.13 supported — pins verified on 3.11 and 3.14), Node 20+ (tested on 24), npm, make
  - macOS: `brew install python@3.12` · pyenv: `pyenv install 3.12` (picks up `.python-version`)
  - `make setup` auto-picks python3.12 → 3.13 → 3.11 → python3
- For real mode: a Neon Postgres URL; API keys as listed in `.env.example`
- For webhooks: [ngrok](https://ngrok.com/download) (or any tunnel)

## Setup (once)
```bash
git clone https://github.com/ivanxie0/ghostbuster.git && cd ghostbuster
```
```bash
make setup
```
`make setup` copies `.env.example` → `.env`, creates `backend/.venv`, installs Python deps and `frontend/node_modules`.
Manual equivalent:
```bash
cp .env.example .env
python3.12 -m venv backend/.venv && backend/.venv/bin/pip install -r backend/requirements.txt
cd frontend && npm install
```

## Run in FAKE_MODE (no keys, no DB) — default
Two terminals:
```bash
make dev-backend
```
```bash
make dev-frontend
```
Open http://localhost:3000 → Start → Search. The backend simulates the whole run in ~20s:
providers appear → ghosts flagged → you approve calls → calls resolve one by one → `done` (Ending B by default).
- `FAKE_ENDING=A` in `.env` → one provider is available in time (Ending A).
- Calls start when you press **Check these for me** (consent). `FAKE_AUTO_VERIFY=true` auto-starts them ~10s in, for curl-only testing.

Quick API check:
```bash
curl -s localhost:8000/api/health
```
```bash
curl -s -XPOST localhost:8000/api/search -H 'content-type: application/json' -d '{"insurer":"Blue Shield of California","plan_type":"hmo","zip":"92103","specialty":"therapist","appointment_type":"new"}'
```

## Run with real keys + Neon
1. Fill `.env`: `DATABASE_URL`, `FAKE_MODE=false`, plus any keys you have (missing ones fall back to stubs).
2. Create tables + seed data (idempotent, safe to re-run):
   ```bash
   make seed
   ```
3. `make dev-backend` and `make dev-frontend` as above. `/api/health` should show `"fake_mode": false`.

## Exposing the backend for ElevenLabs webhooks
Uses your free, fixed ngrok domain, so the webhook URL never changes.
1. `brew install ngrok`, then `ngrok config add-authtoken <token>` once (or put `NGROK_AUTHTOKEN=` in `.env`).
2. Put your domain in `.env`: `NGROK_DOMAIN=name.ngrok-free.dev` (dashboard.ngrok.com → Domains).
3. Run it (keep it running while calls happen):
```bash
make tunnel
```
It writes `PUBLIC_BASE_URL` into `.env`, prints the webhook URL, and runs ngrok. Restart the backend once after
the first run. Set the ElevenLabs agent's post-call webhook to `<PUBLIC_BASE_URL>/api/webhooks/call-complete`.

## Tests
```bash
make test
```

## Troubleshooting
- **`/api/health` says `fake_mode: true` but I set false** — `DATABASE_URL` is empty; config forces fake mode.
- **Frontend shows "Failed to fetch"** — backend not running on :8000, or set `NEXT_PUBLIC_API_URL` in `frontend/.env.local` and restart `npm run dev`.
- **pip can't find a wheel / build fails** — you're probably on Python 3.10 or older: install 3.12, delete the `backend/.venv` folder, re-run `make setup`.
- **`ModuleNotFoundError: app`** — run uvicorn from `/backend` (`make dev-backend` does this).
- **psycopg connection errors** — Neon URL needs `?sslmode=require`; check the project isn't suspended.
- **Seeded demo providers have no phone** — set `TEAMMATE_PHONE_1/2/3` in `.env` and re-run `make seed`.
- **Webhook never arrives** — ngrok URL changed (it does on restart); update ElevenLabs + `PUBLIC_BASE_URL`.
- **Port in use** — `lsof -ti:8000 | xargs kill` (or :3000).

Output is an evidence log + templates, **not legal advice**. In crisis? Call or text **988**.
