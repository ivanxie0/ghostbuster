"""Step 2a: pull the insurer's listed providers. Owner: Ivan.

Contract: get_providers(insurer, zip, specialty) -> list[Provider]
  - Return providers with ghost_status="unverified" (ghost flags are ghosts.py's job).
  - Leave id/search_id empty — the glue assigns them.
  - Must not hang: app.pipeline wraps this in a 25s timeout and falls back to load_seed_providers().

Order: Neon cache -> Bright Data insurer directory (+ Gemini extraction) -> NPI Registry -> seed.
Every successful live result is written to the Neon cache, so demo runs are instant after a pre-warm
(python -m scraper.prewarm). Live calls use a ~4s timeout; the pre-warm passes a long one.
"""
import json
import os
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import quote_plus

from app.config import FAKE_MODE
from app.models import Provider, Specialty
from scraper import cache, web

SEED_FILE = Path(__file__).resolve().parents[2] / "db" / "seed_providers.json"
LIVE_TIMEOUT_S = 4.0
MAX_REAL_PROVIDERS = 8  # keep the results list (and the ghost check) small enough for the demo

# Insurer public directory search URLs. {zip}, {q} (specialty search words) are filled in.
# These are the part most likely to need fixing: run `python -m scraper.probe "<url>"` on a real
# machine to see what Bright Data returns, then adjust. Keys are matched as substrings of the
# lower-cased insurer name. Empty string = no known directory URL yet -> skip straight to NPI.
DIRECTORY_URLS: dict[str, str] = {
    "blue shield": "",
    "anthem": "",
    "kaiser": "",
    "molina": "",
    "health net": "",
    "community health group": "",
}
SPECIALTY_SEARCH_WORDS = {
    "therapist": "therapist",
    "psychiatrist": "psychiatrist",
    "primary_care": "primary care",
    "specialist": "specialist",
}

# NPI Registry: search descriptions (wildcards allowed) + the NUCC taxonomy codes we accept as primary.
NPI_TAXONOMIES: dict[str, tuple[list[str], set[str]]] = {
    "therapist": (
        ["Marriage*", "Social Worker*", "Counselor*", "Psycholog*"],
        {"106H00000X", "1041C0700X", "101YM0800X", "101YP2500X", "101Y00000X", "103TC0700X", "103T00000X"},
    ),
    "psychiatrist": (["Psychiatry*"], {"2084P0800X", "2084P0804X", "2084P0805X"}),
    "primary_care": (
        ["Family Medicine*", "Internal Medicine*"],
        {"207Q00000X", "207QA0505X", "207R00000X", "208D00000X"},
    ),
    "specialist": (
        ["Cardiovascular*", "Dermatology*", "Neurology*", "Orthopaedic*"],
        {"207RC0000X", "207N00000X", "2084N0400X", "207X00000X"},
    ),
}


# ---------------------------------------------------------------- seed (fallback / demo phones)

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


def _demo_call_targets(specialty: Specialty) -> list[Provider]:
    """The seed providers whose phones are TEAMMATE_PHONE_* — the only numbers the agent may dial.
    Always appended so the live-call part of the demo works no matter what the scrape returned."""
    rows = json.loads(SEED_FILE.read_text())
    names = {r["name"] for r in rows if r["specialty"] == specialty and str(r["phone"]).startswith("$TEAMMATE")}
    return [p for p in load_seed_providers(specialty) if p.name in names]


# ---------------------------------------------------------------- helpers

def to_e164(phone: str | None) -> str | None:
    if not phone:
        return None
    digits = re.sub(r"\D", "", phone)
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]
    return f"+1{digits}" if len(digits) == 10 else None


def _dedupe(providers: list[Provider]) -> list[Provider]:
    seen, out = set(), []
    for p in providers:
        k = re.sub(r"[^a-z]", "", p.name.lower().split(",")[0])
        if k and k not in seen:
            seen.add(k)
            out.append(p)
    return out


# ---------------------------------------------------------------- source 1: insurer directory

def directory_url(insurer: str, zip: str, specialty: str) -> str | None:
    name = insurer.lower()
    for key, tmpl in DIRECTORY_URLS.items():
        if key in name and tmpl:
            return tmpl.format(zip=zip, q=quote_plus(SPECIALTY_SEARCH_WORDS[specialty]))
    return None


EXTRACT_PROMPT = """Below is the markdown of an insurance company's provider-directory search results page.
Extract every individual provider listed. Return JSON: {{"providers": [{{"name": str, "credentials": str|null,
"phone": str|null, "address": str|null, "accepting_new_patients": true|false|null, "profile_url": str|null}}]}}.
Only include providers actually shown on the page. If none, return {{"providers": []}}.

PAGE:
{page}"""


def from_directory(insurer: str, zip: str, specialty: Specialty, timeout: float) -> list[Provider]:
    url = directory_url(insurer, zip, specialty)
    if not url or not web.brightdata_configured():
        return []
    status, page = web.unlock(url, timeout=timeout)
    if status >= 400 or len(page) < 200:
        return []
    data = web.gemini_json(EXTRACT_PROMPT.format(page=page[:40000]), timeout=timeout)
    out = []
    for r in data.get("providers", []):
        if not r.get("name"):
            continue
        name = r["name"] + (f", {r['credentials']}" if r.get("credentials") else "")
        out.append(Provider(name=name, specialty=specialty, phone=to_e164(r.get("phone")),
                            address=r.get("address"), source_url=r.get("profile_url") or url))
    return out


# ---------------------------------------------------------------- source 2: NPI Registry

def _npi_to_provider(rec: dict, specialty: Specialty) -> Provider | None:
    b = rec.get("basic", {})
    if b.get("status", "A") != "A":
        return None
    loc = next((a for a in rec.get("addresses", []) if a.get("address_purpose") == "LOCATION"), None)
    if not loc:
        return None
    first, last = (b.get("first_name") or "").title(), (b.get("last_name") or "").title()
    cred = (b.get("credential") or "").replace(".", "").strip()
    name = f"{first} {last}".strip() + (f", {cred}" if cred else "")
    addr = ", ".join(x for x in [loc.get("address_1"), loc.get("address_2"), loc.get("city", "").title(),
                                 f"{loc.get('state', '')} {str(loc.get('postal_code', ''))[:5]}".strip()] if x)
    return Provider(name=name, specialty=specialty, phone=to_e164(loc.get("telephone_number")), address=addr,
                    source_url=f"https://npiregistry.cms.hhs.gov/provider-view/{rec.get('number')}")


def from_npi(zip: str, specialty: Specialty, timeout: float) -> list[Provider]:
    descs, codes = NPI_TAXONOMIES[specialty]

    def one(desc: str) -> list[dict]:
        try:
            return web.npi_search(timeout, postal_code=f"{zip}*", taxonomy_description=desc)
        except Exception as e:
            print(f"[providers] npi {desc!r} failed: {e!r}")
            return []

    with ThreadPoolExecutor(max_workers=len(descs)) as ex:
        records = [r for batch in ex.map(one, descs) for r in batch]
    out = []
    for rec in records:
        primary = {t.get("code") for t in rec.get("taxonomies", []) if t.get("primary")}
        if primary & codes:
            p = _npi_to_provider(rec, specialty)
            if p and p.phone:
                out.append(p)
    return out


# ---------------------------------------------------------------- entry point

def scrape_live(insurer: str, zip: str, specialty: Specialty, timeout: float) -> tuple[str, list[Provider]]:
    """Live scrape without the cache. Returns (source, providers). Used by get_providers and prewarm."""
    try:
        found = from_directory(insurer, zip, specialty, timeout)
        if found:
            return "brightdata+gemini", _dedupe(found)
    except Exception as e:
        print(f"[providers] directory scrape failed: {e!r}")
    try:
        found = from_npi(zip, specialty, timeout)
        if found:
            return "npi", _dedupe(found)
    except Exception as e:
        print(f"[providers] npi failed: {e!r}")
    return "none", []


def get_providers(insurer: str, zip: str, specialty: Specialty, *, timeout: float = LIVE_TIMEOUT_S) -> list[Provider]:
    """Return the providers the insurer's directory lists for this zip + specialty (see module doc)."""
    if FAKE_MODE:  # keep FAKE_MODE instant and offline (demo safety net)
        return load_seed_providers(specialty)

    key = cache.providers_key(insurer, zip, specialty)
    cached = cache.get(key)
    if cached:
        real = [Provider(**r) for r in cached]
    else:
        source, real = scrape_live(insurer, zip, specialty, timeout)
        if real:
            cache.put(key, source, [p.model_dump(include={"name", "specialty", "phone", "address", "source_url"})
                                    for p in real])

    real = real[:MAX_REAL_PROVIDERS]
    if not real:
        return load_seed_providers(specialty)
    return _dedupe(real + _demo_call_targets(specialty))
