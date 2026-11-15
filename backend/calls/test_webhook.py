"""Date extraction (regex fallback path, no network) + webhook parsing. Call date: Sat 2026-11-14."""
from datetime import date, datetime

import pytest

from calls import webhook
from calls.webhook import TZ, add_months, extract, handle_call_complete

SAT = date(2026, 11, 14)


@pytest.fixture(autouse=True)
def no_gemini(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)


def ex(office: str, today=SAT):
    return extract(f"Agent: Hi, I'm an AI assistant calling on behalf of a patient.\nOffice: {office}", today)


@pytest.mark.parametrize("said, expected", [
    ("Our earliest is December 23rd.", date(2026, 12, 23)),
    ("We could do Jan. 5 at 10.", date(2027, 1, 5)),
    ("Earliest is next Tuesday.", date(2026, 11, 17)),
    ("We have an opening Thursday afternoon.", date(2026, 11, 19)),
    ("Honestly we're about six months out.", date(2027, 5, 14)),
    ("Probably 3 weeks.", date(2026, 12, 5)),
    ("We're booking a couple months out right now.", date(2027, 1, 14)),
    ("Tomorrow at 9 works.", date(2026, 11, 15)),
])
def test_dates(said, expected):
    r = ex(said)
    assert r["earliest_date"] == expected and r["accepting"] is True and r["raw_quote"] == said


def test_october_said_in_november_rolls_to_next_year():
    assert ex("First opening is October 2nd.")["earliest_date"] == date(2027, 10, 2)


@pytest.mark.parametrize("said", [
    "Sorry, we're not accepting new patients right now.",
    "We don't take Blue Shield, sorry.",
    "She's not taking any new clients.",
])
def test_not_accepting(said):
    r = ex(said)
    assert r["accepting"] is False and r["earliest_date"] is None


def test_call_back_monday_is_not_a_date():
    r = ex("The scheduler is out, can you call back Monday?")
    assert r["earliest_date"] is None


def test_voicemail_no_office_speech():
    assert extract("Agent: Hi, I'm an AI assistant...\nOffice: ", SAT)["earliest_date"] is None


def test_agent_dates_ignored():
    r = extract("Agent: Do you have anything December 1st?\nOffice: I'll have to check, sorry.", SAT)
    assert r["earliest_date"] is None


def test_add_months_clamps():
    assert add_months(date(2026, 8, 31), 6) == date(2027, 2, 28)


def test_gemini_failure_falls_back_to_regex(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "x")
    def boom(*a): raise TimeoutError()
    monkeypatch.setattr(webhook, "gemini_extract", boom)
    assert ex("Earliest is December 23rd.")["earliest_date"] == date(2026, 12, 23)


def test_gemini_relative_math_done_in_python(monkeypatch):
    class R:
        def raise_for_status(self): pass
        def json(self):
            return {"candidates": [{"content": {"parts": [{"text":
                '{"accepting": true, "earliest_date": "2027-05-01", "relative_amount": 6, '
                '"relative_unit": "month", "raw_quote": "six months out"}'}]}}]}
    monkeypatch.setenv("GEMINI_API_KEY", "x")
    monkeypatch.setattr(webhook.httpx, "post", lambda *a, **k: R())
    r = ex("We're six months out.")
    assert r["earliest_date"] == date(2027, 5, 14) and r["raw_quote"] == "six months out"


def test_webhook_uses_call_date_and_appends_result():
    ts = datetime(2026, 11, 14, 15, 0, tzinfo=TZ).timestamp()
    r = handle_call_complete({"type": "post_call_transcription", "data": {
        "conversation_id": "c1", "metadata": {"start_time_unix_secs": ts},
        "transcript": [{"role": "agent", "message": "Hi, I'm an AI assistant..."},
                       {"role": "user", "message": "We're not accepting new patients."}],
        "conversation_initiation_client_data": {"dynamic_variables": {"search_id": "s", "provider_id": "p"}}}})
    assert r.accepting is False and r.earliest_date is None
    assert r.transcript.endswith('Result: not accepting new patients with this plan ("We\'re not accepting new patients.")')


def test_not_accepting_reason_in_rules():
    from app.models import Provider, Search
    from rules.deadlines import check_violation
    s = Search(id="s", insurer="X", plan_type="hmo", zip="92103", specialty="therapist", appointment_type="new",
               created_at=datetime(2026, 11, 14, 14, tzinfo=TZ), status="verifying")
    p = Provider(name="T", specialty="therapist", call_transcript="Office: no\nResult: not accepting new patients")
    out = check_violation(p, s)
    assert out.ghost_status == "ghost" and out.ghost_reason.startswith("Confirmed on call:")
    assert out.call_transcript  # transcript kept as evidence
    plain = check_violation(Provider(name="T", specialty="therapist", call_transcript="Agent: (voicemail)"), s)
    assert plain.ghost_status == "no_answer"


def test_weekday_plus_date_prefers_date():
    assert ex("Our earliest is Monday, December 14.")["earliest_date"] == date(2026, 12, 14)


def test_fake_mode_transcript_still_parses():
    from calls.agent import simulate_call
    from app.models import Provider, Search
    s = Search(id="s", insurer="X", plan_type="hmo", zip="92103", specialty="therapist", appointment_type="new",
               created_at=datetime.now(TZ), status="verifying")
    for i in range(6):
        p = Provider(id=f"p{i}", search_id="s", name="T", specialty="therapist")
        r = handle_call_complete(simulate_call(p, s, i))
        days = [30, 45, None, 24, 38, 33][i]
        assert (r.earliest_date is None) == (days is None)
        if days:
            assert (r.earliest_date - datetime.now(TZ).date()).days in (days, days - 1, days + 1)


def test_voice_tags_stripped():
    from calls.webhook import transcript_to_text
    t = transcript_to_text([{"role": "agent", "message": "[happy] Great, thank you."},
                            {"role": "user", "message": "We open [sic] Monday"}])
    assert t == "Agent: Great, thank you.\nOffice: We open [sic] Monday"
