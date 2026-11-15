"""Apply schema.sql and upsert ~25 FAKE San Diego providers into Neon. Idempotent — safe to re-run.

Owner: Ivan.  Run:  make seed   (or backend/.venv/bin/python db/seed.py)

Creates one fixed "seed" search per specialty (fixed UUIDs) and attaches the seed providers to it,
so the scraper can use them as a cache/fallback (SELECT ... FROM providers WHERE specialty = ...).
Phones like "$TEAMMATE_PHONE_1" are resolved from env at seed time (the 3 demo therapists).
All names are fictional. Phones are 555-01xx fiction-range numbers.
"""
import json
import os
import sys
import uuid
from pathlib import Path

import psycopg
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

SEED_NS = uuid.UUID("6a8f6c1e-5eed-4b0b-9c1d-000000000000")
SPECIALTIES = ["therapist", "psychiatrist", "primary_care", "specialist"]


def resolve_phone(phone: str | None) -> str | None:
    if phone and phone.startswith("$"):
        return os.getenv(phone[1:]) or None
    return phone


def load_seed_providers() -> list[dict]:
    rows = json.loads((ROOT / "db" / "seed_providers.json").read_text())
    for r in rows:
        r["phone"] = resolve_phone(r["phone"])
    return rows


def seed_search_id(specialty: str) -> str:
    return str(uuid.uuid5(SEED_NS, f"search:{specialty}"))


def main() -> None:
    url = os.getenv("DATABASE_URL")
    if not url:
        sys.exit("DATABASE_URL not set (put it in .env at the repo root)")
    rows = load_seed_providers()
    with psycopg.connect(url) as conn, conn.cursor() as cur:
        cur.execute((ROOT / "db" / "schema.sql").read_text())
        for spec in SPECIALTIES:
            cur.execute(
                """INSERT INTO searches (id, insurer, plan_type, zip, specialty, appointment_type, status)
                   VALUES (%s, 'SEED', 'hmo', '92103', %s, 'new', 'done')
                   ON CONFLICT (id) DO NOTHING""",
                (seed_search_id(spec), spec),
            )
        for r in rows:
            pid = str(uuid.uuid5(SEED_NS, f"provider:{r['name']}"))
            cur.execute(
                """INSERT INTO providers (id, search_id, name, specialty, phone, address, source_url,
                                          ghost_status, ghost_reason)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                   ON CONFLICT (id) DO UPDATE SET
                     phone = EXCLUDED.phone, address = EXCLUDED.address, source_url = EXCLUDED.source_url,
                     ghost_status = EXCLUDED.ghost_status, ghost_reason = EXCLUDED.ghost_reason""",
                (pid, seed_search_id(r["specialty"]), r["name"], r["specialty"], r["phone"],
                 r["address"], r["source_url"], r["ghost_status"], r["ghost_reason"]),
            )
        # Ids come from names, so a renamed seed provider is a new row: drop seed rows no longer in the file.
        keep = [str(uuid.uuid5(SEED_NS, f"provider:{r['name']}")) for r in rows]
        cur.execute(
            "DELETE FROM providers WHERE search_id = ANY(%s::uuid[]) AND NOT (id = ANY(%s::uuid[]))",
            ([seed_search_id(s) for s in SPECIALTIES], keep),
        )
        conn.commit()
    missing = [r["name"] for r in rows if r["phone"] is None]
    print(f"Seeded {len(rows)} providers across {len(SPECIALTIES)} seed searches.")
    if missing:
        print(f"WARNING: no phone for {missing} — set TEAMMATE_PHONE_1/2/3 in .env and re-run.")


if __name__ == "__main__":
    main()
