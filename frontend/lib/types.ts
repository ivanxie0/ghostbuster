// Mirrors backend/app/models.py and docs/DATA_CONTRACT.md EXACTLY. Change them together.

export type PlanType = "hmo" | "ppo" | "medi_cal" | "unknown";
export type Specialty = "primary_care" | "specialist" | "psychiatrist" | "therapist";
export type AppointmentType = "new" | "follow_up" | "urgent";
export type SearchStatus = "scraping" | "verifying" | "done";
export type GhostStatus = "ghost" | "unverified" | "calling" | "available" | "violation" | "no_answer";

export interface SearchCreate {
  insurer: string;
  plan_type: PlanType;
  zip: string; // 5 digits
  specialty: Specialty;
  appointment_type: AppointmentType;
  /** YYYY-MM-DD. Therapist follow-up: deadline counts from here when present, else from request date. */
  prior_appointment_date?: string | null;
}

export interface Search extends SearchCreate {
  id: string;
  created_at: string; // ISO timestamp
  status: SearchStatus;
}

export interface Provider {
  id: string;
  search_id: string;
  name: string;
  specialty: Specialty;
  phone: string | null;
  address: string | null;
  source_url: string | null;
  ghost_status: GhostStatus;
  ghost_reason: string | null;
  earliest_date: string | null; // YYYY-MM-DD
  business_days_wait: number | null;
  deadline_days: number | null;
  violation: boolean;
  call_transcript: string | null;
  checked_at: string | null; // ISO timestamp
}

export interface SearchCreated {
  search_id: string;
}

export interface FallbackEvent {
  stage: string; // "directory" | "ghost check" | "calls" | "extraction"
  detail: string; // e.g. "timed out after 10s → cached demo providers"
  at: string; // ISO timestamp
}

export interface SearchDetail {
  search: Search;
  providers: Provider[];
  fallbacks?: FallbackEvent[]; // real mode only; empty/absent in FAKE_MODE
  authorized_at?: string | null; // ISO; the patient's consent click, if any
  patient_confirmed?: string[]; // provider ids whose date the patient corrected/confirmed
}

/** One group in the Ghost Map: real registry providers or demo (seed) providers. */
export interface GroupStats {
  providers: number;
  checked: number;
  unavailable: number;
  called: number;
  past_deadline: number;
  unavailable_pct: number | null; // unavailable / checked
  past_deadline_pct: number | null; // past_deadline / called
}

export interface GhostStats {
  fake_mode?: boolean;
  generated_at?: string;
  zips?: string[];
  by_insurer: { insurer: string; real: GroupStats; demo: GroupStats }[];
  by_zip: { zip: string; real: GroupStats; demo: GroupStats }[];
}

export interface DemoSettings {
  fake_mode: boolean;
  force_fallback: boolean;
  real_calls: boolean;
  gemini?: boolean;
  brightdata?: boolean;
}

export interface VerifyRequest {
  provider_ids: string[];
}

export interface VerifyResponse {
  started: number;
  provider_ids: string[];
}

export interface ApiError {
  error: string;
}
