// Display helpers. Pure functions over contract types — no data access here (that's lib/api.ts).
import type { AppointmentType, GhostStatus, PlanType, Provider, Search, Specialty } from "./types";

export const SPECIALTY_LABEL: Record<Specialty, string> = {
  therapist: "Therapist",
  psychiatrist: "Psychiatrist",
  primary_care: "Primary care",
  specialist: "Specialist",
};

export const PLAN_LABEL: Record<PlanType, string> = {
  hmo: "HMO",
  ppo: "PPO",
  medi_cal: "Medi-Cal",
  unknown: "Not sure",
};

export const APPT_LABEL: Record<AppointmentType, string> = {
  new: "New patient",
  follow_up: "Follow-up",
  urgent: "Urgent",
};

export const STATUS_LABEL: Record<GhostStatus, string> = {
  ghost: "Ghost",
  unverified: "Not checked",
  calling: "Calling…",
  available: "Available",
  violation: "Past legal deadline",
  no_answer: "No answer",
};

/** Tailwind classes per status: badge, row accent, text accent, flash color. */
export const STATUS_STYLE: Record<GhostStatus, { badge: string; row: string; text: string; flash: string }> = {
  ghost: {
    badge: "bg-ink/8 text-ink/60",
    // (confirmed-on-call ghosts add CONFIRMED_GHOST_STYLE on top of this)
    row: "border-line bg-page text-ink/55",
    text: "text-ink/50",
    flash: "rgba(20,20,15,.3)",
  },
  unverified: {
    badge: "bg-paper text-ink/70 ring-1 ring-ink/25",
    row: "border-line bg-paper",
    text: "text-ink/70",
    flash: "rgba(20,20,15,.3)",
  },
  calling: {
    badge: "bg-cobalt text-paper animate-pulse",
    row: "border-cobalt/60 bg-[#f1f4fd] ring-2 ring-cobalt/20",
    text: "text-cobalt",
    flash: "rgba(30,64,201,.5)",
  },
  available: {
    badge: "bg-moss text-paper",
    row: "border-moss/50 bg-[#f0f8f3]",
    text: "text-moss",
    flash: "rgba(29,122,70,.55)",
  },
  violation: {
    badge: "bg-signal text-paper",
    row: "border-signal/40 bg-[#fdf3f1]",
    text: "text-signal",
    flash: "rgba(212,53,31,.55)",
  },
  no_answer: {
    badge: "bg-[#f7e7bd] text-[#6b4e0a]",
    row: "border-[#ecd9a4] bg-[#fdf8ea]",
    text: "text-[#6b4e0a]",
    flash: "rgba(183,121,31,.45)",
  },
};

/** Confirmed ghost: ghost grey with a red outline. */
export const CONFIRMED_GHOST_STYLE = {
  badge: "bg-ink/8 text-ink ring-1 ring-signal",
  row: "border-signal/50 bg-page text-ink/70",
};

/** Display-only phone mask: "(•••) •••-4529". The real number stays in the data and in tel: links. */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 4 ? `(•••) •••-${digits.slice(-4)}` : "•••";
}

// Formatted US phone numbers inside free text (transcripts, reasons, log). Requires +1 or separators,
// so bare 10-digit IDs (NPI numbers in URLs) are left alone.
const PHONE_IN_TEXT = /(?<![\w/])(?:\+1\d{10}|(?:\+?1[\s.-]?)?(?:\(\d{3}\)\s?|\d{3}[\s.-])\d{3}[\s.-]\d{4})(?!\d)/g;
export const maskPhonesIn = (text: string): string => text.replace(PHONE_IN_TEXT, (m) => maskPhone(m));

/** Seed/fake providers all have example.com source URLs (db/seed_providers.json); real scraped ones never do. */
export const isDemoProvider = (p: Provider) => !!p.source_url?.startsWith("https://example.com/");

/** Terminal statuses: nothing more will happen to the row. "ghost" is terminal whether it came from the
 *  directory check or from a call (Hardik: called rows saying "not accepting" end as ghost). */
export const RESOLVED: GhostStatus[] = ["available", "violation", "no_answer", "ghost"];
export const isResolved = (p: Provider) => RESOLVED.includes(p.ghost_status);

/** Ghost confirmed by the office on the call (vs. flagged from the directory/profile check). */
export const isConfirmedGhost = (p: Provider) =>
  p.ghost_status === "ghost" && !!p.ghost_reason?.startsWith("Confirmed on call:");

/** Row was actually phoned and has a result. Directory ghosts (never called) are resolved but NOT called. */
export const wasCalled = (p: Provider) =>
  ["available", "violation", "no_answer"].includes(p.ghost_status) ||
  (p.ghost_status === "ghost" && (isConfirmedGhost(p) || !!p.call_transcript));

/** "Dec 23" from "2026-12-23" without timezone drift. */
export function shortDate(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function longDate(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

/** Mirrors rules.deadlines.hours_until: request time -> start of appointment day (Pacific). */
export function urgentHours(search: Search, p: Provider): number | null {
  if (!p.earliest_date) return null;
  const appt = new Date(`${p.earliest_date}T00:00:00-08:00`).getTime();
  return Math.max(0, Math.round((appt - new Date(search.created_at).getTime()) / 3_600_000));
}

/** Wait vs deadline, in the unit the rule uses. */
export function waitVsDeadline(search: Search, p: Provider): { wait: string; limit: string } | null {
  if (p.deadline_days == null) return null;
  if (search.appointment_type === "urgent") {
    const h = urgentHours(search, p);
    return { wait: h == null ? "—" : `${h} hrs`, limit: `${p.deadline_days * 24} hrs` };
  }
  return {
    wait: p.business_days_wait == null ? "—" : `${p.business_days_wait} business days`,
    limit: `${p.deadline_days} business days`,
  };
}

export function deadlineText(search: Pick<Search, "specialty" | "appointment_type">): string {
  if (search.appointment_type === "urgent") return "48 hours";
  const d =
    search.specialty === "specialist" || search.specialty === "psychiatrist" ? 15 : 10;
  return `${d} business days`;
}

export function clock(d = new Date()): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
}
