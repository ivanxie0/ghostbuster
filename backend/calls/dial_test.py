"""Place ONE real test call to a teammate phone, no DB or frontend needed. Owner: Hardik.

  cd backend && .venv/bin/python -m calls.dial_test 1          # calls TEAMMATE_PHONE_1
  cd backend && .venv/bin/python -m calls.dial_test 2 --plan medi_cal

The webhook will say "unknown provider" for this test call (ids are fake); that's expected.
Read the transcript in the ElevenLabs dashboard (Agents -> Call history) or the backend log.
"""
import sys

from app.config import TEAMMATE_PHONES
from calls.agent import PLAN_LABEL, place_call, real_calls_enabled


def main() -> None:
    if not real_calls_enabled():
        sys.exit("Set ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID, ELEVENLABS_PHONE_NUMBER_ID in .env first")
    n = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 1
    plan = sys.argv[sys.argv.index("--plan") + 1] if "--plan" in sys.argv else "hmo"
    if n > len(TEAMMATE_PHONES):
        sys.exit(f"TEAMMATE_PHONE_{n} is not set")
    conv = place_call(TEAMMATE_PHONES[n - 1], {
        "search_id": "dial-test", "provider_id": "dial-test", "provider_name": "Dr. Test",
        "insurer": "Blue Shield of California", "plan_label": PLAN_LABEL[plan], "visit_kind": "new-patient",
    })
    print(f"calling TEAMMATE_PHONE_{n} ... conversation_id={conv}")


if __name__ == "__main__":
    main()
