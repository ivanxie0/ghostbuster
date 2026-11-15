PY := backend/.venv/bin/python
# Prefer Python 3.12 (see .python-version); fall back to 3.13 / 3.11 / python3.
PYTHON ?= $(shell command -v python3.12 || command -v python3.13 || command -v python3.11 || command -v python3)

.PHONY: setup dev-backend dev-frontend seed test tunnel

setup:
	@test -f .env || cp .env.example .env
	@echo "Using $(PYTHON) ($$($(PYTHON) --version))"
	$(PYTHON) -m venv backend/.venv
	$(PY) -m pip install -q -r backend/requirements.txt
	cd frontend && npm install

dev-backend:
	cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev

# Applies db/schema.sql and upserts seed data into Neon (needs DATABASE_URL). Safe to re-run.
seed:
	$(PY) db/seed.py

test:
	cd backend && .venv/bin/python -m pytest -q

# Public URL for ElevenLabs webhooks: ngrok on your fixed domain (NGROK_DOMAIN in .env). Ctrl+C to stop.
tunnel:
	./scripts/tunnel.sh
