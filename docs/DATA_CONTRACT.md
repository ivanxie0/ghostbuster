# Data contract

Source of truth for `db/schema.sql`, `backend/app/models.py`, and `frontend/lib/types.ts`.
**Change all four together, and tell the team first.**

IDs are UUID strings. Dates are ISO `YYYY-MM-DD`; timestamps are ISO 8601 with timezone.

## Enums
| Enum | Values |
|---|---|
| `plan_type` | `hmo`, `ppo`, `medi_cal`, `unknown` |
| `specialty` | `primary_care`, `specialist`, `psychiatrist`, `therapist` |
| `appointment_type` | `new`, `follow_up`, `urgent` |
| `search.status` | `scraping`, `verifying`, `done` |
| `provider.ghost_status` | `ghost`, `unverified`, `calling`, `available`, `violation`, `no_answer` |

`ghost_status` meanings:
- `ghost` — listed by insurer, but not really available. Two ways to get here:
  - **flagged before calling**: public profile/registry shows not accepting / moved / disconnected. Not called, `call_transcript` null.
  - **confirmed on the call**: the office said it isn't taking new patients or doesn't take the plan. `ghost_reason` starts with
    `Confirmed on call:` and `call_transcript` holds the call (it belongs in the packet's call log).
- `unverified` — looks real, not called yet.
- `calling` — AI call in progress (set by `/verify`). Lifecycle: `unverified → calling → available | violation | no_answer | ghost`.
- `available` — called; earliest opening is **within** the legal deadline.
- `violation` — called; earliest opening is **past** the legal deadline.
- `no_answer` — called; no answer / voicemail / no usable date.

## Table `searches`
| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | uuid | no | PK, default `gen_random_uuid()` |
| `insurer` | text | no | free text, e.g. "Blue Shield of California" |
| `plan_type` | text enum | no | see enums |
| `zip` | text | no | 5-digit |
| `specialty` | text enum | no | |
| `appointment_type` | text enum | no | |
| `prior_appointment_date` | date | yes | therapist `follow_up`: deadline counts from this date when present, else from the request date |
| `created_at` | timestamptz | no | default `now()` |
| `status` | text enum | no | default `scraping` |

## Table `providers`
| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | uuid | no | PK, default `gen_random_uuid()` |
| `search_id` | uuid | no | FK → searches.id, indexed |
| `name` | text | no | |
| `specialty` | text enum | no | |
| `phone` | text | yes | E.164 preferred (`+16195550123`) |
| `address` | text | yes | |
| `source_url` | text | yes | where we found the listing/profile |
| `ghost_status` | text enum | no | default `unverified` |
| `ghost_reason` | text | yes | human-readable why |
| `earliest_date` | date | yes | from call transcript |
| `business_days_wait` | int | yes | business days from clock start (request date in Pacific time, or `prior_appointment_date` for therapist follow-up) to `earliest_date` |
| `deadline_days` | int | yes | legal deadline in business days. **Urgent**: the rule is calendar hours (48 / 96); stored here as hours÷24 (2 / 4) for display, violation is decided on hours — see `ghost_reason` |
| `violation` | bool | no | default false |
| `call_transcript` | text | yes | |
| `checked_at` | timestamptz | yes | default `now()`; updated when the call result lands |

## Example `providers` rows (one per ghost_status)

```json
{
  "id": "6f1c2a1e-0000-4000-8000-000000000001",
  "search_id": "0d5e9b8a-0000-4000-8000-00000000aaaa",
  "name": "Rachel Okafor, LMFT",
  "specialty": "therapist",
  "phone": "+16195550101",
  "address": "4100 Fourth Ave Ste 210, San Diego, CA 92103",
  "source_url": "https://example.com/directory/rachel-okafor",
  "ghost_status": "ghost",
  "ghost_reason": "Insurer lists as accepting; public profile says 'not accepting new clients'",
  "earliest_date": null,
  "business_days_wait": null,
  "deadline_days": null,
  "violation": false,
  "call_transcript": null,
  "checked_at": "2026-11-14T22:05:00Z"
}
```

```json
{
  "id": "6f1c2a1e-0000-4000-8000-000000000002",
  "search_id": "0d5e9b8a-0000-4000-8000-00000000aaaa",
  "name": "Elena Marsh, LCSW",
  "specialty": "therapist",
  "phone": "+16195550102",
  "address": "3500 30th St Ste 4, San Diego, CA 92104",
  "source_url": "https://example.com/directory/elena-marsh",
  "ghost_status": "unverified",
  "ghost_reason": null,
  "earliest_date": null,
  "business_days_wait": null,
  "deadline_days": null,
  "violation": false,
  "call_transcript": null,
  "checked_at": "2026-11-14T22:05:00Z"
}
```

```json
{
  "id": "6f1c2a1e-0000-4000-8000-000000000006",
  "search_id": "0d5e9b8a-0000-4000-8000-00000000aaaa",
  "name": "Dr. Nora Whitfield, PhD",
  "specialty": "therapist",
  "phone": "+16195550110",
  "address": "3252 Governor Dr Ste 8, San Diego, CA 92122",
  "source_url": "https://example.com/directory/nora-whitfield",
  "ghost_status": "calling",
  "ghost_reason": null,
  "earliest_date": null,
  "business_days_wait": null,
  "deadline_days": null,
  "violation": false,
  "call_transcript": null,
  "checked_at": "2026-11-14T22:05:00Z"
}
```

```json
{
  "id": "6f1c2a1e-0000-4000-8000-000000000003",
  "search_id": "0d5e9b8a-0000-4000-8000-00000000aaaa",
  "name": "Dr. Daniel Reyes, PsyD",
  "specialty": "therapist",
  "phone": "+16195550103",
  "address": "1200 Third Ave Ste 910, San Diego, CA 92101",
  "source_url": "https://example.com/directory/daniel-reyes",
  "ghost_status": "available",
  "ghost_reason": "Earliest opening is 3 business days after request — within the 10-day deadline",
  "earliest_date": "2026-11-19",
  "business_days_wait": 3,
  "deadline_days": 10,
  "violation": false,
  "call_transcript": "Agent: Hi, I'm an AI assistant calling on behalf of a patient...\nOffice: We can do Thursday the 19th.",
  "checked_at": "2026-11-14T22:06:10Z"
}
```

```json
{
  "id": "6f1c2a1e-0000-4000-8000-000000000004",
  "search_id": "0d5e9b8a-0000-4000-8000-00000000aaaa",
  "name": "Priya Natarajan, LPCC",
  "specialty": "therapist",
  "phone": "+16195550104",
  "address": "2250 Camino del Rio N Ste 205, San Diego, CA 92108",
  "source_url": "https://example.com/directory/priya-natarajan",
  "ghost_status": "violation",
  "ghost_reason": "Earliest opening is 27 business days after request (deadline 10)",
  "earliest_date": "2026-12-23",
  "business_days_wait": 27,
  "deadline_days": 10,
  "violation": true,
  "call_transcript": "Agent: Hi, I'm an AI assistant calling on behalf of a patient...\nOffice: Earliest is December 23rd.",
  "checked_at": "2026-11-14T22:06:30Z"
}
```

```json
{
  "id": "6f1c2a1e-0000-4000-8000-000000000005",
  "search_id": "0d5e9b8a-0000-4000-8000-00000000aaaa",
  "name": "Dr. Michael Brennan, PhD",
  "specialty": "therapist",
  "phone": "+16195550105",
  "address": "3980 Adams Ave Ste 2, San Diego, CA 92116",
  "source_url": "https://example.com/directory/michael-brennan",
  "ghost_status": "no_answer",
  "ghost_reason": "No answer after 30s; voicemail full",
  "earliest_date": null,
  "business_days_wait": null,
  "deadline_days": 10,
  "violation": false,
  "call_transcript": "(no answer — voicemail box full)",
  "checked_at": "2026-11-14T22:06:50Z"
}
```

## Example `searches` row
```json
{
  "id": "0d5e9b8a-0000-4000-8000-00000000aaaa",
  "insurer": "Blue Shield of California",
  "plan_type": "hmo",
  "zip": "92103",
  "specialty": "therapist",
  "appointment_type": "new",
  "prior_appointment_date": null,
  "created_at": "2026-11-14T22:04:50Z",
  "status": "done"
}
```

## App records (additive, Aryan) — deleted with their search (`ON DELETE CASCADE`)
| Table | Columns | Written by |
|---|---|---|
| `authorizations` | `search_id` uuid PK → searches, `authorized_at` timestamptz, `provider_count` int | `POST /api/search/{id}/verify` (the patient's consent click; first one kept) |
| `date_corrections` | `provider_id` uuid PK → providers, `search_id` → searches, `original_date`, `corrected_date`, `corrected_at` | `POST /api/search/{id}/providers/{pid}/date` `{"date":"YYYY-MM-DD"}` (rules engine re-runs; transcript unchanged) |

`GET /api/search/{id}` adds optional `authorized_at` (ISO timestamp or null) and `patient_confirmed` (provider ids). The packet shows both.
