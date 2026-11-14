"""FAKE_MODE backend: in-memory, zero keys, simulates a full run in ~20s. Owner: Aryan.

Uses the real stub modules (scraper, rules, calls) so the contract is exercised end to end.
Timeline (seconds since POST /api/search):
  0-3   status=scraping, providers=[]
  3-6   status=scraping, providers listed (all unverified)
  6-8   status=scraping, ghost flags applied
  8+    status=verifying; targets go unverified -> calling -> result; calls start at /verify time (or t=10 if FAKE_AUTO_VERIFY), one resolves every 2s
  done  when every called provider has a result (~20s for the therapist demo)
"""
import time
import uuid
from datetime import datetime, timezone

from app.config import FAKE_AUTO_VERIFY
from app.models import Provider, Search, SearchCreate, SearchDetail
from calls import agent, webhook
from rules.deadlines import check_violation
from scraper.ghosts import run_ghost_check
from scraper.providers import get_providers

T_LISTED, T_GHOSTS, T_VERIFYING, T_AUTO_VERIFY, CALL_SPACING = 3, 6, 8, 10, 2

_S: dict[str, dict] = {}


def create_search(req: SearchCreate) -> str:
    sid = str(uuid.uuid4())
    listed = get_providers(req.insurer, req.zip, req.specialty)
    for p in listed:
        p.id, p.search_id = str(uuid.uuid4()), sid
        p.checked_at = datetime.now(timezone.utc)
    flagged = run_ghost_check([p.model_copy() for p in listed])
    _S[sid] = {
        "search": Search(id=sid, created_at=datetime.now(timezone.utc), status="scraping", **req.model_dump()),
        "t0": time.time(), "listed": listed, "flagged": flagged,
        "verify_at": None, "targets": [], "results": {},
    }
    return sid


def _ids(s: dict) -> set[str]:
    return {p.id for p in s["flagged"]}


def verify(search_id: str, provider_ids: list[str]) -> list[str]:
    s = _S[search_id]
    bad = [i for i in provider_ids if i not in _ids(s)]
    if bad:
        raise ValueError(f"provider_ids not in this search: {bad}")
    if s["verify_at"] is None:
        s["verify_at"], s["targets"] = time.time(), list(provider_ids)
    return provider_ids


def _resolve(s: dict, p: Provider, index: int) -> Provider:
    if p.id not in s["results"]:
        payload = agent.simulate_call(p, s["search"], index)
        result = webhook.handle_call_complete(payload)
        upd = p.model_copy(update={
            "earliest_date": result.earliest_date if result else None,
            "call_transcript": result.transcript if result else None,
            "checked_at": datetime.now(timezone.utc),
        })
        s["results"][p.id] = check_violation(upd, s["search"])
    return s["results"][p.id]


def get(search_id: str) -> SearchDetail | None:
    s = _S.get(search_id)
    if not s:
        return None
    now = time.time()
    t = now - s["t0"]
    if FAKE_AUTO_VERIFY and s["verify_at"] is None and t >= T_AUTO_VERIFY:
        s["verify_at"] = s["t0"] + T_AUTO_VERIFY
        s["targets"] = [p.id for p in s["flagged"] if p.ghost_status == "unverified"]

    search = s["search"]
    if t < T_LISTED:
        return SearchDetail(search=search.model_copy(update={"status": "scraping"}), providers=[])
    if t < T_GHOSTS:
        return SearchDetail(search=search.model_copy(update={"status": "scraping"}), providers=s["listed"])
    if t < T_VERIFYING:
        return SearchDetail(search=search.model_copy(update={"status": "scraping"}), providers=s["flagged"])

    out, pending = [], 0
    for p in s["flagged"]:
        if p.id in s["targets"]:
            i = s["targets"].index(p.id)
            if now >= s["verify_at"] + CALL_SPACING * (i + 1):
                p = _resolve(s, p, i)
            else:
                pending += 1
                p = p.model_copy(update={"ghost_status": "calling", "ghost_reason": None})
        out.append(p)
    done = s["verify_at"] is not None and pending == 0
    return SearchDetail(search=search.model_copy(update={"status": "done" if done else "verifying"}), providers=out)


def call_complete(payload: dict) -> dict:
    """Real webhooks in FAKE_MODE: apply the result to the in-memory search if ids match."""
    result = webhook.handle_call_complete(payload)
    if not result or result.search_id not in _S:
        return {"ok": False, "error": "unknown provider"}
    s = _S[result.search_id]
    p = next((x for x in s["flagged"] if x.id == result.provider_id), None)
    if not p:
        return {"ok": False, "error": "unknown provider"}
    upd = p.model_copy(update={"earliest_date": result.earliest_date, "call_transcript": result.transcript})
    s["results"][p.id] = check_violation(upd, s["search"])
    return {"ok": True, "provider_id": p.id, "ghost_status": s["results"][p.id].ghost_status}
