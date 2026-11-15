"""All HTTP endpoints from docs/API.md. Owner: Aryan."""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse

from app import store
from app.config import FAKE_MODE
from app import demo, records
from app.models import (DateCorrection, DemoSettings, ErrorReport, DemoSettingsUpdate, Provider, SearchCreate, SearchCreated, SearchDetail,
                        VerifyRequest, VerifyResponse)
from packet.render import render_packet

router = APIRouter(prefix="/api")


@router.get("/health")
def health():
    return {"ok": True, "fake_mode": FAKE_MODE}


def _demo_settings() -> DemoSettings:
    import os

    from calls.agent import real_calls_enabled
    from scraper.web import brightdata_configured
    return DemoSettings(fake_mode=FAKE_MODE, force_fallback=demo.force_fallback(), real_calls=real_calls_enabled(),
                        gemini=bool(os.getenv("GEMINI_API_KEY")), brightdata=brightdata_configured())


@router.get("/demo", response_model=DemoSettings)
def get_demo():
    return _demo_settings()


@router.post("/demo", response_model=DemoSettings)
def set_demo(body: DemoSettingsUpdate):
    demo.set_force_fallback(body.force_fallback)
    return _demo_settings()


@router.get("/stats/ghosts")
def stats_ghosts():
    """Ghost Map data: {by_insurer, by_zip}, real (registry) and demo (seed) providers counted separately."""
    from app.pipeline import with_timeout
    from app.stats import ghost_stats
    return with_timeout(ghost_stats, 15, lambda: {"error_fallback": True, "by_insurer": [], "by_zip": []})


@router.post("/search", response_model=SearchCreated)
def create_search(req: SearchCreate):
    return SearchCreated(search_id=store.create_search(req))


@router.get("/search/{search_id}", response_model=SearchDetail)
def get_search(search_id: str):
    detail = store.get(search_id)
    if not detail:
        raise HTTPException(404, "search not found")
    return records.annotate(detail)


@router.post("/search/{search_id}/verify", response_model=VerifyResponse)
def verify(search_id: str, body: VerifyRequest):
    if not store.get(search_id):
        raise HTTPException(404, "search not found")
    try:
        ids = store.verify(search_id, body.provider_ids)
    except ValueError as e:
        raise HTTPException(400, str(e))
    records.record_authorization(search_id, len(ids))  # authorization record for the packet
    return VerifyResponse(started=len(ids), provider_ids=ids)


@router.post("/search/{search_id}/providers/{provider_id}/date", response_model=Provider)
def correct_date(search_id: str, provider_id: str, body: DateCorrection):
    """Human check: the patient corrects an extracted date; the rules engine re-runs on it."""
    try:
        return records.correct_date(search_id, provider_id, body.date)
    except LookupError as e:
        raise HTTPException(404, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.delete("/search/{search_id}")
def delete_search(search_id: str):
    """Privacy: delete this search, its provider rows, transcripts and app records."""
    if not records.delete_search(search_id):
        raise HTTPException(404, "search not found")
    return {"ok": True, "deleted": search_id}


@router.post("/search/{search_id}/providers/{provider_id}/report")
def report_error(search_id: str, provider_id: str, body: ErrorReport):
    """'Report an error' on a provider row (e.g. the provider correcting their status). Stored; row shows 'under review'."""
    try:
        records.report_error(search_id, provider_id, body.what.strip(), (body.contact or "").strip() or None)
    except LookupError as e:
        raise HTTPException(404, str(e))
    return {"ok": True}


@router.post("/webhooks/call-complete")
async def call_complete(request: Request):
    # TODO(Hardik): verify ElevenLabs HMAC signature header before trusting the payload.
    try:
        payload = await request.json()
    except Exception:
        return {"ok": False, "error": "invalid json"}
    try:
        return store.call_complete(payload)
    except Exception as e:  # never 5xx back to ElevenLabs
        return {"ok": False, "error": str(e)}


@router.get("/search/{search_id}/packet", response_class=HTMLResponse)
def packet(search_id: str, lang: str = "en"):
    if not store.get(search_id):
        raise HTTPException(404, "search not found")
    return HTMLResponse(render_packet(search_id, lang=lang))
