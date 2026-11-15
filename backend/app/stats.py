"""Ghost Map stats: GET /api/stats/ghosts. Owner: Aryan.

Built from real Neon data:
  - providers rows from user searches (not the SEED searches), deduped per provider
  - Ivan's scrape cache: per-insurer provider lists (NPI registry) + public-profile verdicts

Real providers (from the national NPI registry, not an insurer's directory) and demo providers
(fictional seed data, source_url on example.com) are always counted separately.

Per group:
  providers      unique providers seen
  checked        real: public profile checked or called; demo: ghost-flagged or called
  unavailable    ghost (profile says not accepting / confirmed on a call)
  called         got a call result (available / past deadline / no answer / confirmed ghost)
  past_deadline  call result past the legal deadline
"""
import re
from datetime import datetime, timezone

from app import db
from app.config import FAKE_MODE

ZIPS = ["92122", "92037", "92101", "92103", "92173", "91932"]
SEED_PREFIX = "https://example.com/"
CALLED = {"available", "violation", "no_answer"}


def _zip(address: str | None) -> str:
    z = re.findall(r"\b\d{5}\b", address or "")
    return z[-1] if z else ""


def _blank() -> dict:
    return {"providers": 0, "checked": 0, "unavailable": 0, "called": 0, "past_deadline": 0}


def _add(bucket: dict, rec: dict) -> None:
    bucket["providers"] += 1
    bucket["checked"] += rec["checked"]
    bucket["unavailable"] += rec["ghost"]
    bucket["called"] += rec["called"]
    bucket["past_deadline"] += rec["past"]


def _pct(b: dict) -> dict:
    return {**b,
            "unavailable_pct": round(100 * b["unavailable"] / b["checked"]) if b["checked"] else None,
            "past_deadline_pct": round(100 * b["past_deadline"] / b["called"]) if b["called"] else None}


def ghost_stats() -> dict:
    out = {"fake_mode": FAKE_MODE, "generated_at": datetime.now(timezone.utc).isoformat(), "zips": ZIPS,
           "by_insurer": [], "by_zip": []}
    if FAKE_MODE:
        return out  # no Neon in fake mode; the page explains

    from scraper import cache  # Ivan's cache API (read-only use)

    verdicts = cache.profile_verdicts()
    people: dict[tuple, dict] = {}   # (insurer_lower, kind, name_lower, zip) -> record
    display: dict[str, str] = {}     # insurer_lower -> display name

    def rec_for(insurer: str, name: str, address: str | None, source_url: str | None) -> dict:
        kind = "demo" if (source_url or "").startswith(SEED_PREFIX) else "real"
        key = (insurer.strip().lower(), kind, name.strip().lower(), _zip(address))
        if key not in people:
            people[key] = {"kind": kind, "zip": key[3], "name": name, "address": address,
                           "checked": 0, "ghost": 0, "called": 0, "past": 0}
        return people[key]

    with db.connect() as c:
        rows = c.execute(
            "SELECT s.insurer, p.name, p.address, p.source_url, p.ghost_status, p.ghost_reason, p.violation, "
            "p.call_transcript FROM providers p JOIN searches s ON s.id = p.search_id WHERE s.insurer <> 'SEED'"
        ).fetchall()
    for r in rows:
        display.setdefault(r["insurer"].strip().lower(), r["insurer"].strip())
        rec = rec_for(r["insurer"], r["name"], r["address"], r["source_url"])
        called = r["ghost_status"] in CALLED or (r["ghost_status"] == "ghost" and bool(r["call_transcript"]))
        rec["called"] |= int(called)
        rec["ghost"] |= int(r["ghost_status"] == "ghost")
        rec["past"] |= int(bool(r["violation"]))
        rec["checked"] |= int(called or r["ghost_status"] == "ghost")

    # Registry providers Ivan's scraper listed for each insurer search (cached), even if not shown in a search.
    for key, _source, payload in cache.all_provider_entries():
        insurer_l = key.split(":", 1)[1].split("|")[0]
        display.setdefault(insurer_l, insurer_l.title())
        for p in payload or []:
            rec_for(insurer_l, p.get("name", ""), p.get("address"), p.get("source_url"))

    # Public-profile verdicts (real providers only).
    for rec in people.values():
        if rec["kind"] != "real":
            continue
        v = verdicts.get(cache.profile_key(rec["name"], rec["address"])) or {}
        if v.get("verdict") in ("ghost", "ok"):
            rec["checked"] = 1
        if v.get("verdict") == "ghost":
            rec["ghost"] = 1

    by_insurer: dict[str, dict] = {}
    by_zip = {z: {"real": _blank(), "demo": _blank()} for z in ZIPS}
    seen_zip: set[tuple] = set()
    for (insurer_l, kind, name_l, z), rec in people.items():
        b = by_insurer.setdefault(insurer_l, {"real": _blank(), "demo": _blank()})
        _add(b[kind], rec)
        if z in by_zip and (kind, name_l, z) not in seen_zip:  # one provider counts once per zip
            seen_zip.add((kind, name_l, z))
            _add(by_zip[z][kind], rec)

    out["by_insurer"] = sorted(
        ({"insurer": display.get(k, k), "real": _pct(v["real"]), "demo": _pct(v["demo"])} for k, v in by_insurer.items()),
        key=lambda x: -(x["real"]["providers"] + x["demo"]["providers"]))
    out["by_zip"] = [{"zip": z, "real": _pct(v["real"]), "demo": _pct(v["demo"])} for z, v in by_zip.items()]
    return out
