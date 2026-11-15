"""Step 3: AI voice calls (ElevenLabs Agents + Twilio outbound). Owner: Hardik.

Contract: start_verification(search_id, provider_ids) -> dict[provider_id, status]
  - Kicks off calls and returns immediately. Results arrive later at POST /api/webhooks/call-complete,
    which calls calls.webhook.handle_call_complete(payload).
  - search_id + provider_id go in dynamic_variables so they come back in the post-call webhook.
  - Every called provider is GUARANTEED to resolve: API failure / blocked number -> no_answer right away;
    no webhook within CALL_TIMEOUT_S -> no_answer (watchdog). The UI never hangs on "calling".

HONESTY / SAFETY (non-negotiable):
  - ONLY dial numbers in TEAMMATE_PHONE_1/2/3 (is_allowed_number). Never a real provider.
  - First sentence: it is an AI assistant calling on behalf of a patient, and the call is transcribed.

Agent config (prompt, tools, 60s cap) lives in calls/setup_agent.py — run it to create/update the agent.
Real calls happen when ELEVENLABS_API_KEY + ELEVENLABS_AGENT_ID + ELEVENLABS_PHONE_NUMBER_ID are set.
"""
import os
import threading
import time
from datetime import date, timedelta

import httpx

from app.config import FAKE_ENDING, TEAMMATE_PHONES
from app.models import Provider, Search

API = "https://api.elevenlabs.io/v1/convai"
CALL_TIMEOUT_S = 90      # task 4: no result after this -> no_answer
RINGING_TIMEOUT_S = 20   # + ~10s Twilio trial preamble + 55s max conversation < 90s
MAX_CALL_S = 55

# conversation_id -> (search_id, provider_id). call_initiation_failure webhooks carry no dynamic
# variables, so webhook.py resolves them through this map (same process).
CONVERSATIONS: dict[str, tuple[str, str]] = {}

# ElevenLabs {{var}} syntax; filled from dynamic_variables (see call_vars). Discloses AI + transcription first.
FIRST_MESSAGE = (
    "Hi, I'm an AI assistant calling on behalf of a patient, and this call is being transcribed. "
    "I'm checking availability with {{provider_name}} for a patient with {{insurer}} {{plan_label}}. "
    "Do you take that plan, and what's the earliest {{visit_kind}} appointment you have, in person or by telehealth?"
)

PLAN_LABEL = {"hmo": "HMO", "ppo": "PPO", "medi_cal": "Medi-Cal", "unknown": "insurance"}
VISIT_KIND = {"new": "new-patient", "follow_up": "follow-up", "urgent": "urgent"}


def is_allowed_number(phone: str | None) -> bool:
    return bool(phone) and phone in TEAMMATE_PHONES


def real_calls_enabled() -> bool:
    return all(os.getenv(k) for k in ("ELEVENLABS_API_KEY", "ELEVENLABS_AGENT_ID", "ELEVENLABS_PHONE_NUMBER_ID"))


def call_vars(provider: Provider, search: Search) -> dict[str, str]:
    return {
        "search_id": provider.search_id or search.id,
        "provider_id": provider.id,
        "provider_name": provider.name,
        "insurer": search.insurer,
        "plan_label": PLAN_LABEL.get(search.plan_type, "insurance"),
        "visit_kind": VISIT_KIND.get(search.appointment_type, "new-patient"),
    }


def fill(template: str, v: dict) -> str:
    for k, val in v.items():
        template = template.replace("{{" + k + "}}", str(val))
    return template


def place_call(to_number: str, dynamic_variables: dict) -> str | None:
    """POST /v1/convai/twilio/outbound-call. Returns conversation_id. Raises on failure.
    Refuses (raises) any number not in TEAMMATE_PHONE_* — the last line of defense."""
    if not is_allowed_number(to_number):
        raise PermissionError("refusing to dial a number outside TEAMMATE_PHONE_*")
    r = httpx.post(
        f"{API}/twilio/outbound-call",
        headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"]},
        json={
            "agent_id": os.environ["ELEVENLABS_AGENT_ID"],
            "agent_phone_number_id": os.environ["ELEVENLABS_PHONE_NUMBER_ID"],
            "to_number": to_number,
            "conversation_initiation_client_data": {"dynamic_variables": dynamic_variables},
            "telephony_call_config": {"ringing_timeout_secs": RINGING_TIMEOUT_S},
        },
        timeout=10,
    )
    r.raise_for_status()
    body = r.json()
    if not body.get("success"):
        raise RuntimeError(body.get("message") or "outbound-call returned success=false")
    return body.get("conversation_id")


def _no_answer_payload(search_id: str, provider_id: str, note: str) -> dict:
    """Same shape as a real post-call webhook, with no date -> rules mark it no_answer."""
    return {
        "type": "post_call_transcription",
        "data": {
            "conversation_id": None,
            "transcript": [{"role": "agent", "message": note}],
            "conversation_initiation_client_data": {
                "dynamic_variables": {"search_id": search_id, "provider_id": provider_id},
            },
        },
    }


def _still_calling(search_id: str, provider_id: str) -> bool:
    from app import store
    detail = store.get(search_id)
    return bool(detail) and any(p.id == provider_id and p.ghost_status == "calling" for p in detail.providers)


def _call_one(provider: Provider, search: Search) -> None:
    from app import store
    v = call_vars(provider, search)
    try:
        conv_id = place_call(provider.phone, v)
        if conv_id:
            CONVERSATIONS[conv_id] = (v["search_id"], provider.id)
        print(f"[calls] dialing {provider.name} conv={conv_id}")
    except Exception as e:
        print(f"[calls] call to {provider.name} failed to start: {e!r} -> no_answer")
        store.call_complete(_no_answer_payload(v["search_id"], provider.id, f"(call could not be placed: {e})"))
        return
    time.sleep(CALL_TIMEOUT_S)  # watchdog
    if _still_calling(v["search_id"], provider.id):
        print(f"[calls] no result for {provider.name} after {CALL_TIMEOUT_S}s -> no_answer")
        store.call_complete(_no_answer_payload(
            v["search_id"], provider.id, f"(no answer / no result within {CALL_TIMEOUT_S} seconds)"))


def start_verification(search_id: str, provider_ids: list[str]) -> dict[str, str]:
    """Start one outbound AI call per provider (in background threads). Returns immediately.

    Real mode (ElevenLabs env set): teammate numbers get a real call; any other number is NOT dialed and
    resolves as no_answer with an honest note (we never fabricate a transcript for a real provider).
    Without ElevenLabs env: simulated calls, so FAKE_MODE=false + Neon still works end to end.
    """
    from app import store  # lazy: avoid import cycle

    detail = store.get(search_id)
    if not detail:
        return {}
    search = detail.search
    by_id = {p.id: p for p in detail.providers}
    status: dict[str, str] = {}
    real = real_calls_enabled()
    for i, pid in enumerate(provider_ids):
        p = by_id[pid]
        if real and is_allowed_number(p.phone):
            status[pid] = "calling"
            threading.Thread(target=_call_one, args=(p, search), daemon=True).start()
        elif real:
            status[pid] = "blocked"
            store.call_complete(_no_answer_payload(
                search_id, pid, "(not called: this hackathon build only dials the team's verified test phones)"))
        else:
            status[pid] = "simulated"

            def run(p=p, i=i):
                time.sleep(3 * (i + 1))
                store.call_complete(simulate_call(p, search, i))

            threading.Thread(target=run, daemon=True).start()
    return status


# --- simulation (FAKE_MODE + stub) ------------------------------------------------------------
# Calendar days out for the earliest opening; None = no answer. Ending B: nobody in time.
_OUTCOMES_B = [30, 45, None, 24, 38, 33]
_OUTCOMES_A = [4, 45, None, 24, 38, 33]


def simulate_call(provider: Provider, search: Search, index: int) -> dict:
    """Return a fake ElevenLabs post-call webhook payload (same shape as the real one, see docs/API.md)."""
    outcomes = _OUTCOMES_A if FAKE_ENDING == "A" else _OUTCOMES_B
    days = outcomes[index % len(outcomes)]
    first = fill(FIRST_MESSAGE, call_vars(provider, search))
    if days is None:
        transcript = [{"role": "agent", "message": "(no answer — voicemail box full)"}]
    else:
        d = date.today() + timedelta(days=days)
        transcript = [
            {"role": "agent", "message": first},
            {"role": "user", "message": f"Let me check... our earliest new-patient opening is {d:%A, %B} {d.day}."},
            {"role": "agent", "message": f"Thank you. Just to confirm, that's {d:%B} {d.day} for a new patient with that plan?"},
            {"role": "user", "message": "Yes, that's the earliest we have."},
        ]
    return {
        "type": "post_call_transcription",
        "data": {
            "conversation_id": f"sim_{provider.id[:8]}",
            "transcript": transcript,
            "conversation_initiation_client_data": {
                "dynamic_variables": {"search_id": provider.search_id, "provider_id": provider.id},
            },
        },
    }
