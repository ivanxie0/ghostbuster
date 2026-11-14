"""Real-mode glue (FAKE_MODE=false): Neon + real modules, every external step wrapped in a timeout
with a seed fallback so the demo never hangs. Owner: Aryan."""
import threading
import traceback
from concurrent.futures import ThreadPoolExecutor
from datetime import date

from app import db
from app.models import CALL_IN_PROGRESS, SearchCreate, SearchDetail
from calls import agent, webhook
from rules.deadlines import check_violation
from scraper.ghosts import run_ghost_check
from scraper.providers import get_providers, load_seed_providers

_pool = ThreadPoolExecutor(max_workers=16)

SCRAPE_TIMEOUT_S = 25
GHOST_TIMEOUT_S = 20
CALL_START_TIMEOUT_S = 10
EXTRACT_TIMEOUT_S = 20


def with_timeout(fn, seconds: float, fallback, *args, **kwargs):
    """Run fn(*args, **kwargs) with a timeout. On timeout/exception return fallback()
    (if callable) or fallback. Use this around EVERY external call."""
    fut = _pool.submit(fn, *args, **kwargs)
    try:
        return fut.result(timeout=seconds)
    except Exception as e:  # includes TimeoutError
        print(f"[with_timeout] {getattr(fn, '__name__', fn)} failed/timed out: {e!r} -> fallback")
        return fallback() if callable(fallback) else fallback


def create_search(req: SearchCreate) -> str:
    sid = db.insert_search(req)
    threading.Thread(target=_run_scrape, args=(sid, req), daemon=True).start()
    return sid


def _run_scrape(sid: str, req: SearchCreate) -> None:
    try:
        listed = with_timeout(get_providers, SCRAPE_TIMEOUT_S, lambda: load_seed_providers(req.specialty),
                              req.insurer, req.zip, req.specialty)
        flagged = with_timeout(run_ghost_check, GHOST_TIMEOUT_S, listed, listed)
        db.insert_providers(sid, flagged)
    except Exception:
        traceback.print_exc()
    finally:
        db.set_status(sid, "verifying")


def get(search_id: str) -> SearchDetail | None:
    search = db.get_search(search_id)
    if not search:
        return None
    return SearchDetail(search=search, providers=db.get_providers(search_id))


def verify(search_id: str, provider_ids: list[str]) -> list[str]:
    providers = {p.id: p for p in db.get_providers(search_id)}
    bad = [i for i in provider_ids if i not in providers]
    if bad:
        raise ValueError(f"provider_ids not in this search: {bad}")
    for pid in provider_ids:
        db.update_provider(providers[pid].model_copy(update={"ghost_reason": CALL_IN_PROGRESS}))
    with_timeout(agent.start_verification, CALL_START_TIMEOUT_S, None, search_id, provider_ids)
    return provider_ids


def call_complete(payload: dict) -> dict:
    result = with_timeout(webhook.handle_call_complete, EXTRACT_TIMEOUT_S, None, payload)
    if not result:
        return {"ok": False, "error": "unknown provider"}
    p = db.get_provider(result.provider_id)
    search = db.get_search(result.search_id)
    if not p or not search:
        return {"ok": False, "error": "unknown provider"}
    upd = check_violation(
        p.model_copy(update={"earliest_date": result.earliest_date, "call_transcript": result.transcript}),
        search, asked_on=date.today(),
    )
    db.update_provider(upd)
    _maybe_finish(result.search_id)
    return {"ok": True, "provider_id": upd.id, "ghost_status": upd.ghost_status}


def _maybe_finish(search_id: str) -> None:
    if not any(p.ghost_reason == CALL_IN_PROGRESS for p in db.get_providers(search_id)):
        db.set_status(search_id, "done")
