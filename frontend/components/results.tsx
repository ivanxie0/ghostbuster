"use client";
// Results "mission control" pieces. Pure presentation — data comes in via props from app/results/[id].
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import {
  CONFIRMED_GHOST_STYLE, PLAN_LABEL, SPECIALTY_PLURAL, STATUS_STYLE, deadlineText, isConfirmedGhost, isDemoProvider, longDate, maskPhone, maskPhonesIn, profileCheck, checkedDate, isRealCallUpdate, honestReason, hadProfileCheck,
  shortDate, waitVsDeadline, wasCalled,
} from "@/lib/format";
import type { GhostStatus, Provider, Search, SearchDetail } from "@/lib/types";

// ---------------------------------------------------------------- activity log model
// focus: the results page auto-selects this provider (call results; not directory ghosts)
export type LogEvent = { id: number; at: string; text: string; tone: GhostStatus | "info" | "user" | "fallback"; pid?: string; focus?: boolean };

const TONE_DOT: Record<LogEvent["tone"], string> = {
  info: "bg-ink/35",
  fallback: "bg-sun",
  user: "bg-ink",
  ghost: "bg-ink/25",
  unverified: "bg-ink/60",
  calling: "bg-cobalt animate-pulse",
  available: "bg-moss",
  violation: "bg-signal",
  no_answer: "bg-sun",
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
          : { tone: "ghost", pid: p.id, text: `Ghost: ${name} — ${reason ?? "not accepting"}` });
        break;
      case "available":
        out.push({ tone: "available", pid: p.id, focus: true, text: `${name}: ${reason ?? `earliest ${shortDate(p.earliest_date)} — ${w?.wait} (limit ${w?.limit})`}. Within the deadline ✓` });
        break;
      case "violation":
        out.push({ tone: "violation", pid: p.id, focus: true, text: `${name}: ${reason ?? `earliest ${shortDate(p.earliest_date)} — ${w?.wait} (limit ${w?.limit})`}. Past legal deadline` });
        break;
      case "no_answer":
        out.push({ tone: "no_answer", pid: p.id, focus: true, text: `${name}: ${reason ?? "no answer"}` });
        break;
    }
  }
  const callable = next.providers.filter((p) => p.ghost_status === "unverified").length;
  if (prev?.search.status === "scraping" && s.status === "verifying" && !next.providers.some((p) => p.ghost_status === "calling")) {
    const ghosts = next.providers.filter((p) => p.ghost_status === "ghost").length;
    out.push({ tone: "info", text: `${ghosts} ghosts flagged. ${callable} offices look real — waiting for your OK to call.` });
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
  const [label, cls] =
    status === "scraping" ? ["Finding providers", "border-line bg-paper text-ink"]
    : status === "done" ? ["Complete", "border-ink bg-ink text-paper"]
    : calling ? ["Calling offices", "border-cobalt bg-cobalt text-char"]
    : ["Ready to call", "border-sun/35 bg-sun/10 text-sun"];
  return (
    <span key={label} className={`flip-in inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold ${cls}`}>
      {status !== "done" && <span className="h-2 w-2 animate-pulse rounded-full bg-current" />}
      {label}
    </span>
  );
}

/** ASCII bar: filled blocks for value out of total. */
function asciiBar(value: number, total: number, width = 12) {
  const n = total > 0 ? Math.round((value / total) * width) : 0;
  return "█".repeat(n) + "░".repeat(width - n);
}

/** One quotable number: "5 of 10 listings appear unavailable". Real registry providers aren't insurer
 *  listings, so the noun is "listings" only when every provider is demo data. */
export function GhostRate({ providers }: { providers: Provider[] }) {
  if (!providers.length) return null;
  const unavailable = providers.filter((p) => p.ghost_status === "ghost").length;
  const noun = providers.every(isDemoProvider) ? "listings" : "providers";
  return (
    <p className="display text-4xl leading-tight sm:text-5xl" aria-live="polite">
      <span key={unavailable} className="flip-in inline-block italic text-accent tabular-nums">{unavailable}</span>
      <span className="tabular-nums"> of {providers.length}</span> {noun} <span className="text-ink/55">appear unavailable.</span>
    </p>
  );
}

/** Tally sheet: one ruled strip, big numerals, ASCII bars scaled to the number listed. */
/** Ghost funnel, from existing data: found → profiles found online → appear unavailable → reached → timely. */
export function GhostFunnel({ providers }: { providers: Provider[] }) {
  const steps = [
    { label: "providers found", value: providers.length, tone: "bg-ink/70" },
    { label: "profiles found online", value: providers.filter(hadProfileCheck).length, tone: "bg-cobalt/80" },
    { label: "appear unavailable", value: providers.filter((p) => p.ghost_status === "ghost").length, tone: "bg-ink/40" },
    { label: "offices reached", value: providers.filter(wasCalled).length, tone: "bg-cobalt" },
    { label: "timely appointment", value: providers.filter((p) => p.ghost_status === "available").length, tone: "bg-moss" },
  ];
  const max = Math.max(1, steps[0].value);
  return (
    <section aria-label="Ghost funnel" className="card mt-6 p-5 sm:p-6">
      <p className="label text-ink/60">The funnel</p>
      <ol className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-5">
        {steps.map((s, i) => (
          <li key={s.label} className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="display text-5xl tabular-nums sm:text-6xl">{s.value}</span>
              {i < steps.length - 1 && <span aria-hidden className="hidden text-2xl text-ink/30 sm:inline">→</span>}
            </div>
            <div className="mt-1 text-base text-ink/75">{s.label}</div>
            <div className="mt-2 h-2 w-full rounded-full bg-ink/10" aria-hidden>
              <div className={`h-2 rounded-full ${s.tone}`} style={{ width: `${(100 * s.value) / max}%` }} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Counters({ providers }: { providers: Provider[] }) {
  const n = (s: GhostStatus) => providers.filter((p) => p.ghost_status === s).length;
  const total = providers.length;
  const cols = [
    { label: "listed", value: total, tone: "text-ink", bar: "text-ink/35" },
    { label: "ghosts", value: n("ghost"), tone: "text-ink/50", bar: "text-ink/30" },
    { label: "checked by phone", value: providers.filter(wasCalled).length, tone: "text-cobalt", bar: "text-cobalt/70" },
    { label: "past deadline", value: n("violation"), tone: "text-signal", bar: "text-signal/80" },
  ];
  return (
    <section aria-label="Tally">
      <div aria-hidden className="overflow-hidden whitespace-nowrap font-mono text-xs text-ink/40">+-- TALLY {"-".repeat(160)}</div>
      <div className="grid grid-cols-2 md:grid-cols-4">
        {cols.map((c, i) => (
          <div key={c.label} className={`px-4 py-4 ${i % 2 ? "border-l" : ""} ${i > 0 ? "md:border-l" : ""} border-dashed border-ink/20`}>
            <div key={c.value} className={`flip-in display text-6xl tabular-nums ${c.tone}`}>{c.value}</div>
            <div className="mt-1 font-mono text-xs text-ink/60">{c.label}</div>
            <div aria-hidden className={`mt-2 font-mono text-[11px] tracking-tighter ${c.bar}`}>{asciiBar(c.value, total)}</div>
          </div>
        ))}
      </div>
      <div aria-hidden className="overflow-hidden whitespace-nowrap font-mono text-xs text-ink/40">+{"-".repeat(170)}</div>
    </section>
  );
}

// ---------------------------------------------------------------- consent
export function ConsentCard({ search, count, skipped = 0, onApprove, busy }: { search: Search; count: number; skipped?: number; onApprove: () => void; busy: boolean }) {
  return (
    <section className="rise card border-cobalt/40 p-6 ring-4 ring-cobalt/10 sm:p-8">
      <p className="label text-cobalt">Your permission needed</p>
      <h2 className="display mt-2 text-3xl sm:text-4xl">
        Want us to call {skipped > 0 ? `the ${count} demo ${count === 1 ? "office" : "offices"}` : `the ${count} remaining ${count === 1 ? "office" : "offices"}`}?
      </h2>
      {skipped > 0 && (
        <p className="mt-2 text-lg text-ink/80">
          The other {skipped} {skipped === 1 ? "is a public-registry provider" : "are public-registry providers"} and won&apos;t be called during this demo.
        </p>
      )}
      <p className="mt-4 text-lg text-ink/80">
        With your permission, our AI assistant will act as your <b>authorized representative</b> and phone each office
        below. It will:
      </p>
      <ul className="mt-3 space-y-1.5 text-lg text-ink/80">
        <li>✓ say at the start of the call that it&apos;s an <b>AI assistant calling on behalf of a patient</b> and that the call is being recorded and transcribed</li>
        <li>✓ ask only for the <b>earliest opening, in person or by telehealth</b>, with {search.insurer} {PLAN_LABEL[search.plan_type]}</li>
        <li>✓ <b>not</b> share your name, contact info, or health details</li>
      </ul>
      <p className="mt-3 text-lg text-ink/80">
        Calls are <b>recorded and transcribed</b> so the transcript can go in your evidence log.
      </p>
      <p className="rule-dotted mt-4 pt-3 text-sm text-ink/60">Hackathon demo: calls only go to our own team&apos;s test phones.</p>
      <p className="mt-1 text-sm text-ink/60">We don&apos;t store your name or health details; delete your search anytime.</p>
      <button
        onClick={onApprove}
        disabled={busy}
        className="btn btn-solid btn-lg mt-6"
      >
        {busy ? "Starting calls…" : `Yes, check these ${count} for me`}
      </button>
    </section>
  );
}

// ---------------------------------------------------------------- endings
/** Rubber stamp for the verdict. */
function Stamp({ tone, top, bottom }: { tone: "signal" | "moss"; top: string; bottom: string }) {
  const c = tone === "signal" ? "border-signal text-signal" : "border-moss text-moss";
  return (
    <div aria-hidden className={`stamp inline-block rounded-md border-[3px] border-double px-5 py-3 text-center font-mono uppercase ${c}`}>
      <div className="text-2xl font-bold tracking-[0.18em]">{top}</div>
      <div className="mt-1 border-t border-current pt-1 text-[11px] tracking-[0.25em] opacity-80">{bottom}</div>
    </div>
  );
}

/** Dotted-leader ledger row: "past legal deadline ........ 4". */
function Ledger({ rows }: { rows: { k: string; v: React.ReactNode; tone?: string }[] }) {
  return (
    <dl className="mt-8 space-y-2.5 font-mono text-sm">
      {rows.map((r) => (
        <div key={r.k} className="flex items-baseline gap-2">
          <dt className="text-ink/65">{r.k}</dt>
          <span aria-hidden className="mb-1 flex-1 border-b border-dotted border-ink/30" />
          <dd className={`text-right font-semibold tabular-nums ${r.tone ?? "text-ink"}`}>{r.v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Verdict({ tone, rule, children, aside }: { tone: "signal" | "moss"; rule: string; children: React.ReactNode; aside: React.ReactNode }) {
  const rail = tone === "signal" ? "bg-signal" : "bg-moss";
  const text = tone === "signal" ? "text-signal/80" : "text-moss/80";
  return (
    <section className="rise relative overflow-hidden rounded-2xl border border-line bg-paper">
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1.5 ${rail}`} />
      <div aria-hidden className={`overflow-hidden whitespace-nowrap px-8 pt-5 font-mono text-xs ${text}`}>+-- {rule} {"-".repeat(160)}</div>
      <div className="grid gap-10 px-8 pb-8 pt-6 lg:grid-cols-12">
        <div className="lg:col-span-7">{children}</div>
        <div className="lg:col-span-5 lg:border-l lg:border-dashed lg:border-ink/20 lg:pl-10">{aside}</div>
      </div>
    </section>
  );
}

export function EndingA({ search, provider, id, violations }: { search: Search; provider: Provider; id: string; violations: number }) {
  const w = waitVsDeadline(search, provider);
  return (
    <Verdict
      tone="moss"
      rule="FINDING · APPOINTMENT AVAILABLE"
      aside={
        <>
          <Stamp tone="moss" top="In time" bottom={`limit ${w?.limit ?? deadlineText(search)}`} />
          <Ledger
            rows={[
              { k: "earliest opening", v: shortDate(provider.earliest_date) },
              { k: "wait", v: w?.wait ?? "—", tone: "text-moss" },
              { k: "legal limit", v: w?.limit ?? deadlineText(search) },
              ...(violations > 0 ? [{ k: "other offices past deadline", v: violations, tone: "text-signal" }] : []),
            ]}
          />
        </>
      }
    >
      <p className="label text-moss">Good news</p>
      <h2 className="display mt-3 text-4xl sm:text-5xl">
        {provider.name} can see you <span className="italic text-moss">{longDate(provider.earliest_date)}</span>.
      </h2>
      <p className="mt-4 text-xl text-ink/85">
        That&apos;s <b>{w?.wait}</b> away — within the legal limit of {w?.limit}.
      </p>
      {provider.address && <p className="mt-2 text-base text-ink/60">{provider.address}</p>}
      <div className="mt-7 flex flex-wrap items-center gap-4">
        <a
          href={provider.phone ? `tel:${provider.phone}` : provider.source_url ?? "#"}
          target={provider.phone ? undefined : "_blank"}
          rel="noreferrer"
          className="btn btn-solid btn-lg"
        >
          {provider.phone ? `Call to book · ${maskPhone(provider.phone)}` : "Book this appointment →"}
        </a>
        {violations > 0 && (
          <Link href={`/packet/${id}`} className="btn">
            Save the evidence log anyway
          </Link>
        )}
      </div>
      <p className="mt-6 font-mono text-xs leading-relaxed text-ink/55">
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
  const selfFunded = search.plan_type === "ppo" || search.plan_type === "unknown";
  const packet = ["Evidence log of every call", `Grievance letter to ${search.insurer}`, "Member-services phone script", "Next steps with the DMHC"];
  return (
    <Verdict
      tone="signal"
      rule="FINDING · NO TIMELY APPOINTMENT"
      aside={
        <>
          <Stamp tone="signal" top="Past deadline" bottom={`limit ${deadlineText(search)}`} />
          <Ledger
            rows={[
              { k: "offices reached", v: checked },
              { k: "past legal deadline", v: n("violation"), tone: "text-signal" },
              ...(confirmed > 0 ? [{ k: "not taking plan / new patients", v: confirmed, tone: "text-signal" }] : []),
              { k: "no answer", v: n("no_answer") },
              { k: "others appear unavailable", v: listedGhosts, tone: "text-ink/60" },
              { k: "legal limit", v: deadlineText(search) },
            ]}
          />
        </>
      }
    >
      <p className="label text-signal">Timely access grievance ready</p>
      <h2 className="display mt-3 text-4xl sm:text-5xl">
        No provider we reached could offer a <span className="italic text-signal">timely</span> appointment.
      </h2>
      <p className="mt-4 text-xl leading-snug text-ink/85">
        You can now ask your plan to arrange timely care, including out-of-network at in-network cost.
      </p>
      <p className="label mt-8 text-ink/55">Your packet</p>
      <ul className="mt-3 space-y-1.5 font-mono text-sm text-ink/85">
        {packet.map((x) => (
          <li key={x}>
            <span className="text-accent">[x]</span> {x}
          </li>
        ))}
      </ul>
      {selfFunded && (
        <p className="notice mt-5 p-3 text-sm">
          If your PPO is a self-funded employer plan, these California rules may not apply — the call log is still useful evidence.
        </p>
      )}
      <div className="mt-7 flex flex-wrap items-center gap-5">
        <Link href={`/packet/${id}`} className="btn btn-solid btn-lg">
          Open grievance packet <span aria-hidden>→</span>
        </Link>
        <span className="text-sm text-ink/55">Evidence log + template, not legal advice.</span>
      </div>
    </Verdict>
  );
}

// ---------------------------------------------------------------- provider list
function rowDetail(search: Search, p: Provider) {
  const w = waitVsDeadline(search, p);
  switch (p.ghost_status) {
    case "ghost": return <span className="text-ink/55">{maskPhonesIn(profileCheck(p)?.text ?? honestReason(p.ghost_reason))}</span>;
    case "unverified": return <span className="text-ink/60">{maskPhonesIn(profileCheck(p)?.text ?? p.ghost_reason ?? "Looks real — not called yet")}</span>;
    case "calling": return <span className="text-cobalt">AI assistant is on the line…</span>;
    case "no_answer": return <span className="text-ink/80">{maskPhonesIn(p.ghost_reason ?? "No answer")}</span>;
    default:
      return (
        <span className={STATUS_STYLE[p.ghost_status].text}>
          Earliest <b>{shortDate(p.earliest_date)}</b> · <b>{w?.wait}</b> <span className="text-ink/55">vs {w?.limit} limit</span>
        </span>
      );
  }
}

/** "Demo data — fictional providers" tag so realistic seed names can't be mistaken for real offices. */
export function DemoDataTag({ providers }: { providers: Provider[] }) {
  const demo = providers.filter(isDemoProvider).length;
  if (!demo) return null;
  const all = demo === providers.length;
  return (
    <span className="notice inline-flex items-center gap-2 !rounded-full px-3 py-1 text-xs font-semibold">
      ⚑ {all ? "Demo data — fictional providers" : `Includes ${demo} fictional demo providers (marked)`}
    </span>
  );
}

/** Jai's legal caveats — always visible on results. */
export function LegalNote() {
  return (
    <p className="border-l-2 border-accent/70 pl-4 text-sm leading-relaxed text-ink/70">
      <span className="mr-2 font-mono text-xs font-semibold uppercase tracking-wider text-accent-deep">Note</span>A provider can lawfully
      set a longer wait if they note in your record that it won&apos;t harm your health. Telehealth appointments count.
    </p>
  );
}

/** Inline "Report an error" form for a real provider row (e.g. the provider correcting their status). */
function ReportError({ onReport }: { onReport: (what: string, contact: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [what, setWhat] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="mt-1 ml-5 font-mono text-xs text-ink/55 underline underline-offset-2 hover:text-ink">
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
    <form onSubmit={submit} className="mt-2 ml-5 space-y-2 rounded-lg border border-line p-3 text-sm">
      <label className="block">
        <span className="label text-ink/60">What&apos;s wrong?</span>
        <textarea value={what} onChange={(e) => setWhat(e.target.value)} rows={2} maxLength={1000}
          className="mt-1 w-full rounded border border-line bg-paper px-2 py-1 text-ink" placeholder="e.g. I'm accepting new patients with this plan" />
      </label>
      <label className="block">
        <span className="label text-ink/60">Contact (optional)</span>
        <input value={contact} onChange={(e) => setContact(e.target.value)} maxLength={200}
          className="mt-1 w-full rounded border border-line bg-paper px-2 py-1 text-ink" placeholder="email or phone" />
      </label>
      <div className="flex items-center gap-3">
        <button disabled={busy} className="btn btn-solid px-3 py-1 text-sm">{busy ? "Sending…" : "Send report"}</button>
        <button type="button" onClick={() => setOpen(false)} className="text-ink/60 underline underline-offset-2">Cancel</button>
        {error && <span className="text-signal">{error}</span>}
      </div>
    </form>
  );
}

export function ProviderList({ search, providers, selected, onSelect, confirmedIds = [], reviewIds = [], onReport }: {
  search: Search; providers: Provider[]; selected: string | null; onSelect: (id: string) => void;
  confirmedIds?: string[]; reviewIds?: string[]; onReport?: (providerId: string, what: string, contact: string) => Promise<void>;
}) {
  const mixed = providers.some(isDemoProvider) && !providers.every(isDemoProvider);
  return (
    <ul className="space-y-3">
      {providers.map((p) => {
        const st = STATUS_STYLE[p.ghost_status];
        const confirmed = isConfirmedGhost(p);
        return (
          <li key={p.id} className="slide-in">
            <button
              onClick={() => onSelect(p.id)}
              aria-pressed={selected === p.id}
              className={`relative w-full rounded-xl border px-5 py-4 text-left transition-all duration-500 ${confirmed ? CONFIRMED_GHOST_STYLE.row : st.row} ${
                selected === p.id ? "outline outline-2 outline-offset-2 outline-ink/70" : "hover:border-ink/40 hover:shadow-sm"
              }`}
            >
              {p.ghost_status !== "unverified" && (
                <span key={p.ghost_status} className="flash pointer-events-none absolute inset-0 rounded-xl" style={{ ["--flash" as string]: st.flash }} />
              )}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className={`truncate text-lg font-semibold ${p.ghost_status === "ghost" ? "line-through decoration-ink/40 decoration-1" : ""}`}>
                    {p.name}
                    {mixed && isDemoProvider(p) && (
                      <span className="notice ml-2 inline-block align-middle !rounded px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide no-underline">Demo</span>
                    )}
                  </div>
                  <div className="mt-0.5 text-base leading-snug">
                    {rowDetail(search, p)}
                    {confirmedIds.includes(p.id) && <span className="ml-2 text-moss">· date confirmed by patient</span>}
                  </div>
                </div>
                <StatusBadge status={p.ghost_status} confirmed={confirmed} />
              </div>
            </button>
            {(() => {
              // Real ghost from the public-profile check: show where it came from (link sits outside the button).
              const pc = profileCheck(p);
              const url = isDemoProvider(p) ? null : pc?.url ?? (p.ghost_status === "ghost" ? p.source_url : null);
              if (!url) return null;
              const when = checkedDate(p.checked_at);
              return (
                <span className="mt-1 ml-5 inline-flex flex-wrap items-center gap-1.5 font-mono text-xs">
                  <a href={url} target="_blank" rel="noreferrer" className="text-cobalt underline underline-offset-2">
                    {pc ? `✓ Profile checked · ${pc.host ?? "source"} ↗` : "Source ↗"}
                  </a>
                  {when && <span className="text-ink/55">· checked {when}</span>}
                </span>
              );
            })()}
            {/* Real (registry) providers only: anyone, incl. the provider, can report an error. */}
            {!isDemoProvider(p) && (reviewIds.includes(p.id) ? (
              <span className="mt-1 ml-5 inline-block rounded border border-line px-2 py-0.5 font-mono text-xs text-ink/70">Under review</span>
            ) : onReport ? (
              <div><ReportError onReport={(what, contact) => onReport(p.id, what, contact)} /></div>
            ) : null)}
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------- right pane
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
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-sm">
      {!editing ? (
        <>
          <span className={confirmed ? "text-moss" : "text-ink/65"}>
            {confirmed ? "✓ Date confirmed by patient" : "Extracted from the call. Is this right?"}
          </span>
          <button onClick={() => { setValue(provider.earliest_date ?? ""); setEditing(true); }} className="text-cobalt underline underline-offset-2">
            Edit
          </button>
        </>
      ) : (
        <>
          <label className="sr-only" htmlFor={`date-${provider.id}`}>Correct appointment date</label>
          <input id={`date-${provider.id}`} type="date" value={value} onChange={(e) => setValue(e.target.value)}
            className="rounded border border-line bg-paper px-2 py-1 text-ink [color-scheme:dark]" />
          <button onClick={save} disabled={saving} className="btn btn-solid px-3 py-1 text-sm">{saving ? "Saving…" : "Save"}</button>
          <button onClick={() => setEditing(false)} className="text-ink/60 underline underline-offset-2">Cancel</button>
          {error && <span className="text-signal">{error}</span>}
        </>
      )}
    </div>
  );
}

export function TranscriptPanel({ search, provider, confirmed = false, onCorrect }: {
  search: Search; provider: Provider | null; confirmed?: boolean; onCorrect?: (date: string) => Promise<void>;
}) {
  if (!provider)
    return (
      <div className="flex h-full min-h-48 items-center justify-center rounded-xl border border-dashed border-ink/25 bg-paper p-6 text-center text-base text-ink/55">
        Select a provider to see their details and call transcript.
      </div>
    );
  const w = waitVsDeadline(search, provider);
  // Skip empty turns (e.g. "Agent: " left after TTS tags are stripped).
  const lines = (provider.call_transcript ?? "").split("\n").filter((l) => l.replace(/^(Agent|Office):\s*/, "").trim());
  return (
    <div className="window">
      <div className="window-bar"><span>Call transcript</span></div>
      <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="display text-2xl">{provider.name}</h3>
          <p className="mt-1.5 text-sm text-ink/60">
            {[maskPhone(provider.phone), provider.address].filter(Boolean).join(" · ")}
          </p>
        </div>
        <StatusBadge status={provider.ghost_status} big confirmed={isConfirmedGhost(provider)} />
      </div>

      {w && provider.earliest_date && (
        <div className={`mt-4 grid grid-cols-2 gap-3 rounded-lg border p-3 ${provider.violation ? "border-signal/40 bg-signal/10" : "border-moss/50 bg-moss/10"}`}>
          <div>
            <div className="label text-ink/60">Wait</div>
            <div className={`display text-2xl ${provider.violation ? "text-signal" : "text-moss"}`}>{w.wait}</div>
          </div>
          <div>
            <div className="label text-ink/60">Legal limit</div>
            <div className="display text-2xl text-ink">{w.limit}</div>
          </div>
        </div>
      )}
      {provider.earliest_date && onCorrect && (
        <DateCheck key={provider.id + (provider.earliest_date ?? "")} provider={provider} confirmed={confirmed} onCorrect={onCorrect} />
      )}

      <div className="scroll-dark mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
        {provider.ghost_status === "calling" && (
          <div className="flex items-center gap-4 rounded-lg border border-cobalt/40 bg-cobalt/10 p-4 text-cobalt">
            <span className="eq" aria-hidden><span /><span /><span /><span /><span /></span>
            <span className="text-base font-semibold">Live call in progress — transcript arrives when the call ends.</span>
          </div>
        )}
        {provider.ghost_status === "ghost" && wasCalled(provider) && (
          <p className="rounded-lg border border-signal/40 bg-signal/10 p-3 text-base text-ink">
            Confirmed on the call: <b>not accepting this plan/new patients.</b>
          </p>
        )}
        {provider.ghost_status === "ghost" && !wasCalled(provider) && (
          <p className="text-base text-ink/80">
            Not called — flagged as a ghost:{" "}
            <b>{maskPhonesIn(profileCheck(provider)?.text ?? provider.ghost_reason ?? "")}</b>.{" "}
            {profileCheck(provider)?.url ? (
              <a href={profileCheck(provider)!.url!} target="_blank" rel="noreferrer" className="text-cobalt underline underline-offset-2">
                Profile checked · {profileCheck(provider)!.host ?? "source"} ↗
              </a>
            ) : (
              provider.source_url && !isDemoProvider(provider) && (
                <a href={provider.source_url} target="_blank" rel="noreferrer" className="text-cobalt underline underline-offset-2">Source</a>
              )
            )}
            {checkedDate(provider.checked_at) && <span className="text-ink/55"> · checked {checkedDate(provider.checked_at)}</span>}
          </p>
        )}
        {provider.ghost_status === "unverified" && <p className="text-base text-ink/55">Not called yet.</p>}
        {lines.map((l, i) => {
          if (l.startsWith("Result:")) {
            return (
              <div key={i} className="slide-in border-l-4 border-cobalt bg-cobalt/5 px-4 py-2.5 font-mono text-sm leading-snug text-ink" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="mb-1 text-[0.62rem] font-semibold uppercase tracking-widest text-cobalt">Extracted from the call</div>
                {maskPhonesIn(l.replace(/^Result:\s*/, ""))}
              </div>
            );
          }
          const text = maskPhonesIn(l.replace(/^(Agent|Office):\s*/, ""));
          const system = text.startsWith("("); // e.g. "(no answer — voicemail box full)"
          const office = !system && l.startsWith("Office:");
          const agent = !system && l.startsWith("Agent:");
          return (
            <div key={i} className={`slide-in flex ${office ? "justify-end" : "justify-start"}`} style={{ animationDelay: `${i * 80}ms` }}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-base leading-snug ${
                office ? "rounded-br-md bg-ink/6 text-ink" : agent ? "rounded-bl-md bg-cobalt text-paper" : "bg-page text-ink/60 italic"
              }`}>
                {(office || agent) && <div className="mb-0.5 text-[0.68rem] font-semibold uppercase tracking-wider opacity-70">{office ? "Office" : "AI assistant"}</div>}
                {text}
              </div>
            </div>
          );
        })}
      </div>
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
    <div className="window">
      <h3 className="window-bar"><span>Live activity</span></h3>
      <ol ref={ref} className="scroll-dark max-h-72 space-y-2 overflow-y-auto p-4 font-mono">
        {events.map((e) => (
          <li key={e.id} className="slide-in flex gap-3 text-[0.8rem] leading-snug">
            <span className="shrink-0 tabular-nums text-ink/45">{e.at}</span>
            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${TONE_DOT[e.tone]}`} />
            {e.pid ? (
              <button onClick={() => onPick(e.pid!)} className="text-left text-ink underline-offset-2 hover:underline">{maskPhonesIn(e.text)}</button>
            ) : (
              <span className={e.tone === "user" ? "font-bold text-ink" : "text-ink/70"}>{maskPhonesIn(e.text)}</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
