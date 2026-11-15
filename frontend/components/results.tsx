"use client";
// Results "mission control" pieces. Pure presentation — data comes in via props from app/results/[id].
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import {
  PLAN_LABEL, SPECIALTY_PLURAL, deadlineText, isConfirmedGhost, isDemoProvider, longDate, maskPhone, maskPhonesIn, profileCheck, checkedDate, isRealCallUpdate, honestReason, hadProfileCheck,
  shortDate, waitVsDeadline, wasCalled, urgentHours,
} from "@/lib/format";
import type { GhostStatus, Provider, Search, SearchDetail } from "@/lib/types";

// ---------------------------------------------------------------- activity log model
// focus: the results page auto-selects this provider (call results; not directory ghosts)
export type LogEvent = { id: number; at: string; text: string; tone: GhostStatus | "info" | "user" | "fallback"; pid?: string; focus?: boolean };

const TONE_GLYPH: Record<LogEvent["tone"], string> = {
  info: "·",
  fallback: "↯",
  user: "★",
  ghost: "◌",
  unverified: "·",
  calling: ")))",
  available: "✓",
  violation: "!",
  no_answer: "–",
};

/** Turn the difference between two polls into human-readable log lines. */
export function diffEvents(prev: SearchDetail | null, next: SearchDetail): Omit<LogEvent, "id" | "at">[] {
  const out: Omit<LogEvent, "id" | "at">[] = [];
  const s = next.search;
  if (!prev) {
    out.push({ tone: "info", text: `Looking up ${SPECIALTY_PLURAL[s.specialty].toLowerCase()} near ${s.zip} for your ${s.insurer} plan` });
  }
  if ((prev?.providers.length ?? 0) === 0 && next.providers.length > 0) {
    out.push({ tone: "info", text: `Found ${next.providers.length} providers. Checking their public profiles…` });
  }
  const before = new Map(prev?.providers.map((p) => [p.id, p.ghost_status]) ?? []);
  for (const p of next.providers) {
    const was = before.get(p.id);
    if (was === p.ghost_status || (!was && p.ghost_status === "unverified")) continue;
    const w = waitVsDeadline(s, p);
    const name = p.name;
    const reason = p.ghost_reason?.trim();
    switch (p.ghost_status) {
      case "calling":
        out.push({ tone: "calling", pid: p.id, focus: true, text: `Calling ${name}…` });
        break;
      case "ghost":
        out.push(isConfirmedGhost(p) || wasCalled(p)
          ? { tone: "ghost", pid: p.id, focus: true, text: `${name}: ${reason ? honestReason(reason) : "not accepting this plan/new patients"}` }
          : { tone: "ghost", pid: p.id, text: `Ghost: ${name}, ${reason ?? "not accepting"}` });
        break;
      case "available":
        out.push({ tone: "available", pid: p.id, focus: true, text: `${name}: ${reason ?? `earliest ${shortDate(p.earliest_date)}, ${w?.wait} (limit ${w?.limit})`}. Within the deadline ✓` });
        break;
      case "violation":
        out.push({ tone: "violation", pid: p.id, focus: true, text: `${name}: ${reason ?? `earliest ${shortDate(p.earliest_date)}, ${w?.wait} (limit ${w?.limit})`}. Past legal deadline` });
        break;
      case "no_answer":
        out.push({ tone: "no_answer", pid: p.id, focus: true, text: `${name}: ${reason ?? "no answer"}` });
        break;
    }
  }
  const callable = next.providers.filter((p) => p.ghost_status === "unverified").length;
  if (prev?.search.status === "scraping" && s.status === "verifying" && !next.providers.some((p) => p.ghost_status === "calling")) {
    const ghosts = next.providers.filter((p) => p.ghost_status === "ghost").length;
    out.push({ tone: "info", text: `${ghosts} ghosts flagged. ${callable} offices look real. Waiting for your OK to call.` });
  }
  // Pipeline stages that fell back to cached/seed data (real mode), in order, once each.
  for (const f of (next.fallbacks ?? []).slice(prev?.fallbacks?.length ?? 0)) {
    if (isRealCallUpdate(f.detail)) {  // a late real-call result, logged by the pipeline: normal line, not a fallback
      out.push({ tone: "info", text: f.detail.replace(/updated from real call/i, "Updated from real call") });
      continue;
    }
    out.push({ tone: "fallback", text: `Fallback · ${f.stage}: ${f.detail}` });
  }
  if (prev && prev.search.status !== "done" && s.status === "done") out.push({ tone: "info", text: "All calls complete." });
  return out;
}

// ---------------------------------------------------------------- header + counters
export function PhasePill({ detail }: { detail: SearchDetail }) {
  const { status } = detail.search;
  const calling = detail.providers.some((p) => p.ghost_status === "calling");
  const [label, st] =
    status === "scraping" ? ["● Finding providers", "unverified"]
    : status === "done" ? ["✓ Complete", "unverified"]
    : calling ? ["● Calling offices", "calling"]
    : ["● Ready to call", "no_answer"];
  return <span key={label} className="badge flip" data-st={st}>{label}</span>;
}

/** Offices that are (or will be) phoned: called, on the line, or demo offices still waiting for consent.
 *  Real registry providers are never dialed, so they don't count. */
export const callTotal = (providers: Provider[]) =>
  providers.filter((p) => wasCalled(p) || p.ghost_status === "calling" || (p.ghost_status === "unverified" && isDemoProvider(p))).length;

/** "[■■□□□] 2 of 5 called", from real counts. */
export function tallyText(providers: Provider[]) {
  const called = providers.filter(wasCalled).length;
  const total = callTotal(providers);
  const width = Math.min(10, total);
  const n = total ? Math.round((called / total) * width) : 0;
  return `[${"■".repeat(n)}${"□".repeat(width - n)}] ${called} of ${total} called`;
}

/** Kept for callers; the stats row below replaced it on the results page. */
export function GhostRate({ providers }: { providers: Provider[] }) {
  if (!providers.length) return null;
  const unavailable = providers.filter((p) => p.ghost_status === "ghost").length;
  return <p className="t-h2">{unavailable} of {providers.length} appear unavailable.</p>;
}

/** One boxed stat tile: label, big number (flips on change), optional "/ total", and a thin bar. */
function Tile({ label, v, of, color, bar }: { label: string; v: number; of?: number; color?: string; bar: number }) {
  return (
    <div className="stat-tile">
      <div className="stat-label">{label}</div>
      <div className="t-display mt-1.5" style={{ color, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
        <span key={v} className="flip">{v}</span>
        {of !== undefined && <span className="stat-of">/{of}</span>}
      </div>
      <div className="stat-bar mt-3" aria-hidden="true">
        <span style={{ width: `${Math.round(Math.min(1, Math.max(0, bar)) * 100)}%`, background: color ?? "var(--ink-2)" }} />
      </div>
    </div>
  );
}

/** Four boxed tiles: found / appear unavailable / called (x/y) / past deadline.
 *  `scanning`: the ghost check is still running, so the number of offices to call isn't known yet. */
export function Counters({ providers, scanning = false }: { providers: Provider[]; scanning?: boolean }) {
  const found = providers.length;
  const ghosts = providers.filter((p) => p.ghost_status === "ghost").length;
  const called = providers.filter(wasCalled).length;
  const total = callTotal(providers);
  const past = providers.filter((p) => p.ghost_status === "violation").length;
  return (
    <section aria-label="Tally" aria-live="polite" className="stat-grid">
      <Tile label="Found" v={found} bar={found ? 1 : 0} />
      <Tile label="Appear unavailable" v={ghosts} color="var(--st-ghost)" bar={found ? ghosts / found : 0} />
      <Tile label="Offices called" v={called} of={scanning ? undefined : total} color="var(--st-calling)" bar={total ? called / total : 0} />
      <Tile label="Past deadline" v={past} color="var(--st-past)" bar={called ? past / called : 0} />
    </section>
  );
}

/** Ghost funnel, from existing data: found → profiles found online → appear unavailable → called → timely. */
export function GhostFunnel({ providers }: { providers: Provider[] }) {
  const steps = [
    { label: "providers found", value: providers.length, color: "var(--ink-2)" },
    { label: "profiles found online", value: providers.filter(hadProfileCheck).length, color: "var(--primary)" },
    { label: "appear unavailable", value: providers.filter((p) => p.ghost_status === "ghost").length, color: "var(--st-ghost)" },
    { label: "offices called", value: providers.filter(wasCalled).length, color: "var(--st-calling)" },
    { label: "timely appointment", value: providers.filter((p) => p.ghost_status === "available").length, color: "var(--st-available)" },
  ];
  const max = Math.max(1, steps[0].value);
  return (
    <section aria-label="Ghost funnel" className="mt-6 border-y py-5" style={{ borderColor: "var(--line-strong)" }}>
      <h2 className="t-h3" style={{ fontSize: "1.0625rem" }}>The funnel</h2>
      <ol className="mt-4 grid list-none grid-cols-2 gap-x-6 gap-y-5 p-0 sm:grid-cols-5">
        {steps.map((s, i) => (
          <li key={s.label} className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="t-h2" style={{ fontVariantNumeric: "tabular-nums" }}>{s.value}</span>
              {i < steps.length - 1 && <span aria-hidden className="hidden sm:inline" style={{ color: "var(--ink-3)" }}>→</span>}
            </div>
            <div className="t-small mt-1" style={{ color: "var(--ink-2)" }}>{s.label}</div>
            <div className="ruler-track mt-2" aria-hidden style={{ height: 6 }}>
              <div style={{ height: "100%", borderRadius: 4, width: `${(100 * s.value) / max}%`, background: s.color }} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------- consent
export function ConsentCard({ search, count, skipped = 0, onApprove, busy }: { search: Search; count: number; skipped?: number; onApprove: () => void; busy: boolean }) {
  return (
    <section className="rise card card-lg p-6 sm:p-8" style={{ borderColor: "var(--primary)", boxShadow: "inset 4px 0 0 var(--primary), var(--shadow-2)" }}>
      <p className="eyebrow" style={{ color: "var(--primary)" }}>Your permission needed</p>
      <h2 className="t-h2 mt-2">
        Want us to call {skipped > 0 ? `the ${count} demo ${count === 1 ? "office" : "offices"}` : `the ${count} remaining ${count === 1 ? "office" : "offices"}`}?
      </h2>
      {skipped > 0 && (
        <p className="t-lead mb-0 mt-2">
          The other {skipped} {skipped === 1 ? "is a public-registry provider" : "are public-registry providers"} and won&apos;t be called during this demo.
        </p>
      )}
      <p className="mb-0 mt-4" style={{ color: "var(--ink-2)" }}>
        With your permission, our AI assistant will act as your <b style={{ color: "var(--ink)" }}>authorized representative</b> and phone each office below. It will:
      </p>
      <ul className="mt-3 list-none space-y-1.5 p-0" style={{ color: "var(--ink-2)" }}>
        {[
          <>say at the start of the call that it&apos;s an <b style={{ color: "var(--ink)" }}>AI assistant calling on behalf of a patient</b> and that the call is being recorded and transcribed</>,
          <>ask only for the <b style={{ color: "var(--ink)" }}>earliest opening, in person or by telehealth</b>, with {search.insurer} {PLAN_LABEL[search.plan_type]}</>,
          <><b style={{ color: "var(--ink)" }}>not</b> share your name, contact info, or health details</>,
        ].map((li, i) => (
          <li key={i} className="grid grid-cols-[1.5em_1fr]"><span aria-hidden style={{ color: "var(--primary)", fontWeight: 700 }}>✓</span><span>{li}</span></li>
        ))}
      </ul>
      <p className="mb-0 mt-3" style={{ color: "var(--ink-2)" }}>
        Calls are <b style={{ color: "var(--ink)" }}>recorded and transcribed</b> so the transcript can go in your evidence log.
      </p>
      <p className="t-small mb-0 mt-4 border-t pt-3" style={{ color: "var(--ink-3)", borderColor: "var(--line)" }}>
        Hackathon demo: calls only go to our own team&apos;s test phones. We don&apos;t store your name or health details; delete your search anytime.
      </p>
      <button onClick={onApprove} disabled={busy} className="btn btn-primary btn-lg mt-6">
        {busy ? "Starting calls…" : <>Yes, check these {count} for me <span className="arrow" aria-hidden="true">→</span></>}
      </button>
    </section>
  );
}

// ---------------------------------------------------------------- endings (verdict on paper)
function Ledger({ rows }: { rows: { k: string; v: React.ReactNode; hot?: boolean; sub?: boolean }[] }) {
  return (
    <dl className="ledger my-6 border-y py-1.5" style={{ borderColor: "var(--paper-rule)" }}>
      {rows.map((r, i) => (
        <div key={r.k} className={`ledger-row ${r.sub ? "sub" : ""}`} style={{ animationDelay: `${1100 + i * 80}ms` }}>
          <dt>{r.k}</dt>
          <span aria-hidden className="lead" />
          <dd className={`val m-0 ${r.hot ? "hot" : ""}`}>{r.v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Verdict({ kicker, title, sub, stamp, ok = false, children }: {
  kicker: string; title: React.ReactNode; sub: React.ReactNode; stamp: [string, string]; ok?: boolean; children: React.ReactNode;
}) {
  return (
    <article className="paper verdict print-in">
      <div className="flex flex-wrap-reverse items-start justify-between gap-6">
        <div className="min-w-0 flex-[1_1_420px]">
          <div className="t-small font-bold" style={{ color: "var(--ink-3)" }}>{kicker}</div>
          <h2 className="t-display my-2.5">{title}</h2>
          <div className="m-0" style={{ color: "var(--ink-2)" }}>{sub}</div>
        </div>
        <div className="stamp stamp-in mr-3 mt-2 max-w-full" aria-hidden="true"
          style={ok ? { borderColor: "var(--st-available)", color: "var(--st-available)" } : undefined}>
          {stamp[0]}<small>{stamp[1]}</small>
        </div>
      </div>
      {children}
    </article>
  );
}

export function EndingA({ search, provider, id, violations }: { search: Search; provider: Provider; id: string; violations: number }) {
  const w = waitVsDeadline(search, provider);
  return (
    <Verdict
      ok
      kicker="Finding · Appointment available"
      title={<>{provider.name} can see you {longDate(provider.earliest_date)}.</>}
      sub={<>
        <p className="m-0">That&apos;s <b style={{ color: "var(--ink)" }}>{w?.wait}</b> away, within the legal limit of {w?.limit}.</p>
        {provider.address && <p className="t-small mb-0 mt-1" style={{ color: "var(--ink-3)" }}>{provider.address}</p>}
      </>}
      stamp={["In time", `limit ${w?.limit ?? deadlineText(search)}`]}
    >
      <Ledger rows={[
        { k: "Earliest opening", v: shortDate(provider.earliest_date) },
        { k: "Wait", v: w?.wait ?? "—" },
        { k: "Legal limit", v: w?.limit ?? deadlineText(search) },
        ...(violations > 0 ? [{ k: "Other offices past deadline", v: violations, hot: true }] : []),
      ]} />
      <div className="flex flex-wrap items-center gap-4">
        <a href={provider.phone ? `tel:${provider.phone}` : provider.source_url ?? "#"} target={provider.phone ? undefined : "_blank"} rel="noreferrer"
          className="btn btn-primary btn-lg">
          {provider.phone ? `Call to book · ${maskPhone(provider.phone)}` : <>Book this appointment <span className="arrow">→</span></>}
        </a>
        {violations > 0 && <Link href={`/packet/${id}`} className="btn btn-outline">Save the evidence log anyway</Link>}
      </div>
      <p className="t-small mb-0 mt-5" style={{ color: "var(--ink-3)" }}>
        Tip: say you&apos;re a {search.insurer} {PLAN_LABEL[search.plan_type]} member and ask for the {shortDate(provider.earliest_date)} new-patient slot.
      </p>
    </Verdict>
  );
}

export function EndingB({ detail, id }: { detail: SearchDetail; id: string }) {
  const { search, providers } = detail;
  const n = (s: GhostStatus) => providers.filter((p) => p.ghost_status === s).length;
  const checked = providers.filter(wasCalled).length;
  const confirmed = providers.filter(isConfirmedGhost).length;
  const listedGhosts = n("ghost") - confirmed;
  const past = n("violation");
  const selfFunded = search.plan_type === "ppo" || search.plan_type === "unknown";
  return (
    <Verdict
      kicker="Finding · Timely access grievance ready"
      title="No provider we reached could offer a timely appointment."
      sub={<p className="m-0">You can now ask your plan to arrange timely care, including out-of-network at in-network cost.</p>}
      stamp={["Past deadline", `×${past} ${past === 1 ? "office" : "offices"} · limit ${deadlineText(search)}`]}
    >
      <Ledger rows={[
        { k: "Offices called", v: checked },
        { k: "Past legal deadline", v: past, hot: true, sub: true },
        ...(confirmed > 0 ? [{ k: "Not taking plan / new patients", v: confirmed, hot: true, sub: true }] : []),
        { k: "Didn't answer", v: n("no_answer"), sub: true },
        { k: "Others that appear unavailable", v: listedGhosts },
        { k: "Legal limit", v: deadlineText(search) },
      ]} />
      {selfFunded && (
        <p className="notice mb-5 mt-0">
          If your PPO is a self-funded employer plan, these California rules may not apply. The call log is still useful evidence.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <Link href={`/packet/${id}`} className="btn btn-primary btn-lg">Open grievance packet <span className="arrow" aria-hidden>→</span></Link>
        <span className="t-small" style={{ color: "var(--ink-3)" }}>Evidence log + template, not legal advice.</span>
      </div>
    </Verdict>
  );
}

// ---------------------------------------------------------------- provider list
/** Deadline ruler: wait vs limit, in the rule's unit (business days, or hours for urgent). */
export function DeadlineRuler({ search, provider, lg = false }: { search: Search; provider: Provider; lg?: boolean }) {
  if (provider.deadline_days == null || !provider.earliest_date) return null;
  const urgent = search.appointment_type === "urgent";
  const limit = urgent ? provider.deadline_days * 24 : provider.deadline_days;
  const wait = urgent ? urgentHours(search, provider) ?? 0 : provider.business_days_wait ?? 0;
  const scale = Math.max(limit * 3, Math.ceil(wait * 1.07), 1);
  return (
    <div className={`ruler ${lg ? "ruler-lg" : ""}`} data-ok={!provider.violation} aria-hidden="true"
      style={{ "--wait": Math.max(wait, 0.3), "--limit": limit, "--scale": scale } as React.CSSProperties}>
      <div className="ruler-track">
        <div className="ruler-fill"><div className="ruler-in" /><div className="ruler-out" /></div>
        <div className="ruler-tick" data-label={`limit ${limit}${urgent ? " hrs" : ""}`} />
      </div>
    </div>
  );
}

function rowDetail(search: Search, p: Provider) {
  const w = waitVsDeadline(search, p);
  switch (p.ghost_status) {
    case "ghost": return maskPhonesIn(profileCheck(p)?.text ?? honestReason(p.ghost_reason));
    case "unverified": return maskPhonesIn(profileCheck(p)?.text ?? p.ghost_reason ?? "Looks real, not called yet");
    case "calling": return "AI assistant is on the line…";
    case "no_answer": return maskPhonesIn(p.ghost_reason ?? "No answer");
    default:
      return <>Earliest <b className="hot">{shortDate(p.earliest_date)}</b> · <b className="hot">{w?.wait}</b> vs {w?.limit} limit</>;
  }
}

/** "Demo data: fictional providers" tag so realistic seed names can't be mistaken for real offices. */
export function DemoDataTag({ providers }: { providers: Provider[] }) {
  const demo = providers.filter(isDemoProvider).length;
  if (!demo) return null;
  const all = demo === providers.length;
  return <span className="demo-tag">{all ? "Demo data: fictional providers" : `Includes ${demo} fictional demo providers (marked)`}</span>;
}

/** Jai's legal caveats — always visible on results. */
export function LegalNote() {
  return (
    <p className="t-small mb-3.5 mt-1.5" style={{ color: "var(--ink-2)" }}>
      A provider can lawfully set a longer wait if they note in your record that it won&apos;t harm your health. Telehealth appointments count.
    </p>
  );
}

const SMALL_LINK = "t-small cursor-pointer border-0 bg-transparent p-0 underline underline-offset-2";

/** Inline "Report an error" form for a real provider row (e.g. the provider correcting their status). */
function ReportError({ onReport }: { onReport: (what: string, contact: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [what, setWhat] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className={`${SMALL_LINK} ml-[22px] mt-1`} style={{ color: "var(--ink-3)" }}>
        Report an error
      </button>
    );
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (what.trim().length < 3) return setError("Say briefly what's wrong.");
    setBusy(true);
    setError(null);
    try {
      await onReport(what.trim(), contact.trim());
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="card mt-2 space-y-3 p-4">
      <label className="block">
        <span className="field-label">What&apos;s wrong?</span>
        <textarea value={what} onChange={(e) => setWhat(e.target.value)} rows={2} maxLength={1000}
          className="field" style={{ height: "auto", padding: "10px 14px" }} placeholder="e.g. I'm accepting new patients with this plan" />
      </label>
      <label className="block">
        <span className="field-label">Contact <span style={{ fontWeight: 400, color: "var(--ink-3)" }}>(optional)</span></span>
        <input value={contact} onChange={(e) => setContact(e.target.value)} maxLength={200} className="field" placeholder="email or phone" />
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <button disabled={busy} className="btn btn-primary">{busy ? "Sending…" : "Send report"}</button>
        <button type="button" onClick={() => setOpen(false)} className={SMALL_LINK} style={{ color: "var(--ink-2)" }}>Cancel</button>
        {error && <span className="field-error m-0">{error}</span>}
      </div>
    </form>
  );
}

/** Rows that just got a call result get the wash animation (remounted by key on status change). */
const WASH: GhostStatus[] = ["available", "violation", "no_answer"];

export function ProviderList({ search, providers, selected, onSelect, confirmedIds = [], reviewIds = [], onReport }: {
  search: Search; providers: Provider[]; selected: string | null; onSelect: (id: string) => void;
  confirmedIds?: string[]; reviewIds?: string[]; onReport?: (providerId: string, what: string, contact: string) => Promise<void>;
}) {
  const mixed = providers.some(isDemoProvider) && !providers.every(isDemoProvider);
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {providers.map((p) => {
        const confirmed = isConfirmedGhost(p);
        const ghost = p.ghost_status === "ghost";
        const name = (
          <span className="row-name">
            {p.name}
            {mixed && isDemoProvider(p) && <span className="demo-tag ml-1.5 align-[2px]">Demo</span>}
          </span>
        );
        const detail = (
          <span className="row-detail">
            {rowDetail(search, p)}
            {confirmedIds.includes(p.id) && <span style={{ color: "var(--st-available)" }}> · date confirmed by patient</span>}
          </span>
        );
        const badge = <StatusBadge status={p.ghost_status} confirmed={confirmed} />;
        const pc = profileCheck(p);
        const url = isDemoProvider(p) ? null : pc?.url ?? (ghost ? p.source_url : null);
        const when = checkedDate(p.checked_at);
        return (
          <li key={p.id} className="slide-in">
            <button key={p.ghost_status} onClick={() => onSelect(p.id)} aria-pressed={selected === p.id} data-st={p.ghost_status}
              className={`row ${WASH.includes(p.ghost_status) ? "just-resolved" : ""}`}
              style={confirmed ? { borderColor: "var(--st-past)" } : undefined}>
              {ghost ? <>{name}{detail}{badge}</> : <>{name}{badge}{detail}</>}
              {(p.ghost_status === "available" || p.ghost_status === "violation") && <DeadlineRuler search={search} provider={p} />}
            </button>
            {url && (
              <span className="t-small ml-[22px] mt-1 inline-flex flex-wrap items-center gap-1.5">
                <a href={url} target="_blank" rel="noreferrer" className="link">
                  {pc ? `✓ Profile checked · ${pc.host ?? "source"} ↗` : "Source ↗"}
                </a>
                {when && <span style={{ color: "var(--ink-3)" }}>· checked {when}</span>}
              </span>
            )}
            {/* Real (registry) providers only: anyone, incl. the provider, can report an error. */}
            {!isDemoProvider(p) && (reviewIds.includes(p.id) ? (
              <span className="badge ml-[22px] mt-1" data-st="unverified">Under review</span>
            ) : onReport ? (
              <div><ReportError onReport={(what, contact) => onReport(p.id, what, contact)} /></div>
            ) : null)}
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------- live-call console (dark)
/** "20 business days" -> big 20, small unit. */
function Unit({ text }: { text: string }) {
  const m = text.match(/^(\d+)\s+(.*)$/);
  if (!m) return <>{text}</>;
  return <>{m[1]} <span style={{ fontSize: ".55em" }}>{m[2]}</span></>;
}

const C3 = { color: "var(--console-text-3)" };

/** "Is this right? Edit": the patient confirms or corrects an extracted date. The transcript is never changed. */
function DateCheck({ provider, confirmed, onCorrect }: { provider: Provider; confirmed: boolean; onCorrect: (date: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(provider.earliest_date ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return setError("Pick a date.");
    setSaving(true);
    setError(null);
    try {
      await onCorrect(value);
      setEditing(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  const linkBtn = "cursor-pointer border-0 bg-transparent p-0 underline underline-offset-2";
  return (
    <div className="t-small mt-2 flex flex-wrap items-center gap-2">
      {!editing ? (
        <>
          <span style={{ color: confirmed ? "var(--console-available)" : "var(--console-text-3)" }}>
            {confirmed ? "✓ Date confirmed by patient" : "Extracted from the call. Is this right?"}
          </span>
          <button onClick={() => { setValue(provider.earliest_date ?? ""); setEditing(true); }} className={linkBtn} style={{ color: "var(--console-calling)" }}>
            Edit
          </button>
        </>
      ) : (
        <>
          <label className="sr-only" htmlFor={`date-${provider.id}`}>Correct appointment date</label>
          <input id={`date-${provider.id}`} type="date" value={value} onChange={(e) => setValue(e.target.value)}
            className="rounded border px-2 py-1 [color-scheme:dark]" style={{ background: "var(--console-1)", color: "var(--console-text)", borderColor: "var(--console-line)" }} />
          <button onClick={save} disabled={saving} className="btn btn-primary" style={{ minHeight: 34, padding: "6px 12px" }}>{saving ? "Saving…" : "Save"}</button>
          <button onClick={() => setEditing(false)} className={linkBtn} style={C3}>Cancel</button>
          {error && <span style={{ color: "var(--console-past)" }}>{error}</span>}
        </>
      )}
    </div>
  );
}

export function TranscriptPanel({ search, provider, confirmed = false, onCorrect, tally }: {
  search: Search; provider: Provider | null; confirmed?: boolean; onCorrect?: (date: string) => Promise<void>; tally?: string;
}) {
  const head = (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <div className="label">Call transcript</div>
      {tally && <span className="t-data whitespace-nowrap" style={{ fontSize: 13, color: "var(--console-calling)" }}>{tally}</span>}
    </div>
  );
  if (!provider)
    return (
      <div>
        {head}
        <p className="t-small m-0 rounded-md border border-dashed p-5 text-center" style={{ ...C3, borderColor: "var(--console-line)" }}>
          Select a provider to see their details and call transcript.
        </p>
      </div>
    );
  const w = waitVsDeadline(search, provider);
  // Skip empty turns (e.g. "Agent: " left after TTS tags are stripped).
  const lines = (provider.call_transcript ?? "").split("\n").filter((l) => l.replace(/^(Agent|Office):\s*/, "").trim());
  const pc = profileCheck(provider);
  return (
    <div>
      {head}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[1.125rem] font-bold" style={{ fontFamily: "var(--font-display)" }}>{provider.name}</div>
          <div className="t-small" style={C3}>{[maskPhone(provider.phone), provider.address].filter(Boolean).join(" · ")}</div>
        </div>
      </div>

      {w && provider.earliest_date && (
        <>
          <div className="mb-2 mt-3.5 flex gap-7">
            <div>
              <div className="label">Wait</div>
              <div className="text-[1.75rem] font-bold leading-tight" style={{ fontFamily: "var(--font-display)", color: provider.violation ? "var(--console-past)" : "var(--console-available)" }}>
                <Unit text={w.wait} />
              </div>
            </div>
            <div>
              <div className="label">Legal limit</div>
              <div className="text-[1.75rem] font-bold leading-tight" style={{ fontFamily: "var(--font-display)" }}><Unit text={w.limit} /></div>
            </div>
          </div>
          <DeadlineRuler search={search} provider={provider} lg />
        </>
      )}
      {provider.earliest_date && onCorrect && (
        <DateCheck key={provider.id + (provider.earliest_date ?? "")} provider={provider} confirmed={confirmed} onCorrect={onCorrect} />
      )}

      <div className="scroll-dark mt-2.5 flex max-h-80 flex-col gap-2.5 overflow-y-auto pr-1">
        {provider.ghost_status === "calling" && (
          <div className="flex items-center gap-4 rounded-md border p-3.5" style={{ borderColor: "rgba(157,178,255,.4)", background: "rgba(157,178,255,.1)", color: "var(--console-calling)" }}>
            <span className="eq" aria-hidden><span /><span /><span /><span /><span /></span>
            <span className="t-small font-bold">Live call in progress. The transcript arrives when the call ends.</span>
          </div>
        )}
        {provider.ghost_status === "ghost" && wasCalled(provider) && (
          <p className="t-small m-0 rounded-md border p-3" style={{ borderColor: "rgba(255,143,122,.4)", background: "rgba(255,143,122,.1)" }}>
            Confirmed on the call: <b>not accepting this plan/new patients.</b>
          </p>
        )}
        {provider.ghost_status === "ghost" && !wasCalled(provider) && (
          <p className="t-small m-0">
            Not called. Flagged as a ghost: <b>{maskPhonesIn(pc?.text ?? provider.ghost_reason ?? "")}</b>.{" "}
            {pc?.url ? (
              <a href={pc.url} target="_blank" rel="noreferrer" className="underline underline-offset-2" style={{ color: "var(--console-calling)" }}>
                Profile checked · {pc.host ?? "source"} ↗
              </a>
            ) : (
              provider.source_url && !isDemoProvider(provider) && (
                <a href={provider.source_url} target="_blank" rel="noreferrer" className="underline underline-offset-2" style={{ color: "var(--console-calling)" }}>Source</a>
              )
            )}
            {checkedDate(provider.checked_at) && <span style={C3}> · checked {checkedDate(provider.checked_at)}</span>}
          </p>
        )}
        {provider.ghost_status === "unverified" && <p className="t-small m-0" style={C3}>Not called yet.</p>}
        {lines.map((l, i) => {
          if (l.startsWith("Result:")) {
            return (
              <div key={i} className="bubble" style={{ maxWidth: "100%", borderLeft: "4px solid var(--console-calling)", background: "var(--console-1)", animationDelay: `${i * 80}ms` }}>
                <span className="bubble-label" style={{ color: "var(--console-calling)" }}>Extracted from the call</span>
                <span className="t-data">{maskPhonesIn(l.replace(/^Result:\s*/, ""))}</span>
              </div>
            );
          }
          const text = maskPhonesIn(l.replace(/^(Agent|Office):\s*/, ""));
          const system = text.startsWith("("); // e.g. "(no answer: voicemail box full)"
          const office = !system && l.startsWith("Office:");
          const agent = !system && l.startsWith("Agent:");
          if (!office && !agent) return <p key={i} className="t-small m-0 italic" style={C3}>{text}</p>;
          return (
            <div key={i} className={`bubble ${office ? "bubble-office" : "bubble-agent"}`} style={{ animationDelay: `${i * 80}ms` }}>
              <span className="bubble-label">{office ? "Office" : "AI assistant"}</span>
              {text}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ActivityLog({ events, onPick }: { events: LogEvent[]; onPick: (pid: string) => void }) {
  const ref = useRef<HTMLOListElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [events.length]);
  return (
    <div>
      <h3 className="label mb-2 mt-[18px]">Live activity</h3>
      <ol ref={ref} className="scroll-dark m-0 max-h-72 list-none overflow-y-auto p-0">
        {events.map((e) => (
          <li key={e.id} className="log-line" data-kind={e.tone}>
            <span className="log-time">{e.at}</span>
            <span className="log-glyph" aria-hidden>{TONE_GLYPH[e.tone]}</span>
            {e.pid ? (
              <button onClick={() => onPick(e.pid!)} className="cursor-pointer border-0 bg-transparent p-0 text-left hover:underline" style={{ font: "inherit", color: "inherit" }}>
                {maskPhonesIn(e.text)}
              </button>
            ) : (
              <span>{maskPhonesIn(e.text)}</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
