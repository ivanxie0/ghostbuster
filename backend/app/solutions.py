"""Out-of-network "proposed solution" for the Ending B packet. Owner: Aryan.

From existing data only: licensed providers near the search's ZIP (this search's rows + Ivan's cached registry list
for the same insurer/ZIP/specialty) whose cached public-profile check says "accepting new clients" and that cite a
source page. Never demo rows; never blocked sources (Psychology Today, Headway, Alma, Google Maps).
Network status and availability are NOT confirmed — the packet says so.
"""
import re

from app import db
from app.config import FAKE_MODE

BLOCKED = ("psychologytoday.", "headway.co", "alma.com", "helloalma.com", "google.com/maps", "maps.google.",
           "goo.gl/maps", "maps.app.goo.gl")
SEED_PREFIX = "https://example.com/"
URL_AT_END = re.compile(r"\((https?://[^\s)]+)\)\s*$")
MATCHED_TEXT = "accepting new clients"  # the phrase the profile check matched (scraper/ghosts.py ACCEPTING_PATTERN)


def blocked(url: str | None) -> bool:
    return bool(url) and any(b in url.lower() for b in BLOCKED)


def _zip(address: str | None) -> str:
    z = re.findall(r"\b\d{5}\b", address or "")
    return z[-1] if z else ""


def oon_candidates(search, providers, limit: int = 5) -> list[dict]:
    """Up to `limit` dicts: name, address, phone, source_url, checked_at, matched_text. [] in fake mode or on error."""
    if FAKE_MODE:
        return []
    try:
        from scraper import cache  # Ivan's cache API, read-only

        with db.connect() as c:
            rows = c.execute(
                "SELECT key, payload, fetched_at FROM scrape_cache WHERE key LIKE 'profile:%%'").fetchall()
        verdicts = {r["key"]: (r["payload"] or {}, r["fetched_at"]) for r in rows}
        pool = [p.model_dump() for p in providers if not (p.source_url or "").startswith(SEED_PREFIX)]
        pool += cache.get(cache.providers_key(search.insurer, search.zip, search.specialty)) or []
        seen, out = set(), []
        for p in pool:
            key = cache.profile_key(p.get("name") or "", p.get("address"))
            if key in seen:
                continue
            seen.add(key)
            payload, fetched_at = verdicts.get(key, ({}, None))
            reason = payload.get("reason") or ""
            m = URL_AT_END.search(reason)
            if payload.get("verdict") != "ok" or not reason.startswith("Profile checked:") or "accepting" not in reason or not m:
                continue
            if blocked(m.group(1)) or (p.get("source_url") or "").startswith(SEED_PREFIX):
                continue
            out.append({"name": p.get("name"), "address": p.get("address"), "phone": p.get("phone"),
                        "source_url": m.group(1), "checked_at": fetched_at, "matched_text": MATCHED_TEXT})
        out.sort(key=lambda x: _zip(x["address"]) != search.zip)  # same ZIP first
        return out[:limit]
    except Exception as e:
        print(f"[solutions] oon_candidates failed: {e!r}")
        return []
