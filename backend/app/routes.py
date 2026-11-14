"""All HTTP endpoints from docs/API.md. Owner: Aryan."""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse

from app import store
from app.config import FAKE_MODE
from app.models import SearchCreate, SearchCreated, SearchDetail, VerifyRequest, VerifyResponse
from packet.render import render_packet

router = APIRouter(prefix="/api")


@router.get("/health")
def health():
    return {"ok": True, "fake_mode": FAKE_MODE}


@router.post("/search", response_model=SearchCreated)
def create_search(req: SearchCreate):
    return SearchCreated(search_id=store.create_search(req))


@router.get("/search/{search_id}", response_model=SearchDetail)
def get_search(search_id: str):
    detail = store.get(search_id)
    if not detail:
        raise HTTPException(404, "search not found")
    return detail


@router.post("/search/{search_id}/verify", response_model=VerifyResponse)
def verify(search_id: str, body: VerifyRequest):
    if not store.get(search_id):
        raise HTTPException(404, "search not found")
    try:
        ids = store.verify(search_id, body.provider_ids)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return VerifyResponse(started=len(ids), provider_ids=ids)


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
def packet(search_id: str):
    if not store.get(search_id):
        raise HTTPException(404, "search not found")
    return HTMLResponse(render_packet(search_id))
