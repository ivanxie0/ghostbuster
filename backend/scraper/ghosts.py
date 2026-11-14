"""Step 2b: cross-check public profiles and flag ghosts. Owner: Ivan.

Contract: run_ghost_check(providers) -> list[Provider]
  - Same providers back (same order, same ids), with ghost_status set to "ghost" + ghost_reason for
    listed-but-not-really-available providers. Everyone else stays "unverified".
  - Must not hang: app.pipeline wraps this in a 20s timeout and falls back to the unflagged list.
"""
import json

from app.models import Provider
from scraper.providers import SEED_FILE


def run_ghost_check(providers: list[Provider]) -> list[Provider]:
    """Flag ghosts.

    TODO(Ivan): for each provider, fetch public profile (Psychology Today-style page / practice site via
    Bright Data) and NPI Registry; mark ghost if: "not accepting new clients", moved (NPI address differs),
    deactivated NPI, disconnected phone, out-of-network. Put a short human-readable ghost_reason.
    Stub: applies the ghost flags from db/seed_providers.json by name.
    """
    seed = {r["name"]: r for r in json.loads(SEED_FILE.read_text())}
    out = []
    for p in providers:
        r = seed.get(p.name)
        if r and r["ghost_status"] == "ghost":
            p = p.model_copy(update={"ghost_status": "ghost", "ghost_reason": r["ghost_reason"]})
        out.append(p)
    return out
