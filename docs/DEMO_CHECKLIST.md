# Demo checklist (before judging)

Judging: Sunday 12:30–2:30 PM at our table. **All four of us must be at the table, or the score is zero.**
Code freeze: no commits after Sunday 12:00 PM PT. Script and Q&A: `docs/DEMO.md`.

## 30 minutes before

### 1. Code and keys (Aryan's laptop)
- [ ] `git pull` on main. Do not commit anything after 12:00 PM.
- [ ] `.env` has `FAKE_MODE=false`, `DATABASE_URL`, Gemini, Bright Data, ElevenLabs and `TEAMMATE_PHONE_1/2/3`
      (1 = Hardik, 2 = Aryan, 3 = Ivan). Never show `.env` on screen.

### 2. Start everything (three terminals, keep all running)
```bash
make dev-backend
```
```bash
make dev-frontend
```
```bash
make tunnel
```
- [ ] `make tunnel` prints `https://math-marbling-headroom.ngrok-free.dev/api/webhooks/call-complete`.
      That is the URL in the ElevenLabs agent's post-call webhook (Hardik confirms it hasn't changed).
- [ ] If the backend was started before the tunnel's first run, restart it once.

### 3. Shift+D panel checks (open http://localhost:3000, press Shift+D)
- [ ] Backend: **Live · Neon**
- [ ] Real phone calls: **On (teammate phones)**
- [ ] Gemini: **configured** · Bright Data: **configured**
- [ ] **Force fallback: OFF** (check this last, after building the backup tab below)

### 4. Warm-up search
- [ ] Shift+D → **Reset: preset demo search** (Blue Shield of CA · HMO · 92103 · therapist · new). Do **not** press
      consent. Confirm providers load and ghost flags show with "Profile checked" links.
      The first search after a backend restart has once come back without its cached ghosts; the warm-up absorbs that.

### 5. Backup tabs (no phone calls)
- [ ] Shift+D → turn **Force fallback ON** → Reset → press consent. This runs simulated calls on fictional demo
      providers only; no phone rings. Wait for **Ending B** ("No provider we reached could offer a timely appointment").
- [ ] Keep that tab open: **backup Ending B tab**. Open its packet in a second tab: **backup packet tab**
      (English; the Español toggle is on that page).
- [ ] Shift+D → turn **Force fallback OFF** again. Confirm the panel says OFF.
- [ ] Optional: keep the real-call Ending A search from Nov 14 open as an **Ending A tab**.

### 6. Phones (Hardik, Aryan, Ivan)
- [ ] Charged (over 50%), ringer **on and loud**, not on silent, Do Not Disturb / Focus **off**.
- [ ] Remember: with live calling on, pressing consent dials **all three** demo offices (Hardik, Aryan, Ivan).
      Hardik hands his ringing phone to the judge; the other two answer quietly as receptionists or decline.
- [ ] Judge card printed or on a second phone (text in `docs/DEMO.md`).

### 7. The demo laptop
- [ ] Notifications off (macOS Focus → Do Not Disturb), Slack/Discord/Messages closed.
- [ ] Browser on `/`, zoomed so text reads from 3 feet; all other tabs closed except the backup tabs.
- [ ] Charger plugged in; Wi-Fi connected (Neon, ElevenLabs and ngrok all need it).
- [ ] Screen recording of a full run ready to play (last-resort backup).

## During the demo
- Fallback rule, no discussion: **if no phone rings within 10 seconds of pressing consent, Aryan switches to
  the backup Ending B tab** and Jai says "Here's one we ran a few minutes ago."
- Backend down or the laptop freezes → play the screen recording.
- If a judge's answer is vague, let the agent finish; the row ends as "No answer". Don't talk over the call.

## After each judge
- [ ] Shift+D → Reset for a fresh search (force fallback stays OFF).
- [ ] Phones back on the table, still loud.
