"""Pre-warm the Neon cache with real scrapes so demo searches are instant. Owner: Ivan.

Run from backend/ (needs DATABASE_URL + FAKE_MODE=false in .env; Bright Data/Gemini keys optional):
    .venv/bin/python -m scraper.prewarm
    .venv/bin/python -m scraper.prewarm --zips 92122 --insurers "Blue Shield of California" --specialties therapist
Uses long timeouts (not the 4s live one) and also runs the ghost check so profile verdicts get cached.
"""
import argparse
import time

from scraper import cache
from scraper.providers import scrape_live

ZIPS = ["92122", "92037", "92101", "92173", "91932"]
INSURERS = ["Blue Shield of California", "Anthem Blue Cross", "Molina Healthcare"]
SPECIALTIES = ["therapist", "psychiatrist", "primary_care"]


def _check_many(provs, timeout: float) -> int:
    """Profile-check providers with a long per-step timeout and cache every verdict. Returns ghost count."""
    from concurrent.futures import ThreadPoolExecutor

    from scraper import ghosts

    ghosts.STEP_TIMEOUT_S = min(timeout, 30.0)

    def one(p) -> bool:
        try:
            return ghosts._check_cached(p)[0] == "ghost"
        except Exception as e:
            print(f"[prewarm] {p.name}: {e!r}"[:160])
            return False

    with ThreadPoolExecutor(max_workers=6) as ex:
        return sum(ex.map(one, provs))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--zips", nargs="+", default=ZIPS)
    ap.add_argument("--insurers", nargs="+", default=INSURERS)
    ap.add_argument("--specialties", nargs="+", default=SPECIALTIES)
    ap.add_argument("--timeout", type=float, default=60.0)
    ap.add_argument("--skip-ghosts", action="store_true")
    ap.add_argument("--ghost-limit", type=int, default=60, help="providers per search to profile-check")
    a = ap.parse_args()

    if not cache._enabled():
        raise SystemExit("Cache disabled: set DATABASE_URL and FAKE_MODE=false in .env, then `make seed`.")

    for spec in a.specialties:
        for zip_ in a.zips:
            for ins in a.insurers:
                t = time.time()
                source, provs = scrape_live(ins, zip_, spec, a.timeout)
                if provs:
                    cache.put(cache.providers_key(ins, zip_, spec), source,
                              [p.model_dump(include={"name", "specialty", "phone", "address", "source_url"})
                               for p in provs])
                ghosts = 0
                if provs and not a.skip_ghosts:
                    ghosts = _check_many(provs[:a.ghost_limit], a.timeout)
                print(f"{spec:13} {zip_} {ins[:28]:28} -> {len(provs):3} via {source:17} "
                      f"ghosts={ghosts} ({time.time() - t:.1f}s)")


if __name__ == "__main__":
    main()
