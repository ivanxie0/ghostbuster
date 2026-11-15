# calls/ — real AI calls (Hardik)

Real calls run only when `FAKE_MODE=false` (Neon) **and** all three `ELEVENLABS_*` vars are set.
Otherwise calls are simulated. FAKE_MODE never dials.

Safety: `place_call` refuses any number not in `TEAMMATE_PHONE_1/2/3`. In real mode, a provider with any other
number is **not dialed** and resolves as `no_answer` ("not called: ... only dials the team's test phones").

No-hang: API error → `no_answer` immediately. Busy / no-answer → `call_initiation_failure` webhook → `no_answer`.
Voicemail → agent hangs up, no date → `no_answer`. Nothing back after 90 s → watchdog → `no_answer`.

## One-time setup (≈20 min)

### 1. Twilio (trial)
1. Sign up at twilio.com, then go to **Phone Numbers → Manage → Buy a number**. Pick a US number with **Voice**. The trial credit covers it.
2. **Phone Numbers → Manage → Verified Caller IDs → Add**: verify each teammate phone (SMS code). A trial account can only call these.
3. Copy the **Account SID** and **Auth Token** from the Console home page.
4. Heads-up: on a trial account, whoever answers first hears *"You have a trial account…"* and must **press any key** before the agent speaks. Tell the judge, or upgrade the account (~$20) to remove the message. The code still only dials teammate phones either way.

### 2. ElevenLabs
1. Go to **API key → Developers → API Keys → Create**. Give it access to *ElevenLabs Agents* (write) → `ELEVENLABS_API_KEY`.
2. **Agents → Phone Numbers → Import number → Twilio**: enter the Twilio number, Account SID and Auth Token.
   Copy the phone number id (`phnum_…`) → `ELEVENLABS_PHONE_NUMBER_ID`.
3. Create the agent from code (prompt, end_call + voicemail_detection tools, 55 s cap):
   `cd backend && .venv/bin/python -m calls.setup_agent` → copy the printed `ELEVENLABS_AGENT_ID` into `.env`.
   Re-run it after any prompt change; it updates the same agent.
4. **Agents → Settings → Post-call webhook → Create webhook**:
   URL `https://<your-ngrok>.ngrok-free.app/api/webhooks/call-complete`, auth = HMAC (save the secret somewhere;
   we don't verify it yet). Enable the **transcript** and **call initiation failure** events.
   Make sure the agent uses the workspace webhook (default).

### 3. ngrok
1. Sign up at ngrok.com (free). Install it: `sudo snap install ngrok`, or download the Linux zip from the
   dashboard and put `ngrok` on your PATH. Then run `ngrok config add-authtoken <token from dashboard>`.
2. Start the backend (`make dev-backend`), then in another terminal run `ngrok http 8000`.
3. Put the https URL in `PUBLIC_BASE_URL` and in the ElevenLabs webhook URL above.
   Free URLs change on restart, so update the webhook URL whenever ngrok restarts.
4. Check the tunnel without a real call:
   ```
   curl -s -X POST $PUBLIC_BASE_URL/api/webhooks/call-complete -H 'Content-Type: application/json' \
     -d '{"type":"post_call_transcription","data":{"transcript":[{"role":"user","message":"next Tuesday"}]}}'
   ```
   The expected response is `{"ok":false,"error":"unknown provider"}`, which means the tunnel reached our code.

### 3b. Gemini
Get a key from aistudio.google.com → **Get API key** and set `GEMINI_API_KEY`. The default model is `gemini-3.5-flash-lite`;
override it with `GEMINI_MODEL` if needed. Check it: `cd backend && .venv/bin/python -m calls.webhook "Office: we're about six months out"`.
You should see `earliest_date` about six months from today. If Gemini errors, the log says `regex fallback` and calls still resolve.

### 4. `.env` (repo root, never committed)
```
ELEVENLABS_API_KEY=...
ELEVENLABS_AGENT_ID=...
ELEVENLABS_PHONE_NUMBER_ID=phnum_...
TWILIO_ACCOUNT_SID=...        # only used when importing into ElevenLabs
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
TEAMMATE_PHONE_1=+1...        # E.164, exactly as verified in Twilio
TEAMMATE_PHONE_2=+1...
TEAMMATE_PHONE_3=+1...
PUBLIC_BASE_URL=https://....ngrok-free.app
```

## Test
- One call, no DB needed: `cd backend && .venv/bin/python -m calls.dial_test 1`. Your phone rings.
  The webhook will log `unknown provider` because the ids are fake. Read the transcript in the dashboard.
- Full path: `FAKE_MODE=false` + Neon seeded → search → Verify → the teammate phones ring → rows flip.
- `make test` covers the allowlist, blocked numbers, API failure, watchdog and failure webhooks (no network).
