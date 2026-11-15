"""Real-mode glue (FAKE_MODE=false): Neon + real modules. Owner: Aryan.

Every live stage runs with its own timeout and falls back to cached/seed data, so the demo never hangs.
Each fallback is logged per search (app.demo) and shown in the results activity log.

  stage            live call                          fallback
  directory        scraper.get_providers              seed providers (db/seed_providers.json)
  ghost check      scraper.run_ghost_check            seed ghost flags
  calls            calls.start_verification           live: NO simulation ever (rows wait for webhooks; 90s watchdog
                                                       -> no answer). Simulated (seed only) only when live calling
                                                       is off or force-fallback is on, and logged as "simulated".
  extraction       calls.webhook.handle_call_complete regex date extraction (no Gemini)

Honesty guard: a real provider (not seed data) is never given a simulated call. If live calling is off,
real providers are left "not checked" with a reason, instead of getting a made-up result.
"""
import json
import threading
import traceback
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout

from app import db, demo
from app.models import Provider, SearchCreate, SearchDetail
from calls import agent, webhook
from rules.deadlines import check_violation
from scraper.ghosts import run_ghost_check
from scraper.providers import SEED_FILE, get_providers, load_seed_providers

_pool = ThreadPoolExecutor(max_workers=16)

SCRAPE_TIMEOUT_S = 10       # Ivan's live sources use ~4s each, cache is instant
GHOST_TIMEOUT_S = 12
CALL_START_TIMEOUT_S = 45   # start_verification spawns one thread per call (parallel); generous for Neon latency
EXTRACT_TIMEOUT_S = 12      # Gemini has its own 8s timeout inside
SIM_CALL_SPACING_S = 3

NOT_CALLED_REASON = "Not called — live calling is off, and we never simulate calls to real offices"
LIVE_NOT_CALLED_REASON = "Not called — this demo only dials the team's test phones, never real offices"


# ---------------------------------------------------------------- timeout helpers

def _attempt(fn, seconds: float, *args, **kwargs) -> tuple[bool, object, str]:
    fut = _pool.submit(fn, *args, **kwargs)
    try:
        return True, fut.result(timeout=seconds), ""
    except FutureTimeout:
        return False, None, f"timed out after {seconds:g}s"
    except Exception as e:
        return False, None, f"{type(e).__name__}: {e}"[:160]


def with_timeout(fn, seconds: float, fallback, *args, **kwargs):
    """Run fn(*args, **kwargs) with a timeout. On timeout/exception return fallback()
    (if callable) or fallback. Use this around EVERY external call."""
    ok, val, why = _attempt(fn, seconds, *args, **kwargs)
    if ok:
        return val
    print(f"[with_timeout] {getattr(fn, '__name__', fn)}: {why} -> fallback")
    return fallback() if callable(fallback) else fallback


def _stage(search_id: str | None, stage: str, fn, seconds: float, fallback, label: str, *args, **kwargs):
    """One pipeline stage: live call with a timeout, else fallback. Logs the fallback for the activity log."""
    if demo.force_fallback():
        demo.log(search_id, stage, f"forced fallback → {label}")
        return fallback()
    ok, val, why = _attempt(fn, seconds, *args, **kwargs)
    if ok:
        return val
    demo.log(search_id, stage, f"{why} → {label}")
    return fallback()


# ---------------------------------------------------------------- fallbacks

def _is_seed(p: Provider) -> bool:
    return (p.source_url or "").startswith("https://example.com/")


def _seed_ghost_flags(providers: list[Provider]) -> list[Provider]:
    seed = {r["name"]: r for r in json.loads(SEED_FILE.read_text())}
    return [p.model_copy(update={"ghost_status": "ghost", "ghost_reason": seed[p.name]["ghost_reason"]})
            if seed.get(p.name, {}).get("ghost_status") == "ghost" else p for p in providers]


def _simulate_calls(search_id: str, provider_ids: list[str]) -> dict[str, str]:
    """Fallback for the calls stage: simulated results for demo (seed) providers only."""
    detail = get(search_id)
    if not detail:
        return {}
    by_id = {p.id: p for p in detail.providers}
    status = {}
    for i, pid in enumerate(provider_ids):
        p = by_id.get(pid)
        if not p:
            continue
        if not _is_seed(p):  # never fabricate a result for a real office
            db.update_provider(p.model_copy(update={"ghost_status": "unverified", "ghost_reason": NOT_CALLED_REASON}))
            status[pid] = "not_called"
            continue
        status[pid] = "simulated"

        def run(p=p, i=i):
            import time
            time.sleep(SIM_CALL_SPACING_S * (i + 1))
            call_complete(agent.simulate_call(p, detail.search, i))

        threading.Thread(target=run, daemon=True).start()
    _maybe_finish(search_id)
    return status


def _ids_from_payload(payload: dict) -> tuple[str | None, str | None]:
    data = (payload or {}).get("data") or {}
    dv = ((data.get("conversation_initiation_client_data") or {}).get("dynamic_variables")) or {}
    return dv.get("search_id"), dv.get("provider_id")


def _regex_call_result(payload: dict):
    """Fallback for the extraction stage: same parse as calls.webhook, but regex only (no Gemini)."""
    payload = payload or {}
    kind = payload.get("type") or "post_call_transcription"
    search_id, provider_id = _ids_from_payload(payload)
    if not search_id or not provider_id or kind not in ("post_call_transcription", "call_initiation_failure"):
        return None
    data = payload.get("data") or {}
    if kind == "call_initiation_failure":
        return webhook.CallResult(search_id=search_id, provider_id=provider_id, earliest_date=None,
                                  transcript=f"(call did not connect: {data.get('failure_reason') or 'unknown'})")
    text = webhook.transcript_to_text(data.get("transcript") or [])
    r = webhook.regex_extract(text, webhook.call_day(data))
    if r.get("accepting") is False:
        r["earliest_date"] = None
    if line := webhook.summary_line(r):
        text = f"{text}\n{line}"
    return webhook.CallResult(search_id=search_id, provider_id=provider_id, transcript=text,
                              earliest_date=r.get("earliest_date"), accepting=r.get("accepting"),
                              raw_quote=r.get("raw_quote"))


# ---------------------------------------------------------------- pipeline

def create_search(req: SearchCreate) -> str:
    sid = db.insert_search(req)
    threading.Thread(target=_run_scrape, args=(sid, req), daemon=True).start()
    return sid


def _run_scrape(sid: str, req: SearchCreate) -> None:
    try:
        listed = _stage(sid, "directory", get_providers, SCRAPE_TIMEOUT_S,
                        lambda: load_seed_providers(req.specialty), "cached demo providers",
                        req.insurer, req.zip, req.specialty)
        flagged = _stage(sid, "ghost check", run_ghost_check, GHOST_TIMEOUT_S,
                         lambda: _seed_ghost_flags(listed), "cached ghost flags", listed)
        db.insert_providers(sid, flagged)
    except Exception:
        traceback.print_exc()
        demo.log(sid, "directory", "pipeline error → no providers saved")
    finally:
        db.set_status(sid, "verifying")


def get(search_id: str) -> SearchDetail | None:
    search = db.get_search(search_id)
    if not search:
        return None
    return SearchDetail(search=search, providers=db.get_providers(search_id), fallbacks=demo.events(search_id))


def verify(search_id: str, provider_ids: list[str]) -> list[str]:
    providers = {p.id: p for p in db.get_providers(search_id)}
    bad = [i for i in provider_ids if i not in providers]
    if bad:
        raise ValueError(f"provider_ids not in this search: {bad}")

    live = agent.real_calls_enabled() and not demo.force_fallback()
    if live:  # only the team's test phones are ever dialed; everyone else stays unverified (no call result)
        to_call = [pid for pid in provider_ids if agent.is_allowed_number(providers[pid].phone)]
        skip_reason = LIVE_NOT_CALLED_REASON
    else:     # simulation is only ever for demo (seed) providers
        to_call = [pid for pid in provider_ids if _is_seed(providers[pid])]
        skip_reason = NOT_CALLED_REASON
    for pid in provider_ids:
        if pid in to_call:
            db.update_provider(providers[pid].model_copy(update={"ghost_status": "calling", "ghost_reason": None}))
        else:  # leave it unchecked, say why
            db.update_provider(providers[pid].model_copy(update={"ghost_reason": skip_reason}))
    if to_call and live:
        _start_real_calls(search_id, to_call, providers)
    elif to_call:
        why = "forced fallback" if demo.force_fallback() else "live calling is off"
        demo.log(search_id, "calls", f"{why} → simulated calls (demo providers only, labeled simulated)")
        _simulate_calls(search_id, to_call)
    _maybe_finish(search_id)
    return to_call


def _start_real_calls(search_id: str, to_call: list[str], providers: dict[str, Provider]) -> None:
    """Real calls. Once any real call may have been placed we NEVER simulate: on a slow/failed start the rows
    stay "calling" and wait for webhooks; a backup watchdog marks anything still calling as no answer."""
    ok, val, why = _attempt(agent.start_verification, CALL_START_TIMEOUT_S, search_id, to_call)
    if ok:
        for pid, st in (val or {}).items():
            if st == "blocked":  # safety net (verify already filters): never dialed -> back to unverified
                db.update_provider(providers[pid].model_copy(
                    update={"ghost_status": "unverified", "ghost_reason": LIVE_NOT_CALLED_REASON}))
        return
    demo.log(search_id, "calls", f"call start {why} → no simulation: waiting for real call results "
                                 f"(no result in {agent.CALL_TIMEOUT_S}s = no answer)")
    threading.Thread(target=_backup_watchdog, args=(search_id, to_call), daemon=True).start()


def _backup_watchdog(search_id: str, provider_ids: list[str], wait_s: float | None = None) -> None:
    import time
    time.sleep(agent.CALL_TIMEOUT_S if wait_s is None else wait_s)
    for p in db.get_providers(search_id):
        if p.id in provider_ids and p.ghost_status == "calling":
            call_complete(agent.no_answer_payload(
                search_id, p.id, f"(no answer / no result within {agent.CALL_TIMEOUT_S} seconds)"))


def call_complete(payload: dict) -> dict:
    sid, _ = _ids_from_payload(payload)
    if demo.force_fallback():
        result = _regex_call_result(payload)
    else:
        result = _stage(sid, "extraction", webhook.handle_call_complete, EXTRACT_TIMEOUT_S,
                        lambda: _regex_call_result(payload), "regex date extraction", payload)
    if not result:
        return {"ok": False, "error": "unknown provider"}
    p = db.get_provider(result.provider_id)
    search = db.get_search(result.search_id)
    if not p or not search:
        return {"ok": False, "error": "unknown provider"}
    if p.ghost_status != "calling":
        # Row already resolved (watchdog, earlier result) or never called. Only a REAL call may change it:
        # a watchdog / simulated payload must never overwrite what an actual call said.
        if not agent.is_real_call_payload(payload):
            return {"ok": True, "provider_id": p.id, "ghost_status": p.ghost_status, "ignored": "already resolved"}
        if p.call_transcript != result.transcript:
            demo.log(result.search_id, "calls", f"{p.name}: updated from real call")
    upd = check_violation(
        p.model_copy(update={"earliest_date": result.earliest_date, "call_transcript": result.transcript}),
        search,
    )
    db.update_provider(upd)
    _maybe_finish(result.search_id)
    return {"ok": True, "provider_id": upd.id, "ghost_status": upd.ghost_status}


def _maybe_finish(search_id: str) -> None:
    if not any(p.ghost_status == "calling" for p in db.get_providers(search_id)):
        db.set_status(search_id, "done")
