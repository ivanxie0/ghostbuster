"""Debug helper: see what Bright Data returns for a URL (to fill DIRECTORY_URLS in providers.py). Owner: Ivan.

    cd backend && .venv/bin/python -m scraper.probe "https://example.com/find-a-doctor?zip=92122"
Prints the target status, length and the first 3000 chars of markdown; saves the full page to /tmp/probe.md.
"""
import sys
import time

from scraper import web

url = sys.argv[1]
t = time.time()
status, page = web.unlock(url, timeout=90)
print(f"status={status} chars={len(page)} took={time.time() - t:.1f}s")
print(page[:3000])
open("/tmp/probe.md", "w").write(page)
print("\nfull page -> /tmp/probe.md")
