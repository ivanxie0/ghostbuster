PY := backend/.venv/bin/python

.PHONY: setup dev-backend dev-frontend seed test

setup:
	@test -f .env || cp .env.example .env
	python3 -m venv backend/.venv
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
