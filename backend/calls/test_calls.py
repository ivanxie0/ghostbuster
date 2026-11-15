"""Calls safety + no-hang tests. No network: place_call / store are monkeypatched."""
import time
from datetime import datetime, timezone

import pytest

from app import store
from app.models import Provider, Search, SearchDetail
from calls import agent, webhook

TEAM = "+15550000001"


def _detail(phone):
    s = Search(id="s1", insurer="Blue Shield of California", plan_type="hmo", zip="92103",
               specialty="therapist", appointment_type="new", created_at=datetime.now(timezone.utc),
               status="verifying")
    p = Provider(id="p1", search_id="s1", name="Dr. T", specialty="therapist", phone=phone, ghost_status="calling")
    return SearchDetail(search=s, providers=[p])


@pytest.fixture
def env(monkeypatch):
    for k in ("ELEVENLABS_API_KEY", "ELEVENLABS_AGENT_ID", "ELEVENLABS_PHONE_NUMBER_ID"):
        monkeypatch.setenv(k, "x")
    monkeypatch.setattr(agent, "TEAMMATE_PHONES", [TEAM])
    got = []
    monkeypatch.setattr(store, "call_complete", lambda payload: got.append(webhook.handle_call_complete(payload)))
    return got


def _wait(got, n=1, t=2.0):
    end = time.time() + t
    while len(got) < n and time.time() < end:
        time.sleep(0.01)


def test_place_call_refuses_non_teammate(env):
    with pytest.raises(PermissionError):
        agent.place_call("+16195550105", {})


def test_non_teammate_resolves_no_answer_without_dialing(env, monkeypatch):
    monkeypatch.setattr(store, "get", lambda sid: _detail("+16195550105"))
    monkeypatch.setattr(agent, "place_call", lambda *a: pytest.fail("must not dial"))
    assert agent.start_verification("s1", ["p1"]) == {"p1": "blocked"}
    assert env[0].earliest_date is None and "not called" in env[0].transcript


def test_api_failure_resolves_no_answer(env, monkeypatch):
    monkeypatch.setattr(store, "get", lambda sid: _detail(TEAM))
    def boom(*a): raise RuntimeError("401")
    monkeypatch.setattr(agent, "place_call", boom)
    agent.start_verification("s1", ["p1"])
    _wait(env)
    assert env and env[0].provider_id == "p1" and env[0].earliest_date is None


def test_watchdog_marks_no_answer(env, monkeypatch):
    monkeypatch.setattr(store, "get", lambda sid: _detail(TEAM))  # stays "calling" forever
    monkeypatch.setattr(agent, "place_call", lambda *a: "conv_x")
    monkeypatch.setattr(agent, "CALL_TIMEOUT_S", 0.05)
    agent.start_verification("s1", ["p1"])
    _wait(env)
    assert env and "no result within" in env[0].transcript
    assert agent.CONVERSATIONS["conv_x"] == ("s1", "p1")


def test_initiation_failure_resolved_via_conversation_map(monkeypatch):
    monkeypatch.setitem(agent.CONVERSATIONS, "conv_busy", ("s1", "p1"))
    r = webhook.handle_call_complete({"type": "call_initiation_failure",
                                      "data": {"conversation_id": "conv_busy", "failure_reason": "busy"}})
    assert r.provider_id == "p1" and r.earliest_date is None and "busy" in r.transcript


def test_audio_payload_ignored():
    assert webhook.handle_call_complete({"type": "post_call_audio", "data": {"conversation_id": "c"}}) is None


def test_first_message_discloses_ai_first():
    msg = agent.fill(agent.FIRST_MESSAGE, agent.call_vars(_detail(TEAM).providers[0], _detail(TEAM).search))
    assert msg.startswith("Hi, I'm an AI assistant calling on behalf of a patient")
    assert "{{" not in msg and "Blue Shield of California HMO" in msg
