"""Pre-warm the Neon cache with real scrapes so demo searches are instant. Owner: Ivan.

Run from backend/ (needs DATABASE_URL + FAKE_MODE=false in .env; Bright Data/Gemini keys optional):
    .venv/bin/python -m scraper.prewarm
    .venv/bin/python -m scraper.prewarm --zips 92122 --insurers "Blue Shield of California" --specialties therapist
Uses long timeouts (not the 4s live one) and also runs the ghost check so profile verdicts get cached.
"""
import argparse
import time

from scraper import cache
from scraper.ghosts import run_ghost_check
from scraper.providers import scrape_live

ZIPS = ["92122", "92037", "92101", "92173", "91932"]
INSURERS = ["Blue Shield of California", "Anthem Blue Cross", "Molina Healthcare"]
SPECIALTIES = ["therapist", "psychiatrist", "primary_care"]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--zips", nargs="+", default=ZIPS)
    ap.add_argument("--insurers", nargs="+", default=INSURERS)
    ap.add_argument("--specialties", nargs="+", default=SPECIALTIES)
    ap.add_argument("--timeout", type=float, default=60.0)
    ap.add_argument("--skip-ghosts", action="store_true")
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
                    ghosts = sum(p.ghost_status == "ghost" for p in run_ghost_check(provs[:8]))
                print(f"{spec:13} {zip_} {ins[:28]:28} -> {len(provs):3} via {source:17} "
                      f"ghosts={ghosts} ({time.time() - t:.1f}s)")


if __name__ == "__main__":
    main()
