"""Demo controls + per-search fallback log. Owner: Aryan.

- force_fallback: when on, the real pipeline skips every live stage (scrape, ghost check, calls, Gemini)
  and uses cached/seed data instead. Toggled from the frontend demo panel (Shift+D) via /api/demo.
- Fallback log: which stage fell back for which search, shown in the results activity log.
In memory only: resets when the backend restarts (searches themselves persist in Neon).
"""
import threading
from datetime import datetime, timezone

_lock = threading.Lock()
_force_fallback = False
_events: dict[str, list[dict]] = {}


def force_fallback() -> bool:
    return _force_fallback


def set_force_fallback(on: bool) -> None:
    global _force_fallback
    _force_fallback = bool(on)
    print(f"[demo] force_fallback={_force_fallback}")


def log(search_id: str | None, stage: str, detail: str) -> None:
    print(f"[fallback] search={search_id} stage={stage}: {detail}")
    if not search_id:
        return
    with _lock:
        _events.setdefault(search_id, []).append(
            {"stage": stage, "detail": detail, "at": datetime.now(timezone.utc)})


def events(search_id: str) -> list[dict]:
    with _lock:
        return list(_events.get(search_id, []))
