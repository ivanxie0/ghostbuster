-- GhostBuster schema. Mirrors docs/DATA_CONTRACT.md exactly. Idempotent (safe to re-run).
-- Owner: Ivan. Change only together with backend/app/models.py and frontend/lib/types.ts.

CREATE TABLE IF NOT EXISTS searches (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    insurer          text NOT NULL,
    plan_type        text NOT NULL CHECK (plan_type IN ('hmo', 'ppo', 'medi_cal', 'unknown')),
    zip              text NOT NULL,
    specialty        text NOT NULL CHECK (specialty IN ('primary_care', 'specialist', 'psychiatrist', 'therapist')),
    appointment_type text NOT NULL CHECK (appointment_type IN ('new', 'follow_up', 'urgent')),
    created_at       timestamptz NOT NULL DEFAULT now(),
    status           text NOT NULL DEFAULT 'scraping' CHECK (status IN ('scraping', 'verifying', 'done'))
);

CREATE TABLE IF NOT EXISTS providers (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    search_id          uuid NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
    name               text NOT NULL,
    specialty          text NOT NULL CHECK (specialty IN ('primary_care', 'specialist', 'psychiatrist', 'therapist')),
    phone              text,
    address            text,
    source_url         text,
    ghost_status       text NOT NULL DEFAULT 'unverified'
                       CHECK (ghost_status IN ('ghost', 'unverified', 'available', 'violation', 'no_answer')),
    ghost_reason       text,
    earliest_date      date,
    business_days_wait integer,
    deadline_days      integer,
    violation          boolean NOT NULL DEFAULT false,
    call_transcript    text,
    checked_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS providers_search_id_idx ON providers (search_id);
