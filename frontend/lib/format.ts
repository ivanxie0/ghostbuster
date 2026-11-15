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
    badge: "bg-zinc-700 text-zinc-200",
    // (confirmed-on-call ghosts add CONFIRMED_GHOST_STYLE on top of this)
    row: "border-zinc-800 bg-zinc-900/40 opacity-70",
    text: "text-zinc-400",
    flash: "rgba(161,161,170,.5)",
  },
  unverified: {
    badge: "bg-sky-900 text-sky-100 ring-1 ring-sky-500/50",
    row: "border-zinc-700 bg-zinc-900",
    text: "text-sky-300",
    flash: "rgba(56,189,248,.5)",
  },
  calling: {
    badge: "bg-indigo-500 text-white animate-pulse",
    row: "border-indigo-400 bg-indigo-950/60 ring-2 ring-indigo-400/60",
    text: "text-indigo-200",
    flash: "rgba(129,140,248,.6)",
  },
  available: {
    badge: "bg-emerald-500 text-emerald-950",
    row: "border-emerald-500 bg-emerald-950/50",
    text: "text-emerald-300",
    flash: "rgba(16,185,129,.7)",
  },
  violation: {
    badge: "bg-red-500 text-white",
    row: "border-red-500 bg-red-950/50",
    text: "text-red-300",
    flash: "rgba(239,68,68,.7)",
  },
  no_answer: {
    badge: "bg-amber-400 text-amber-950",
    row: "border-amber-500/70 bg-amber-950/40",
    text: "text-amber-300",
    flash: "rgba(245,158,11,.6)",
  },
};

/** Confirmed ghost: ghost grey with a red outline. */
export const CONFIRMED_GHOST_STYLE = {
  badge: "bg-zinc-700 text-zinc-100 ring-2 ring-red-500",
  row: "border-red-500/70 bg-zinc-900/60",
};

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
