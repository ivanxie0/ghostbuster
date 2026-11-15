# Real call fixtures

`real_call_2026-11-14.json` is the first real GhostBuster call: agent → Hardik's phone, Sat 2026-11-14, 60 s, cut off at max duration.
Hardik played the receptionist ("I have that plan … I don't have any [appointments]") and then went off-topic.

- **Source:** `GET /v1/convai/conversations/{id}` wrapped in the post-call webhook envelope
  (`{"type": "post_call_transcription", "event_timestamp": …, "data": <conversation>}`). The webhook wasn't attached
  yet for this call; ElevenLabs documents the webhook `data` as the same conversation fields.
- **Redacted:** real phone numbers → `+1555000000x`, Twilio call SID and ElevenLabs user/initiator ids → `REDACTED`.
- Dynamic variables are from `calls.dial_test` (`search_id`/`provider_id` = `dial-test`), so the app answers "unknown provider".
- Agent lines contain TTS tags like `[happy]`; `webhook.transcript_to_text` strips them from agent lines only.

Replay against a running backend:
`curl -s -X POST localhost:8000/api/webhooks/call-complete -H 'Content-Type: application/json' -d @backend/calls/fixtures/real_call_2026-11-14.json`

`real_webhook_2026-11-14.json` is the first **captured webhook delivery** (the real post-call payload ElevenLabs POSTed
through ngrok to `/api/webhooks/call-complete`, Sat 2026-11-14 19:11 PT, 35 s call to Aryan's phone). Captured by Aryan
from the ngrok inspector.
- Office said "I have the earliest for tomorrow at 8:00 p.m."; Gemini (and the regex fallback) → 2026-11-15, app result `available`.
- **Redacted:** the one real phone number → `+15550000001`; call/stream SIDs, user ids, caller/called numbers → `REDACTED`.
  Scanned for API keys / tokens: none present.
- `search_id` / `provider_id` are real ids from that run (Neon), so a replay updates that row again.
