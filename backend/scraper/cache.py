"""Neon cache for scrape results (table scrape_cache in db/schema.sql). Owner: Ivan.

Every function is a silent no-op when there's no DB (FAKE_MODE or empty DATABASE_URL) or the DB errors,
so the cache can never break a search. Keys:
  providers:<insurer>|<zip>|<specialty>   -> list of Provider dicts (directory/NPI results)
  profile:<url-or-name>                   -> {"status", "reason"} ghost-check result for one provider
"""
import json

from app.config import DATABASE_URL, FAKE_MODE

MAX_AGE_DAYS = 7  # demo data: treat anything from the last week as fresh


def _enabled() -> bool:
    return bool(DATABASE_URL) and not FAKE_MODE


def _connect():
    import psycopg

    return psycopg.connect(DATABASE_URL, connect_timeout=3)


def providers_key(insurer: str, zip: str, specialty: str) -> str:
    return f"providers:{insurer.strip().lower()}|{zip}|{specialty}"


def get(key: str, max_age_days: int = MAX_AGE_DAYS):
    if not _enabled():
        return None
    try:
        with _connect() as c:
            row = c.execute(
                "SELECT payload FROM scrape_cache WHERE key = %s "
                "AND fetched_at > now() - make_interval(days => %s)",
                (key, max_age_days),
            ).fetchone()
            return row[0] if row else None
    except Exception as e:
        print(f"[cache] get {key!r} failed: {e!r}")
        return None


def put(key: str, source: str, payload) -> None:
    if not _enabled():
        return
    try:
        with _connect() as c:
            c.execute(
                "INSERT INTO scrape_cache (key, source, payload, fetched_at) VALUES (%s, %s, %s::jsonb, now()) "
                "ON CONFLICT (key) DO UPDATE SET source = EXCLUDED.source, payload = EXCLUDED.payload, "
                "fetched_at = now()",
                (key, source, json.dumps(payload, default=str)),
            )
    except Exception as e:
        print(f"[cache] put {key!r} failed: {e!r}")


def all_provider_entries() -> list[tuple[str, str, list]]:
    """(key, source, payload) for every cached provider list — used by the ghost-stats endpoint later."""
    if not _enabled():
        return []
    try:
        with _connect() as c:
            return c.execute(
                "SELECT key, source, payload FROM scrape_cache WHERE key LIKE 'providers:%'"
            ).fetchall()
    except Exception as e:
        print(f"[cache] list failed: {e!r}")
        return []
