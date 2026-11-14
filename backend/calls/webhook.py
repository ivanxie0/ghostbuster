"""Step 3b: parse the ElevenLabs post-call webhook + extract the earliest date. Owner: Hardik.

Contract: handle_call_complete(payload) -> CallResult | None
  - Pure: parses + extracts; does NOT touch the DB. The glue (app.pipeline / app.fake) applies
    rules.check_violation and saves the row.
  - Returns None if the payload can't be tied to a search/provider.
"""
import re
from dataclasses import dataclass
from datetime import date

MONTHS = {m: i + 1 for i, m in enumerate(
    ["january", "february", "march", "april", "may", "june", "july", "august",
     "september", "october", "november", "december"])}


@dataclass
class CallResult:
    search_id: str
    provider_id: str
    transcript: str
    earliest_date: date | None


def transcript_to_text(turns: list[dict]) -> str:
    who = {"agent": "Agent", "user": "Office"}
    return "\n".join(f"{who.get(t.get('role'), t.get('role'))}: {t.get('message') or ''}" for t in turns or [])


def extract_earliest_date(transcript: str, today: date | None = None) -> date | None:
    """Earliest appointment date mentioned by the office.

    TODO(Hardik): Gemini (GEMINI_API_KEY) with a strict JSON prompt -> {"earliest_date": "YYYY-MM-DD" | null},
    timeout ~10s; fall back to this regex on failure. Handle "next Tuesday", "in 3 weeks", "no openings".
    Stub: finds "<Month> <day>" in office lines; rolls to next year if already past.
    """
    today = today or date.today()
    office = "\n".join(l for l in transcript.splitlines() if l.startswith("Office:"))
    m = re.search(r"\b(" + "|".join(MONTHS) + r")\s+(\d{1,2})\b", office, re.IGNORECASE)
    if not m:
        return None
    d = date(today.year, MONTHS[m.group(1).lower()], int(m.group(2)))
    return d if d >= today else date(today.year + 1, d.month, d.day)


def handle_call_complete(payload: dict) -> CallResult | None:
    data = (payload or {}).get("data") or {}
    dv = ((data.get("conversation_initiation_client_data") or {}).get("dynamic_variables")) or {}
    search_id, provider_id = dv.get("search_id"), dv.get("provider_id")
    if not search_id or not provider_id:
        return None
    text = transcript_to_text(data.get("transcript") or [])
    return CallResult(search_id=search_id, provider_id=provider_id, transcript=text,
                      earliest_date=extract_earliest_date(text))
