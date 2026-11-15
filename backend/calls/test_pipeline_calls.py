"""Real-call safety in app.pipeline (live 3-phone test bug, search 25aacb52): a slow call start must never
trigger simulation, a late real webhook wins over a watchdog result, and uncalled real offices never get a
call-result. In-memory DB, no network, Gemini off."""
import time
from datetime import datetime, timezone

import pytest

from app import demo, pipeline
from app.models import Provider, Search
from calls import agent

TEAM = "+15550000001"


class FakeDB:
    def __init__(self, search, providers):
        self.search, self.p, self.status = search, {p.id: p for p in providers}, None

    def get_providers(self, sid): return list(self.p.values())
    def get_provider(self, pid): return self.p.get(pid)
    def get_search(self, sid): return self.search
    def update_provider(self, p): self.p[p.id] = p
    def set_status(self, sid, st): self.status = st


@pytest.fixture
def world(monkeypatch, request):
    sid = f"s-{request.node.name}"
    search = Search(id=sid, insurer="Blue Shield of California", plan_type="hmo", zip="92103", specialty="therapist",
                    appointment_type="new", created_at=datetime(2026, 11, 14, 22, tzinfo=timezone.utc),
                    status="verifying")
    team = Provider(id="team", search_id=sid, name="Elena Marsh, LCSW", specialty="therapist", phone=TEAM,
                    source_url="https://example.com/directory/elena-marsh")
    real = Provider(id="real", search_id=sid, name="Elizabeth Bisarya, LMFT", specialty="therapist",
                    phone="+16195551234", source_url="https://npiregistry.cms.hhs.gov/provider-view/1")
    db = FakeDB(search, [team, real])
    monkeypatch.setattr(pipeline, "db", db)
    monkeypatch.setattr(agent, "TEAMMATE_PHONES", [TEAM])
    monkeypatch.setattr(agent, "real_calls_enabled", lambda: True)
    monkeypatch.setattr(demo, "force_fallback", lambda: False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.setattr(pipeline, "_simulate_calls", lambda *a: pytest.fail("simulated calls while live"))
    return sid, db


def _real_payload(sid, pid, office_says, conv="conv_real_1"):
    return {"type": "post_call_transcription", "data": {
        "conversation_id": conv,
        "metadata": {"start_time_unix_secs": datetime(2026, 11, 14, 22, tzinfo=timezone.utc).timestamp()},
        "transcript": [{"role": "agent", "message": "Hi, I'm an AI assistant calling on behalf of a patient."},
                       {"role": "user", "message": office_says}],
        "conversation_initiation_client_data": {"dynamic_variables": {"search_id": sid, "provider_id": pid}}}}


def _wait(cond, t=3.0):
    end = time.time() + t
    while not cond() and time.time() < end:
        time.sleep(0.02)
    return cond()


def test_slow_call_start_never_simulates(world, monkeypatch):
    sid, db = world
    monkeypatch.setattr(pipeline, "CALL_START_TIMEOUT_S", 0.1)
    monkeypatch.setattr(agent, "CALL_TIMEOUT_S", 0.3)
    monkeypatch.setattr(agent, "start_verification", lambda *a: time.sleep(1) or {"team": "calling"})
    pipeline.verify(sid, ["team", "real"])
    assert db.p["team"].ghost_status == "calling"          # waiting for the real webhook, not simulated
    assert any("no simulation" in e["detail"] for e in demo.events(sid))
    assert not any("simulated" in e["detail"] and "no simulation" not in e["detail"] for e in demo.events(sid))
    # backup watchdog: no webhook -> no answer (never a made-up date)
    assert _wait(lambda: db.p["team"].ghost_status == "no_answer")
    assert db.p["team"].earliest_date is None


def test_real_webhook_after_slow_start_is_applied(world, monkeypatch):
    sid, db = world
    monkeypatch.setattr(pipeline, "CALL_START_TIMEOUT_S", 0.1)
    monkeypatch.setattr(agent, "CALL_TIMEOUT_S", 5)
    monkeypatch.setattr(agent, "start_verification", lambda *a: time.sleep(1) or {"team": "calling"})
    pipeline.verify(sid, ["team"])
    out = pipeline.call_complete(_real_payload(sid, "team", "Honestly we're about three months out."))
    assert out["ghost_status"] == "violation" and db.p["team"].earliest_date.month == 2
    assert "three months" in db.p["team"].call_transcript


def test_late_real_webhook_overwrites_resolved_row(world):
    sid, db = world
    db.p["team"] = db.p["team"].model_copy(update={"ghost_status": "calling"})
    pipeline.call_complete(agent.no_answer_payload(sid, "team", "(no answer / no result within 90 seconds)"))
    assert db.p["team"].ghost_status == "no_answer"
    pipeline.call_complete(_real_payload(sid, "team", "Sorry, we don’t take that plan."))
    assert db.p["team"].ghost_status == "ghost"
    assert db.p["team"].ghost_reason.startswith("Confirmed on call:")
    assert any(e["detail"] == "Elena Marsh, LCSW: updated from real call" for e in demo.events(sid))


def test_watchdog_or_simulation_never_overwrites_a_real_result(world):
    sid, db = world
    db.p["team"] = db.p["team"].model_copy(update={"ghost_status": "calling"})
    pipeline.call_complete(_real_payload(sid, "team", "Our earliest is December 23rd."))
    assert db.p["team"].ghost_status == "violation"
    pipeline.call_complete(agent.no_answer_payload(sid, "team", "(no answer / no result within 90 seconds)"))
    sim = agent.simulate_call(db.p["team"], db.search, 0)
    pipeline.call_complete(sim)
    assert db.p["team"].ghost_status == "violation" and "December 23rd" in db.p["team"].call_transcript


def test_uncalled_real_office_gets_no_call_result(world, monkeypatch):
    sid, db = world
    seen = []
    monkeypatch.setattr(agent, "start_verification", lambda s, ids: seen.extend(ids) or {i: "calling" for i in ids})
    started = pipeline.verify(sid, ["team", "real"])
    assert started == ["team"] and seen == ["team"]           # the real office is never sent to the dialer
    r = db.p["real"]
    assert r.ghost_status == "unverified" and r.ghost_reason == pipeline.LIVE_NOT_CALLED_REASON
    assert r.call_transcript is None and r.earliest_date is None
    # a stray watchdog payload for it is ignored, so no "no answer" line can appear
    pipeline.call_complete(agent.no_answer_payload(sid, "real", "(no answer)"))
    assert db.p["real"].ghost_status == "unverified"


def test_live_start_verification_does_not_resolve_blocked_numbers(monkeypatch):
    """agent.start_verification never turns an undialed number into a call result."""
    from app import store
    s = Search(id="sb", insurer="X", plan_type="hmo", zip="92103", specialty="therapist", appointment_type="new",
               created_at=datetime.now(timezone.utc), status="verifying")
    p = Provider(id="p", search_id="sb", name="Real Office", specialty="therapist", phone="+16195551234",
                 ghost_status="calling")
    from app.models import SearchDetail
    monkeypatch.setattr(store, "get", lambda sid: SearchDetail(search=s, providers=[p]))
    monkeypatch.setattr(store, "call_complete", lambda payload: pytest.fail("blocked number got a call result"))
    monkeypatch.setattr(agent, "TEAMMATE_PHONES", [TEAM])
    monkeypatch.setattr(agent, "real_calls_enabled", lambda: True)
    assert agent.start_verification("sb", ["p"]) == {"p": "blocked"}


def test_simulated_transcript_is_labeled():
    s = Search(id="s", insurer="X", plan_type="hmo", zip="92103", specialty="therapist", appointment_type="new",
               created_at=datetime.now(timezone.utc), status="verifying")
    p = Provider(id="p1", search_id="s", name="T", specialty="therapist")
    payload = agent.simulate_call(p, s, 0)
    assert payload["data"]["transcript"][0]["message"] == agent.SIMULATED_NOTE
    assert not agent.is_real_call_payload(payload)
