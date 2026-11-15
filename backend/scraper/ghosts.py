"""Step 2b: cross-check public profiles and flag ghosts. Owner: Ivan.

Contract: run_ghost_check(providers) -> list[Provider]
  - Same providers back (same order, same ids), with ghost_status set to "ghost" + ghost_reason for
    listed-but-not-really-available providers. Everyone else stays "unverified".
  - Must not hang: app.pipeline wraps this in a 20s timeout and falls back to the unflagged list.

Per provider (in parallel, whole check capped at OVERALL_BUDGET_S):
  1. Seed providers (fictional) keep their flags from db/seed_providers.json.
  2. Neon cache hit -> reuse the verdict.
  3. Find a public profile / practice page: the listing's own URL if it is one, else a Bright Data SERP
     search (only if BRIGHTDATA_SERP_ZONE is set).
  4. Fetch it via Bright Data Web Unlocker (markdown). 404/410 -> ghost ("page gone").
  5. Keyword match ("not accepting new clients", "waitlist", "out of network only", ...).
  6. No keyword hit -> optional Gemini classification (if GEMINI_API_KEY is set).
"""
import json
import os
import re
from concurrent.futures import ThreadPoolExecutor, wait
from urllib.parse import quote_plus

import httpx

from app.config import FAKE_MODE
from app.models import Provider
from scraper import cache, web
from scraper.providers import SEED_FILE

STEP_TIMEOUT_S = 4.0
OVERALL_BUDGET_S = 15.0

# (regex, human-readable reason). Checked in order; first hit wins.
GHOST_PATTERNS: list[tuple[str, str]] = [
    (r"\bnot (currently )?accepting (any )?new (clients|patients)", "public profile says not accepting new patients"),
    (r"\bno longer accepting (new )?(clients|patients)", "public profile says no longer accepting patients"),
    (r"\b(waitlist|wait list|waiting list) (is )?(closed|full)", "public profile says waitlist closed"),
    (r"\bcurrently (have|has) a (waitlist|wait list|waiting list)", "public profile says there is a waitlist"),
    (r"\b(practice|office) (is |has )?(permanently )?closed", "public profile says practice closed"),
    (r"\b(has )?retired\b", "public profile says provider retired"),
    (r"\bout[- ]of[- ]network (provider )?only", "public profile says out-of-network only"),
    (r"\b(do(es)? not|don't) (accept|take) (any )?insurance", "public profile says does not accept insurance"),
    (r"\b(private|self)[- ]pay only", "public profile says private pay only"),
    (r"\bno longer (in network|in-network|contracted) with", "public profile says no longer in network"),
]
ACCEPTING_PATTERN = r"\b(currently )?accepting new (clients|patients)\b"

CLASSIFY_PROMPT = """This is the public profile or practice web page of a healthcare provider named {name}.
Does the page say this provider is NOT available to a new patient using insurance (not accepting new
patients, waitlist closed/full, retired, moved away, closed, out-of-network/private pay only)?
Return JSON: {{"ghost": true|false, "reason": "<= 15 words quoting or paraphrasing the page, or empty"}}.
Answer ghost=false if the page doesn't clearly say so.

PAGE:
{page}"""


def classify_text(text: str) -> tuple[str | None, str | None]:
    """Keyword verdict. Returns ("ghost", reason) | ("ok", None) | (None, None) if the page says nothing."""
    t = re.sub(r"\s+", " ", text.lower())
    for pat, reason in GHOST_PATTERNS:
        if re.search(pat, t):
            return "ghost", reason
    if re.search(ACCEPTING_PATTERN, t):
        return "ok", None
    return None, None


def _profile_key(p: Provider) -> str:
    return cache.profile_key(p.name, p.address)


def _is_profile_url(url: str | None) -> bool:
    return bool(url) and not any(d in url for d in ("npiregistry.cms.hhs.gov", "example.com"))


def _search_profile_url(p: Provider) -> str | None:
    """Google via Bright Data SERP API (brd_json=1 returns parsed JSON). Needs BRIGHTDATA_SERP_ZONE."""
    zone, token = os.getenv("BRIGHTDATA_SERP_ZONE"), os.getenv("BRIGHTDATA_API_TOKEN")
    if not (zone and token):
        return None
    city = (p.address or "").split(",")[-2].strip() if p.address and p.address.count(",") >= 2 else "San Diego"
    q = f'"{p.name.split(",")[0]}" {city} CA accepting new clients'
    organic = []
    for _ in range(2):  # the SERP API occasionally returns an empty / non-JSON body; one retry
        r = httpx.post(web.BRIGHTDATA_URL, timeout=STEP_TIMEOUT_S,
                       headers={"Authorization": f"Bearer {token}"},
                       json={"zone": zone, "format": "raw",
                             "url": f"https://www.google.com/search?q={quote_plus(q)}&brd_json=1"})
        r.raise_for_status()
        try:
            organic = r.json().get("organic", [])
            break
        except ValueError:
            continue
    # Only trust a result that names this person: first AND last name must both appear, so we never
    # flag a provider from someone else's page.
    words = re.sub(r"^(dr\.?|mr\.?|ms\.?|mrs\.?)\s+", "", p.name.split(",")[0].lower()).split()
    if len(words) < 2:
        return None
    first, last = words[0], words[-1]
    for item in organic[:5]:
        link = item.get("link") or ""
        hay = re.sub(r"[^a-z]+", " ", (item.get("title", "") + " " + link).lower()).split()
        if first in hay and last in hay:
            return link
    return None


def _same_place(p: Provider, page: str) -> bool:
    """A searched-for page only counts if it mentions the provider's own city or ZIP. The listing's own
    URL (not found by search) is always trusted."""
    if _is_profile_url(p.source_url):
        return True
    parts = [x.strip() for x in (p.address or "").split(",")]
    city = parts[-2].lower() if len(parts) >= 2 else ""
    zips = re.findall(r"\b\d{5}\b", p.address or "")
    t = page.lower()
    return bool((city and city in t) or (zips and zips[-1] in t))


def check_one(p: Provider) -> tuple[str, str | None, str]:
    """Returns (verdict, reason, source). verdict: "ghost" | "ok" | "unknown"."""
    url = p.source_url if _is_profile_url(p.source_url) else _search_profile_url(p)
    if not url:
        return "unknown", None, "no-profile"
    status, page = web.unlock(url, timeout=STEP_TIMEOUT_S)
    if status in (404, 410):
        return "ghost", f"practice/profile page is gone (HTTP {status})", "brightdata"
    if not _same_place(p, page):  # same name, different person/place (e.g. an MD in another county): don't use it
        return "unknown", None, "mismatch"
    verdict, reason = classify_text(page)
    if verdict == "ok":  # the page itself says "accepting new clients/patients": worth showing, with the source
        return "ok", f"Profile checked: page says accepting new clients ({url})", "keyword"
    if verdict:
        return verdict, f"{reason} ({url})", "keyword"
    if os.getenv("GEMINI_API_KEY"):
        try:
            ans = web.gemini_json(CLASSIFY_PROMPT.format(name=p.name, page=page[:20000]), timeout=STEP_TIMEOUT_S)
            if ans.get("ghost"):
                return "ghost", f"{ans.get('reason') or 'public page says unavailable'} ({url})", "gemini"
            return "ok", None, "gemini"
        except Exception as e:
            print(f"[ghosts] gemini failed for {p.name}: {e!r}")
    return "unknown", None, "brightdata"


def _check_cached(p: Provider) -> tuple[str, str | None]:
    key = _profile_key(p)
    hit = cache.get(key)
    if hit:
        return hit["verdict"], hit.get("reason")
    verdict, reason, source = check_one(p)
    if verdict != "unknown":
        cache.put(key, source, {"verdict": verdict, "reason": reason})
    return verdict, reason


def run_ghost_check(providers: list[Provider]) -> list[Provider]:
    seed = {r["name"]: r for r in json.loads(SEED_FILE.read_text())}
    verdicts: dict[int, tuple[str, str | None]] = {}

    for i, p in enumerate(providers):
        if p.name in seed:
            r = seed[p.name]
            verdicts[i] = ("ghost", r["ghost_reason"]) if r["ghost_status"] == "ghost" else ("ok", None)

    todo = [i for i in range(len(providers)) if i not in verdicts]
    if todo and not FAKE_MODE and (web.brightdata_configured() or cache._enabled()):
        ex = ThreadPoolExecutor(max_workers=8)
        futs = {ex.submit(_check_cached, providers[i]): i for i in todo}
        done, _ = wait(futs, timeout=OVERALL_BUDGET_S)
        for f in done:
            try:
                verdicts[futs[f]] = f.result()
            except Exception as e:
                print(f"[ghosts] {providers[futs[f]].name}: {e!r}")
        ex.shutdown(wait=False, cancel_futures=True)

    out = []
    for i, p in enumerate(providers):
        verdict, reason = verdicts.get(i, ("unknown", None))
        if verdict == "ghost":
            p = p.model_copy(update={"ghost_status": "ghost", "ghost_reason": reason})
        elif verdict == "ok" and reason and p.name not in seed:
            # Stays "unverified" (not called yet); the note only records what the public profile says.
            p = p.model_copy(update={"ghost_reason": reason})
        out.append(p)
    return out
