# API

Base URL: `http://localhost:8000` (frontend reads `NEXT_PUBLIC_API_URL`). All bodies are JSON.
Row shapes are defined in [DATA_CONTRACT.md](DATA_CONTRACT.md).

## Errors
Every error (4xx/5xx, including validation) returns:
```json
{ "error": "human readable message" }
```
Common: `404 {"error": "search not found"}`, `422 {"error": "body.zip: String should have at least 5 characters"}`.

## Polling
After `POST /api/search`, the frontend polls `GET /api/search/{id}` **every 2s until `search.status == "done"`**.
Polling is cheap (no external calls happen inside GET). In FAKE_MODE a full run takes ~20s.

---

### `GET /api/health`
```json
{ "ok": true, "fake_mode": true }
```

### `POST /api/search`
Request:
```json
{
  "insurer": "Blue Shield of California",
  "plan_type": "hmo",
  "zip": "92103",
  "specialty": "therapist",
  "appointment_type": "new",
  "prior_appointment_date": null
}
```
`prior_appointment_date` (optional, `YYYY-MM-DD` or null): send only for `follow_up`. For therapist follow-ups
the 10-business-day deadline counts from this date; if omitted it counts from the request date.

Response `200`:
```json
{ "search_id": "0d5e9b8a-0000-4000-8000-00000000aaaa" }
```
Starts step 2 (scrape + ghost check) in the background. `status` starts at `scraping`.

### `GET /api/search/{id}`
Response `200`:
```json
{
  "search": {
    "id": "0d5e9b8a-...", "insurer": "Blue Shield of California", "plan_type": "hmo",
    "zip": "92103", "specialty": "therapist", "appointment_type": "new",
    "prior_appointment_date": null, "created_at": "2026-11-14T22:04:50Z", "status": "verifying"
  },
  "providers": [
    { "id": "6f1c...", "search_id": "0d5e...", "name": "Dr. Juniper Fakewell, LMFT", "specialty": "therapist",
      "phone": "+16195550101", "address": "...", "source_url": "...", "ghost_status": "ghost",
      "ghost_reason": "...", "earliest_date": null, "business_days_wait": null, "deadline_days": null,
      "violation": false, "call_transcript": null, "checked_at": "2026-11-14T22:05:00Z" }
  ]
}
```
`providers` is `[]` while early in `scraping`. Ghost flags appear before `verifying`.

### `POST /api/search/{id}/verify`
User has given permission to call. Starts AI calls for the given providers (should be non-ghost).
Request:
```json
{ "provider_ids": ["6f1c...0002", "6f1c...0004"] }
```
Response `200`:
```json
{ "started": 2, "provider_ids": ["6f1c...0002", "6f1c...0004"] }
```
Errors: `404` unknown search, `400 {"error": "provider_ids not in this search: [...]"}`.
Each called row moves `unverified → calling → available | violation | no_answer`.

FAKE_MODE note: by default (`FAKE_AUTO_VERIFY=false`) the simulation waits for this endpoint — the user's
consent click. Set `FAKE_AUTO_VERIFY=true` to auto-start calls on all `unverified` providers ~10s after the
search is created (handy for curl-only runs).

### `POST /api/webhooks/call-complete`
Called by ElevenLabs post-call webhook (not by the frontend). We pass `search_id` and `provider_id` as
dynamic variables when starting the call; they come back in the payload:
```json
{
  "type": "post_call_transcription",
  "data": {
    "conversation_id": "conv_123",
    "transcript": [
      {"role": "agent", "message": "Hi, I'm an AI assistant calling on behalf of a patient..."},
      {"role": "user", "message": "Our earliest new patient opening is December 23rd."}
    ],
    "conversation_initiation_client_data": {
      "dynamic_variables": { "search_id": "0d5e...", "provider_id": "6f1c...0004" }
    }
  }
}
```
Response `200`:
```json
{ "ok": true, "provider_id": "6f1c...0004", "ghost_status": "violation" }
```
If ids can't be resolved: `200 {"ok": false, "error": "unknown provider"}` (never 5xx back to ElevenLabs).

### `GET /api/search/{id}/packet`
Response `200`, `Content-Type: text/html` — printable page (browser Print → PDF) with the evidence call
log, letter to insurer, member-services script, DMHC complaint info, and the "not legal advice" notice.
