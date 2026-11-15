"""Per-search records the app keeps beside the contract tables (consent time, ...). Owner: Aryan.
FAKE_MODE: in memory. Real mode: Neon (db/schema.sql). Never raises into a request: a failed write is logged."""
from datetime import date, datetime, timezone

from app.config import FAKE_MODE
from app.models import Provider, SearchDetail

_auth: dict[str, datetime] = {}
_corrections: dict[str, set[str]] = {}  # fake mode: search_id -> provider ids with a patient-confirmed date
_reports: dict[str, list[dict]] = {}   # fake mode: search_id -> error reports


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


def correct_date(search_id: str, provider_id: str, new_date: date) -> Provider:
    """Patient corrects an extracted date: re-run the rules engine on it and save. The transcript is not changed.
    Raises LookupError (unknown search/provider) or ValueError (row has no call result to correct)."""
    from app import store
    from rules.deadlines import check_violation

    detail = store.get(search_id)
    if not detail:
        raise LookupError("search not found")
    p = next((x for x in detail.providers if x.id == provider_id), None)
    if not p:
        raise LookupError("provider not in this search")
    if p.earliest_date is None and p.ghost_status not in ("available", "violation", "no_answer"):
        raise ValueError("this provider has no call result to correct")
    updated = check_violation(p.model_copy(update={"earliest_date": new_date}), detail.search)
    if FAKE_MODE:
        from app import fake
        fake._S[search_id]["results"][provider_id] = updated
        _corrections.setdefault(search_id, set()).add(provider_id)
    else:
        from app import db
        db.update_provider(updated)
        db.upsert_date_correction(provider_id, search_id, p.earliest_date, new_date)
    return updated


def patient_confirmed(search_id: str) -> list[str]:
    try:
        if FAKE_MODE:
            return sorted(_corrections.get(search_id, set()))
        from app import db
        return db.get_date_corrections(search_id)
    except Exception as e:
        print(f"[records] corrections lookup failed: {e!r}")
        return []


def report_error(search_id: str, provider_id: str, what: str, contact: str | None) -> None:
    """Anyone (e.g. the provider) reports that a row is wrong. The row then shows 'under review'."""
    from app import store
    detail = store.get(search_id)
    if not detail:
        raise LookupError("search not found")
    if not any(p.id == provider_id for p in detail.providers):
        raise LookupError("provider not in this search")
    if FAKE_MODE:
        _reports.setdefault(search_id, []).append({"provider_id": provider_id, "what": what, "contact": contact})
    else:
        from app import db
        db.insert_error_report(provider_id, search_id, what, contact)


def under_review(search_id: str) -> list[str]:
    try:
        if FAKE_MODE:
            return sorted({r["provider_id"] for r in _reports.get(search_id, [])})
        from app import db
        return db.get_reported_providers(search_id)
    except Exception as e:
        print(f"[records] reports lookup failed: {e!r}")
        return []


def delete_search(search_id: str) -> bool:
    """Privacy: delete the search, its provider rows for that search, transcripts and every app record."""
    from app import demo
    for d in (_auth, _corrections, _reports):
        d.pop(search_id, None)
    with demo._lock:
        demo._events.pop(search_id, None)
    if FAKE_MODE:
        from app import fake
        return fake._S.pop(search_id, None) is not None
    from app import db
    return db.delete_search(search_id)


def annotate(detail: SearchDetail) -> SearchDetail:
    """Add the app records to a search response (optional fields)."""
    sid = detail.search.id
    return detail.model_copy(update={"authorized_at": authorized_at(sid), "patient_confirmed": patient_confirmed(sid),
                                     "under_review": under_review(sid)})
