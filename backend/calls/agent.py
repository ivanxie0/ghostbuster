"""Step 3: AI voice calls (ElevenLabs Conversational AI + Twilio). Owner: Hardik.

Contract: start_verification(search_id, provider_ids) -> dict[provider_id, status]
  - Kicks off calls and returns immediately. Results arrive later at POST /api/webhooks/call-complete,
    which calls calls.webhook.handle_call_complete(payload).
  - Pass search_id + provider_id as dynamic_variables so they come back in the webhook payload.

HONESTY / SAFETY (non-negotiable):
  - ONLY dial numbers in TEAMMATE_PHONE_1/2/3 (is_allowed_number). Never a real provider.
  - Agent's first sentence: it is an AI assistant calling on behalf of a patient.
"""
import os
import threading
import time
from datetime import date, timedelta

from app.config import FAKE_ENDING, TEAMMATE_PHONES
from app.models import Provider, Search

AGENT_FIRST_MESSAGE = (
    "Hi, I'm an AI assistant calling on behalf of a patient. I'm trying to find the earliest "
    "new-patient appointment with {provider_name} for someone with {insurer} {plan_type}. "
    "Do you have any openings?"
)


def is_allowed_number(phone: str | None) -> bool:
    return bool(phone) and phone in TEAMMATE_PHONES


def start_verification(search_id: str, provider_ids: list[str]) -> dict[str, str]:
    """Start one outbound AI call per provider.

    TODO(Hardik): real call when ELEVENLABS_API_KEY + ELEVENLABS_AGENT_ID are set:
      POST https://api.elevenlabs.io/v1/convai/twilio/outbound-call
        {agent_id, agent_phone_number_id: ELEVENLABS_PHONE_NUMBER_ID, to_number,
         conversation_initiation_client_data: {dynamic_variables: {search_id, provider_id, provider_name, insurer, plan_type}}}
      with httpx timeout ~10s. Skip (status "blocked") if not is_allowed_number(phone).
    Stub: simulates each call in a background thread and feeds a fake post-call payload to the glue,
    so real mode (Neon) works end to end today.
    """
    from app import store  # lazy: avoid import cycle

    detail = store.get(search_id)
    if not detail:
        return {}
    search = detail.search
    by_id = {p.id: p for p in detail.providers}
    status: dict[str, str] = {}
    real = bool(os.getenv("ELEVENLABS_API_KEY") and os.getenv("ELEVENLABS_AGENT_ID"))
    for i, pid in enumerate(provider_ids):
        p = by_id[pid]
        if real and is_allowed_number(p.phone):
            status[pid] = "calling"  # TODO(Hardik): place real call here
            continue
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
    first = AGENT_FIRST_MESSAGE.format(provider_name=provider.name, insurer=search.insurer,
                                       plan_type=search.plan_type.upper().replace("_", "-"))
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
