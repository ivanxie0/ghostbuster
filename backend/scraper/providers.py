"""Step 2a: pull the insurer's listed providers. Owner: Ivan.

Contract: get_providers(insurer, zip, specialty) -> list[Provider]
  - Return providers with ghost_status="unverified" (ghost flags are ghosts.py's job).
  - Leave id/search_id empty — the glue assigns them.
  - Must not hang: app.pipeline wraps this in a 25s timeout and falls back to load_seed_providers().
"""
import json
import os
from pathlib import Path

from app.models import Provider, Specialty

SEED_FILE = Path(__file__).resolve().parents[2] / "db" / "seed_providers.json"


def _resolve_phone(phone: str | None) -> str | None:
    if phone and phone.startswith("$"):
        return os.getenv(phone[1:]) or None
    return phone


def load_seed_providers(specialty: Specialty) -> list[Provider]:
    """Fallback/cached data: fictional San Diego providers from db/seed_providers.json, unflagged."""
    rows = json.loads(SEED_FILE.read_text())
    return [
        Provider(name=r["name"], specialty=r["specialty"], phone=_resolve_phone(r["phone"]),
                 address=r["address"], source_url=r["source_url"], ghost_status="unverified")
        for r in rows if r["specialty"] == specialty
    ]


def get_providers(insurer: str, zip: str, specialty: Specialty) -> list[Provider]:
    """Return the providers the insurer's directory lists for this zip + specialty.

    TODO(Ivan):
      1. Neon cache: if we scraped this (insurer, zip, specialty) recently, return that.
      2. Bright Data (BRIGHTDATA_API_TOKEN / BRIGHTDATA_ZONE) scrape of the insurer directory, with timeout.
      3. Fallback: NPI Registry API (https://npiregistry.cms.hhs.gov/api/?version=2.1&postal_code=...&taxonomy_description=...)
      4. Fallback: load_seed_providers(specialty)
      Demo safety: always include the 3 TEAMMATE_PHONE_* seed providers for the therapist path.
    """
    return load_seed_providers(specialty)
