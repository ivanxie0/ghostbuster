"""Step 3b: parse the ElevenLabs post-call webhook + extract the earliest date. Owner: Hardik.

Contract: handle_call_complete(payload) -> CallResult | None
  - Pure: parses + extracts; does NOT touch the DB. The glue (app.pipeline / app.fake) applies
    rules.check_violation and saves the row.
  - Returns None if the payload can't be tied to a search/provider.

Extraction: Gemini (GEMINI_API_KEY, 8s timeout) -> {accepting, earliest_date, relative phrase, raw_quote};
relative phrases ("6 months out", "next Tuesday") are resolved in Python against the CALL date (Pacific).
Any Gemini failure -> regex fallback. Self-test: .venv/bin/python -m calls.webhook "Office: ..."
"""
import calendar
import json
import os
import re
import sys
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import httpx

TZ = ZoneInfo("America/Los_Angeles")
GEMINI_TIMEOUT_S = 8

MONTHS = {m: i + 1 for i, m in enumerate(
    ["january", "february", "march", "april", "may", "june", "july", "august",
     "september", "october", "november", "december"])}
MONTH_LOOKUP = {**MONTHS, **{m[:3]: v for m, v in MONTHS.items()}, "sept": 9}
MONTH_RE = "|".join(sorted(MONTH_LOOKUP, key=len, reverse=True))
WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
NUM_WORDS = {"a": 1, "an": 1, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7,
             "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12, "couple": 2, "a couple": 2,
             "a few": 3, "few": 3}


@dataclass
class CallResult:
    search_id: str
    provider_id: str
    transcript: str
    earliest_date: date | None
    accepting: bool | None = None    # False = "not taking new patients" / "don't take that plan"
    raw_quote: str | None = None     # the office's own words the date/answer came from


def transcript_to_text(turns: list[dict]) -> str:
    who = {"agent": "Agent", "user": "Office"}
    return "\n".join(f"{who.get(t.get('role'), t.get('role'))}: {t.get('message') or ''}" for t in turns or [])


def call_day(data: dict) -> date:
    """Date the call happened (Pacific). Relative phrases are resolved against this, not 'now'."""
    ts = (data.get("metadata") or {}).get("start_time_unix_secs")
    if ts:
        return datetime.fromtimestamp(ts, TZ).date()
    return datetime.now(TZ).date()


# --- date helpers ------------------------------------------------------------------------------

def add_months(d: date, n: int) -> date:
    y, m = divmod(d.month - 1 + n, 12)
    y, m = d.year + y, m + 1
    return date(y, m, min(d.day, calendar.monthrange(y, m)[1]))


def add_relative(d: date, amount: float, unit: str) -> date | None:
    unit = (unit or "").lower().rstrip("s")
    if unit == "day":
        return d + timedelta(days=round(amount))
    if unit == "week":
        return d + timedelta(days=round(amount * 7))
    if unit == "month":
        whole = int(amount)
        return add_months(d, whole) + timedelta(days=round((amount - whole) * 30))
    if unit == "year":
        return add_months(d, round(amount * 12))
    return None


def next_weekday(d: date, name: str) -> date:
    """First <weekday> strictly after d ("next Tuesday" said on Saturday -> in 3 days)."""
    delta = (WEEKDAYS.index(name.lower()) - d.weekday()) % 7 or 7
    return d + timedelta(days=delta)


def sane(d: date | None, today: date) -> date | None:
    """Drop impossible dates (in the past, or >2 years out — almost certainly a mis-parse)."""
    if d is None or d < today or d > today + timedelta(days=730):
        return None
    return d


def month_day(month: int, day: int, today: date) -> date | None:
    try:
        d = date(today.year, month, day)
    except ValueError:
        return None
    return d if d >= today else date(today.year + 1, month, day)


# --- Gemini ------------------------------------------------------------------------------------

def gemini_model() -> str:
    return os.getenv("GEMINI_MODEL") or "gemini-3.5-flash-lite"


PROMPT = """You read a phone call transcript between an AI assistant ("Agent") and a healthcare office ("Office").
The agent asked whether the office accepts the patient's insurance plan and for the EARLIEST available appointment.

The call happened on {today} ({weekday}). Calendar for the next 3 weeks: {cal}

Return ONLY a JSON object with these keys:
- "accepting": true if the office will see a new patient with this plan, false if they said they are not taking new
  patients or don't take that insurance, null if unclear.
- "earliest_date": the earliest appointment date the OFFICE offered or estimated, as YYYY-MM-DD, or null.
  Use the calendar for weekday names ("next Tuesday" = the first Tuesday after the call date). If they gave an
  explicit date without a year, pick the next future occurrence.
- "relative_amount" and "relative_unit": if the office gave a duration instead of a date ("about six months out",
  "in 3 weeks", "two months"), the number and one of "day","week","month","year". Otherwise null and null.
- "raw_quote": the office's exact words that the answer came from (short), or null.

Rules: A "call back Monday" or callback time is NOT an appointment date. Dates the AGENT says that the office did not
confirm don't count. Voicemail, no answer, or no date given -> earliest_date null. Never guess.

Transcript:
{transcript}"""


def gemini_extract(transcript: str, today: date) -> dict:
    key = os.environ["GEMINI_API_KEY"]
    cal = ", ".join(f"{(today + timedelta(days=i)):%a %Y-%m-%d}" for i in range(1, 22))
    prompt = PROMPT.format(today=today.isoformat(), weekday=f"{today:%A}", cal=cal, transcript=transcript)
    r = httpx.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{gemini_model()}:generateContent",
        headers={"x-goog-api-key": key},
        json={"contents": [{"role": "user", "parts": [{"text": prompt}]}],
              "generationConfig": {"responseMimeType": "application/json", "temperature": 0}},
        timeout=GEMINI_TIMEOUT_S,
    )
    r.raise_for_status()
    parts = r.json()["candidates"][0]["content"]["parts"]
    text = "".join(p.get("text", "") for p in parts).strip().removeprefix("```json").strip("`\n ")
    out = json.loads(text)
    d = None
    if out.get("relative_amount") and out.get("relative_unit"):  # do the date math ourselves, not the LLM
        d = add_relative(today, float(out["relative_amount"]), out["relative_unit"])
    if d is None and out.get("earliest_date"):
        d = date.fromisoformat(str(out["earliest_date"])[:10])
    acc = out.get("accepting")
    return {"accepting": acc if isinstance(acc, bool) else None, "earliest_date": sane(d, today),
            "raw_quote": out.get("raw_quote") or None}


# --- regex fallback ----------------------------------------------------------------------------

NOT_ACCEPTING = re.compile(
    r"not (?:currently )?(?:accepting|taking|seeing) (?:any )?new|no longer (?:accepting|taking)|"
    r"(?:don't|do not|doesn't|does not|can't|cannot) (?:take|accept)|not in[- ]network|out of network|"
    r"(?:aren't|are not|isn't|is not) (?:accepting|taking)|full(?:y booked)? and not", re.I)
NUM = r"(\d+(?:\.\d+)?|a couple|a few|couple|few|an?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)"
RELATIVE = re.compile(NUM + r"(?:\s+or\s+\w+)?\s+(day|week|month|year)s?\b", re.I)
MONTH_DAY = re.compile(r"\b(" + MONTH_RE + r")\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b", re.I)
WEEKDAY = re.compile(r"\b(?:(next|this|on)\s+)?(" + "|".join(WEEKDAYS) + r")\b", re.I)
CALLBACK = re.compile(r"call (?:us |back|again)|callback|try again", re.I)


def regex_extract(transcript: str, today: date) -> dict:
    lines = [l.split(":", 1)[1].strip() for l in transcript.splitlines() if l.startswith("Office:")]
    accepting, found, quote = None, None, None
    for line in lines:
        if NOT_ACCEPTING.search(line):
            accepting, quote = False, quote or line
        if found:
            continue
        cands = []
        if m := MONTH_DAY.search(line):
            cands.append((m.start(), month_day(MONTH_LOOKUP[m.group(1).lower()], int(m.group(2)), today)))
        if m := RELATIVE.search(line):
            n = m.group(1).lower()
            amt = float(n) if n[0].isdigit() else NUM_WORDS.get(n, 1)
            cands.append((m.start(), add_relative(today, amt, m.group(2))))
        if re.search(r"\btomorrow\b", line, re.I):
            cands.append((re.search(r"\btomorrow\b", line, re.I).start(), today + timedelta(days=1)))
        if not CALLBACK.search(line) and (m := WEEKDAY.search(line)):
            cands.append((m.start(), next_weekday(today, m.group(2))))
        # Priority, not position: explicit date > duration > tomorrow > weekday ("Monday, December 14").
        cands = [d for _, d in cands if sane(d, today)]
        if cands:
            found, quote = cands[0], line
    if found and accepting is None:
        accepting = True
    return {"accepting": accepting, "earliest_date": found, "raw_quote": quote}


def extract(transcript: str, today: date | None = None) -> dict:
    """{accepting, earliest_date, raw_quote} from the office's side of the call. Gemini, else regex."""
    today = today or datetime.now(TZ).date()
    if not any(l.startswith("Office:") and l[7:].strip() for l in transcript.splitlines()):
        return {"accepting": None, "earliest_date": None, "raw_quote": None}  # voicemail / nobody spoke
    if os.getenv("GEMINI_API_KEY"):
        try:
            return gemini_extract(transcript, today)
        except Exception as e:
            print(f"[webhook] Gemini extraction failed: {e!r} -> regex fallback")
    out = regex_extract(transcript, today)
    if out["accepting"] is False:
        out["earliest_date"] = None
    return out


def extract_earliest_date(transcript: str, today: date | None = None) -> date | None:
    return extract(transcript, today)["earliest_date"]


def summary_line(r: dict) -> str | None:
    """One line appended to the stored transcript so the evidence log states what we concluded and why.
    rules.check_violation reads the 'Result: not accepting' line to word ghost_reason."""
    q = f' ("{r["raw_quote"]}")' if r.get("raw_quote") else ""
    if r.get("earliest_date"):
        return f"Result: earliest opening {r['earliest_date']:%a %b %d, %Y}{q}"
    if r.get("accepting") is False:
        return f"Result: not accepting new patients with this plan{q}"
    return None


def handle_call_complete(payload: dict) -> CallResult | None:
    from calls.agent import CONVERSATIONS  # conversation_id -> ids, for payloads without dynamic vars

    payload = payload or {}
    kind = payload.get("type") or "post_call_transcription"
    if kind not in ("post_call_transcription", "call_initiation_failure"):
        return None  # e.g. post_call_audio: ignore
    data = payload.get("data") or {}
    dv = ((data.get("conversation_initiation_client_data") or {}).get("dynamic_variables")) or {}
    search_id, provider_id = dv.get("search_id"), dv.get("provider_id")
    if (not search_id or not provider_id) and data.get("conversation_id") in CONVERSATIONS:
        search_id, provider_id = CONVERSATIONS[data["conversation_id"]]
    if not search_id or not provider_id:
        return None
    if kind == "call_initiation_failure":  # busy / no-answer / failed: no conversation happened
        reason = data.get("failure_reason") or "unknown"
        return CallResult(search_id=search_id, provider_id=provider_id,
                          transcript=f"(call did not connect: {reason})", earliest_date=None)
    text = transcript_to_text(data.get("transcript") or [])
    r = extract(text, call_day(data))
    if line := summary_line(r):
        text = f"{text}\n{line}"
    return CallResult(search_id=search_id, provider_id=provider_id, transcript=text,
                      earliest_date=r["earliest_date"], accepting=r["accepting"], raw_quote=r["raw_quote"])


if __name__ == "__main__":  # quick check of Gemini + key: python -m calls.webhook "Office: about six months out"
    from app import config  # noqa: F401  (loads .env)
    t = " ".join(sys.argv[1:]) or "Agent: Hi, I'm an AI assistant...\nOffice: Earliest is next Tuesday at 3."
    print("gemini key set:", bool(os.getenv("GEMINI_API_KEY")), "| model:", gemini_model())
    print(extract(t.replace("\\n", "\n")))
