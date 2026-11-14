-- GhostBuster schema. Mirrors docs/DATA_CONTRACT.md exactly. Idempotent (safe to re-run).
-- Owner: Ivan. Change only together with backend/app/models.py and frontend/lib/types.ts.

CREATE TABLE IF NOT EXISTS searches (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    insurer          text NOT NULL,
    plan_type        text NOT NULL CHECK (plan_type IN ('hmo', 'ppo', 'medi_cal', 'unknown')),
    zip              text NOT NULL,
    specialty        text NOT NULL CHECK (specialty IN ('primary_care', 'specialist', 'psychiatrist', 'therapist')),
    appointment_type text NOT NULL CHECK (appointment_type IN ('new', 'follow_up', 'urgent')),
    prior_appointment_date date,  -- therapist follow-up: deadline counts from here when present
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
                       CHECK (ghost_status IN ('ghost', 'unverified', 'calling', 'available', 'violation', 'no_answer')),
    ghost_reason       text,
    earliest_date      date,
    business_days_wait integer,
    deadline_days      integer,
    violation          boolean NOT NULL DEFAULT false,
    call_transcript    text,
    checked_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS providers_search_id_idx ON providers (search_id);

-- Migrations for DBs created from an older version of this file (safe to re-run).
ALTER TABLE searches ADD COLUMN IF NOT EXISTS prior_appointment_date date;
ALTER TABLE providers DROP CONSTRAINT IF EXISTS providers_ghost_status_check;
ALTER TABLE providers ADD CONSTRAINT providers_ghost_status_check
    CHECK (ghost_status IN ('ghost', 'unverified', 'calling', 'available', 'violation', 'no_answer'));
