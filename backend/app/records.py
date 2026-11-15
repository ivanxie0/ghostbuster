"""Per-search records the app keeps beside the contract tables (consent time, ...). Owner: Aryan.
FAKE_MODE: in memory. Real mode: Neon (db/schema.sql). Never raises into a request: a failed write is logged."""
from datetime import datetime, timezone

from app.config import FAKE_MODE
from app.models import SearchDetail

_auth: dict[str, datetime] = {}


def record_authorization(search_id: str, provider_count: int) -> None:
    """The patient's consent click (POST /verify). The first one is kept."""
    try:
        if FAKE_MODE:
            _auth.setdefault(search_id, datetime.now(timezone.utc))
        else:
            from app import db
            db.insert_authorization(search_id, provider_count)
    except Exception as e:
        print(f"[records] authorization not saved: {e!r}")


def authorized_at(search_id: str) -> datetime | None:
    try:
        if FAKE_MODE:
            return _auth.get(search_id)
        from app import db
        return db.get_authorization(search_id)
    except Exception as e:
        print(f"[records] authorization lookup failed: {e!r}")
        return None


def annotate(detail: SearchDetail) -> SearchDetail:
    """Add the app records to a search response (optional fields)."""
    return detail.model_copy(update={"authorized_at": authorized_at(detail.search.id)})
