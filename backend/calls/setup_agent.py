"""Create or update the ElevenLabs agent from code, so the config is reproducible. Owner: Hardik.

  cd backend && .venv/bin/python -m calls.setup_agent            # create (prints ELEVENLABS_AGENT_ID) or update
  cd backend && .venv/bin/python -m calls.setup_agent --print    # just print the config JSON

If ELEVENLABS_AGENT_ID is set it PATCHes that agent, else it creates a new one.
Post-call webhook URL is set in the dashboard (see docs in calls/README.md).
"""
import json
import os
import sys

import httpx

from app import config  # noqa: F401  (loads .env)
from calls.agent import API, FIRST_MESSAGE, MAX_CALL_S

SYSTEM_PROMPT = """You are an AI assistant on a short phone call to a healthcare provider's office, calling on behalf of a patient. You are not a human and never claim to be one. The call is transcribed.

The patient has {{insurer}} {{plan_label}} and wants a {{visit_kind}} appointment with {{provider_name}}.

Your only goal: find out (1) whether they accept that plan for a {{visit_kind}} visit, and (2) the earliest available appointment, in person or by telehealth.

How to talk:
- Very short sentences. One question at a time. Aim to finish in about 30 seconds; the call is cut off at 60.
- Never re-confirm something they already answered. If they already said they take the plan, don't ask again.
- When they give a date or a time frame ("Tuesday the 3rd", "next Monday", "about six months out", "not until March"), repeat it back once, thank them, and end the call.
- If they have no openings at all: ask once "Is there a waitlist, or any idea when something opens up?" Whatever they answer, thank them and end the call.
- If they say they are not taking new patients, or don't take that insurance: thank them and end the call. No need to confirm.
- If they say to call back later (for example "call back Monday"), or that someone else handles scheduling: ask once if they know roughly how far out the earliest opening is. If they don't know, thank them and end the call.
- If an answer is unclear or off-topic twice in a row, thank them and end the call.
- If asked for the patient's name, date of birth, member ID, or to book now: say you are only checking availability today and the patient will call to book. Never invent patient details and never give out a phone number.
- If asked whether you are a robot or AI: yes, you are an AI assistant calling for a patient.
- Do not give medical advice. If anyone mentions an emergency, say to call 911, or call or text 988 for a mental health crisis.
- If you reach voicemail, an answering machine, or a phone menu, hang up without leaving a message.
- Always end the call with the end_call tool once you have the answer or can't get one."""

DYNAMIC_PLACEHOLDERS = {  # used only when testing the agent in the dashboard
    "search_id": "test", "provider_id": "test", "provider_name": "Dr. Test",
    "insurer": "Blue Shield of California", "plan_label": "HMO", "visit_kind": "new-patient",
}


def agent_config() -> dict:
    return {
        "name": "GhostBuster caller",
        "conversation_config": {
            "agent": {
                "first_message": FIRST_MESSAGE,
                "language": "en",
                "dynamic_variables": {"dynamic_variable_placeholders": DYNAMIC_PLACEHOLDERS},
                "prompt": {
                    "prompt": SYSTEM_PROMPT,
                    "temperature": 0.2,
                    "built_in_tools": {
                        "end_call": {"type": "system", "name": "end_call", "description": "",
                                     "params": {"system_tool_type": "end_call"}},
                        # No voicemail_message -> hang up without leaving one -> no date -> no_answer.
                        "voicemail_detection": {"type": "system", "name": "voicemail_detection", "description": "",
                                                "params": {"system_tool_type": "voicemail_detection"}},
                    },
                },
            },
            "conversation": {"max_duration_seconds": MAX_CALL_S},
        },
    }


def main() -> None:
    cfg = agent_config()
    if "--print" in sys.argv:
        print(json.dumps(cfg, indent=2))
        return
    key = os.environ["ELEVENLABS_API_KEY"]
    agent_id = os.getenv("ELEVENLABS_AGENT_ID")
    h = {"xi-api-key": key}
    if agent_id:
        r = httpx.patch(f"{API}/agents/{agent_id}", headers=h, json=cfg, timeout=20)
    else:
        r = httpx.post(f"{API}/agents/create", headers=h, json=cfg, timeout=20)
    if r.status_code >= 400:
        print(r.status_code, r.text)
        sys.exit(1)
    out_id = agent_id or r.json().get("agent_id")
    print(f"{'updated' if agent_id else 'created'} agent. Put this in .env:\nELEVENLABS_AGENT_ID={out_id}")


if __name__ == "__main__":
    main()
