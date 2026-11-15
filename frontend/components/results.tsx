"use client";
// Results "mission control" pieces. Pure presentation — data comes in via props from app/results/[id].
import Link from "next/link";
import { useEffect, useRef } from "react";
import StatusBadge from "@/components/StatusBadge";
import {
  CONFIRMED_GHOST_STYLE, PLAN_LABEL, SPECIALTY_LABEL, STATUS_STYLE, deadlineText, isConfirmedGhost, isDemoProvider, longDate,
  shortDate, waitVsDeadline, wasCalled,
} from "@/lib/format";
import type { GhostStatus, Provider, Search, SearchDetail } from "@/lib/types";

// ---------------------------------------------------------------- activity log model
// focus: the results page auto-selects this provider (call results; not directory ghosts)
export type LogEvent = { id: number; at: string; text: string; tone: GhostStatus | "info" | "user"; pid?: string; focus?: boolean };

const TONE_DOT: Record<LogEvent["tone"], string> = {
  info: "bg-zinc-400",
  user: "bg-white",
  ghost: "bg-zinc-500",
  unverified: "bg-sky-400",
  calling: "bg-indigo-400 animate-pulse",
  available: "bg-emerald-400",
  violation: "bg-red-500",
  no_answer: "bg-amber-400",
};

/** Turn the difference between two polls into human-readable log lines. */
export function diffEvents(prev: SearchDetail | null, next: SearchDetail): Omit<LogEvent, "id" | "at">[] {
  const out: Omit<LogEvent, "id" | "at">[] = [];
  const s = next.search;
  if (!prev) {
    out.push({ tone: "info", text: `Searching the ${s.insurer} directory for ${SPECIALTY_LABEL[s.specialty].toLowerCase()}s near ${s.zip}` });
  }
  if ((prev?.providers.length ?? 0) === 0 && next.providers.length > 0) {
    out.push({ tone: "info", text: `Found ${next.providers.length} listed providers. Cross-checking public profiles…` });
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
          ? { tone: "ghost", pid: p.id, focus: true, text: `${name}: ${reason ?? "listed, but not accepting this plan/new patients"}` }
          : { tone: "ghost", pid: p.id, text: `Ghost listing: ${name} — ${reason ?? "not accepting"}` });
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
  if (prev && prev.search.status !== "done" && s.status === "done") out.push({ tone: "info", text: "All calls complete." });
  return out;
}

// ---------------------------------------------------------------- header + counters
export function PhasePill({ detail }: { detail: SearchDetail }) {
  const { status } = detail.search;
  const calling = detail.providers.some((p) => p.ghost_status === "calling");
  const [label, cls] =
    status === "scraping" ? ["Scanning directory", "bg-sky-500/20 text-sky-200 ring-sky-400/60"]
    : status === "done" ? ["Complete", "bg-zinc-100 text-zinc-900 ring-white"]
    : calling ? ["Calling offices", "bg-indigo-500/25 text-indigo-100 ring-indigo-400"]
    : ["Ready to call", "bg-amber-500/20 text-amber-100 ring-amber-400/70"];
  return (
    <span key={label} className={`flip-in inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-base font-bold ring-2 ${cls}`}>
      {status !== "done" && <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-current" />}
      {label}
    </span>
  );
}

function Counter({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 px-5 py-4">
      <div key={value} className={`flip-in text-5xl font-extrabold tabular-nums sm:text-6xl ${tone}`}>{value}</div>
      <div className="mt-1 text-base font-semibold uppercase tracking-wider text-zinc-400">{label}</div>
    </div>
  );
}

export function Counters({ providers }: { providers: Provider[] }) {
  const n = (s: GhostStatus) => providers.filter((p) => p.ghost_status === s).length;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Counter label="Listed" value={providers.length} tone="text-white" />
      <Counter label="Ghosts" value={n("ghost")} tone="text-zinc-300" />
      <Counter label="Checked" value={providers.filter(wasCalled).length} tone="text-sky-300" />
      <Counter label="Past deadline" value={n("violation")} tone="text-red-400" />
    </div>
  );
}

// ---------------------------------------------------------------- consent
export function ConsentCard({ search, count, onApprove, busy }: { search: Search; count: number; onApprove: () => void; busy: boolean }) {
  return (
    <section className="rise rounded-3xl border-2 border-indigo-400 bg-indigo-950/50 p-6 sm:p-8">
      <h2 className="text-3xl font-extrabold">Want us to call the {count} remaining offices?</h2>
      <p className="mt-3 text-xl text-zinc-200">
        With your permission, our AI assistant will act as your <b>authorized representative</b> and phone each office
        below. It will:
      </p>
      <ul className="mt-3 space-y-1.5 text-lg text-zinc-200">
        <li>✓ say at the start of the call that it&apos;s an <b>AI assistant calling on behalf of a patient</b> and that the call is being transcribed</li>
        <li>✓ ask only for the <b>earliest opening, in person or by telehealth</b>, with {search.insurer} {PLAN_LABEL[search.plan_type]}</li>
        <li>✓ <b>not</b> share your name, contact info, or health details</li>
      </ul>
      <p className="mt-3 text-lg text-zinc-200">
        Calls are <b>recorded and transcribed</b> so the transcript can go in your evidence log.
      </p>
      <p className="mt-3 text-base text-indigo-200/80">Hackathon demo: calls only go to our own team&apos;s test phones.</p>
      <button
        onClick={onApprove}
        disabled={busy}
        className="mt-6 rounded-2xl bg-indigo-500 px-8 py-4 text-2xl font-bold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400 disabled:opacity-60"
      >
        {busy ? "Starting calls…" : `Yes, check these ${count} for me`}
      </button>
    </section>
  );
}

// ---------------------------------------------------------------- endings
export function EndingA({ search, provider, id, violations }: { search: Search; provider: Provider; id: string; violations: number }) {
  const w = waitVsDeadline(search, provider);
  return (
    <section className="rise rounded-3xl border-2 border-emerald-400 bg-emerald-950/60 p-6 sm:p-8">
      <p className="text-lg font-bold uppercase tracking-widest text-emerald-300">Good news</p>
      <h2 className="mt-1 text-4xl font-extrabold leading-tight sm:text-5xl">
        {provider.name} can see you {longDate(provider.earliest_date)}.
      </h2>
      <p className="mt-3 text-2xl text-emerald-100">
        That&apos;s <b>{w?.wait}</b> away — within the legal limit of {w?.limit}.
      </p>
      {provider.address && <p className="mt-2 text-lg text-emerald-200/80">{provider.address}</p>}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <a
          href={provider.phone ? `tel:${provider.phone}` : provider.source_url ?? "#"}
          target={provider.phone ? undefined : "_blank"}
          rel="noreferrer"
          className="rounded-2xl bg-emerald-400 px-8 py-4 text-2xl font-bold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-300"
        >
          {provider.phone ? `📞 Call to book · ${provider.phone}` : "📅 Book this appointment →"}
        </a>
        {violations > 0 && (
          <Link href={`/packet/${id}`} className="rounded-2xl border-2 border-emerald-300/50 px-6 py-4 text-lg font-semibold text-emerald-100 hover:bg-emerald-900/50">
            Save the evidence log anyway
          </Link>
        )}
      </div>
      <p className="mt-4 text-base text-emerald-200/70">
        Tip: say you&apos;re a {search.insurer} {PLAN_LABEL[search.plan_type]} member and ask for the {shortDate(provider.earliest_date)} new-patient slot.
      </p>
    </section>
  );
}

export function EndingB({ detail, id }: { detail: SearchDetail; id: string }) {
  const { search, providers } = detail;
  const n = (s: GhostStatus) => providers.filter((p) => p.ghost_status === s).length;
  const checked = providers.filter(wasCalled).length;
  const confirmed = providers.filter(isConfirmedGhost).length;
  const listedGhosts = n("ghost") - confirmed;
  const selfFunded = search.plan_type === "ppo" || search.plan_type === "unknown";
  return (
    <section className="rise rounded-3xl border-2 border-red-500 bg-red-950/60 p-6 sm:p-8">
      <p className="text-lg font-bold uppercase tracking-widest text-red-300">Timely access grievance ready</p>
      <h2 className="mt-1 text-4xl font-extrabold leading-tight sm:text-5xl">
        No provider we reached could offer a timely appointment.
      </h2>
      <p className="mt-3 text-2xl font-semibold leading-snug text-white">
        Under California law, your plan must now arrange timely care, including out-of-network at in-network cost.
      </p>
      <p className="mt-4 text-xl leading-snug text-red-100">
        Legal limit: {deadlineText(search)}. Of {checked} offices we reached, <b>{n("violation")}</b> were past the legal
        deadline{confirmed > 0 && <>, <b>{confirmed}</b> said they aren&apos;t taking this plan or new patients</>}, and{" "}
        <b>{n("no_answer")}</b> didn&apos;t answer. <b>{listedGhosts}</b> more listings appear unavailable.
      </p>
      <p className="mt-2 text-lg text-red-100/80">
        Your packet has the evidence log, a grievance letter to {search.insurer}, a phone script, and next steps with the DMHC.
      </p>
      {selfFunded && (
        <p className="mt-3 rounded-xl border border-amber-500/70 bg-amber-950/50 p-3 text-lg text-amber-100">
          If your PPO is a self-funded employer plan, these California rules may not apply — the call log is still useful evidence.
        </p>
      )}
      <Link href={`/packet/${id}`} className="mt-6 inline-block rounded-2xl bg-white px-8 py-4 text-2xl font-bold text-red-700 shadow-lg transition hover:bg-red-50">
        ⬇ Download grievance packet
      </Link>
      <p className="mt-3 text-base text-red-200/70">Evidence log + template, not legal advice.</p>
    </section>
  );
}

// ---------------------------------------------------------------- provider list
function rowDetail(search: Search, p: Provider) {
  const w = waitVsDeadline(search, p);
  switch (p.ghost_status) {
    case "ghost": return <span className="text-zinc-400">{p.ghost_reason}</span>;
    case "unverified": return <span className="text-zinc-400">Looks real — not called yet</span>;
    case "calling": return <span className="text-indigo-200">AI assistant is on the line…</span>;
    case "no_answer": return <span className="text-amber-200">{p.ghost_reason ?? "No answer"}</span>;
    default:
      return (
        <span className={STATUS_STYLE[p.ghost_status].text}>
          Earliest <b>{shortDate(p.earliest_date)}</b> · <b>{w?.wait}</b> <span className="text-zinc-400">vs {w?.limit} limit</span>
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
    <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/70 bg-yellow-400/10 px-3 py-1 text-sm font-bold uppercase tracking-wider text-yellow-200">
      ⚑ {all ? "Demo data — fictional providers" : `Includes ${demo} fictional demo providers (marked)`}
    </span>
  );
}

/** Jai's legal caveats — always visible on results. */
export function LegalNote() {
  return (
    <p className="rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-2.5 text-base text-zinc-300">
      <span className="font-semibold text-zinc-100">Note:</span> A provider can lawfully set a longer wait if they note
      in your record that it won&apos;t harm your health. Telehealth appointments count.
    </p>
  );
}

export function ProviderList({ search, providers, selected, onSelect }: { search: Search; providers: Provider[]; selected: string | null; onSelect: (id: string) => void }) {
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
              className={`relative w-full rounded-2xl border-2 px-5 py-4 text-left transition-all duration-500 ${confirmed ? CONFIRMED_GHOST_STYLE.row : st.row} ${
                selected === p.id ? "outline outline-3 outline-offset-2 outline-white/80" : "hover:brightness-125"
              }`}
            >
              {p.ghost_status !== "unverified" && (
                <span key={p.ghost_status} className="flash pointer-events-none absolute inset-0 rounded-2xl" style={{ ["--flash" as string]: st.flash }} />
              )}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className={`truncate text-xl font-bold ${p.ghost_status === "ghost" ? "line-through decoration-zinc-500" : ""}`}>
                    {p.name}
                    {mixed && isDemoProvider(p) && (
                      <span className="ml-2 align-middle rounded border border-yellow-400/60 px-1.5 py-0.5 text-xs font-bold uppercase text-yellow-200 no-underline">Demo</span>
                    )}
                  </div>
                  <div className="mt-1 text-lg leading-snug">{rowDetail(search, p)}</div>
                </div>
                <StatusBadge status={p.ghost_status} confirmed={confirmed} />
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------- right pane
export function TranscriptPanel({ search, provider }: { search: Search; provider: Provider | null }) {
  if (!provider)
    return (
      <div className="flex h-full min-h-48 items-center justify-center rounded-2xl border-2 border-dashed border-zinc-800 p-6 text-center text-lg text-zinc-500">
        Select a provider to see their details and call transcript.
      </div>
    );
  const w = waitVsDeadline(search, provider);
  const lines = (provider.call_transcript ?? "").split("\n").filter(Boolean);
  return (
    <div className="rounded-2xl border-2 border-zinc-800 bg-zinc-900/70 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-2xl font-bold leading-tight">{provider.name}</h3>
          <p className="mt-1 text-base text-zinc-400">
            {[provider.phone, provider.address].filter(Boolean).join(" · ")}
          </p>
        </div>
        <StatusBadge status={provider.ghost_status} big confirmed={isConfirmedGhost(provider)} />
      </div>

      {w && provider.earliest_date && (
        <div className={`mt-4 grid grid-cols-2 gap-3 rounded-xl p-3 ${provider.violation ? "bg-red-950/60" : "bg-emerald-950/60"}`}>
          <div>
            <div className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Wait</div>
            <div className={`text-2xl font-extrabold ${provider.violation ? "text-red-300" : "text-emerald-300"}`}>{w.wait}</div>
          </div>
          <div>
            <div className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Legal limit</div>
            <div className="text-2xl font-extrabold text-white">{w.limit}</div>
          </div>
        </div>
      )}

      <div className="scroll-dark mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
        {provider.ghost_status === "calling" && (
          <div className="flex items-center gap-4 rounded-xl bg-indigo-950/70 p-4 text-indigo-200">
            <span className="eq" aria-hidden><span /><span /><span /><span /><span /></span>
            <span className="text-lg font-semibold">Live call in progress — transcript arrives when the call ends.</span>
          </div>
        )}
        {provider.ghost_status === "ghost" && wasCalled(provider) && (
          <p className="rounded-xl border border-red-500/60 bg-zinc-900 p-3 text-lg text-zinc-200">
            Confirmed on the call: <b>listed, but not accepting this plan/new patients.</b>
          </p>
        )}
        {provider.ghost_status === "ghost" && !wasCalled(provider) && (
          <p className="text-lg text-zinc-300">
            Not called — this listing is a ghost: <b>{provider.ghost_reason}</b>.{" "}
            {provider.source_url && (
              <a href={provider.source_url} target="_blank" rel="noreferrer" className="text-indigo-300 underline">Source</a>
            )}
          </p>
        )}
        {provider.ghost_status === "unverified" && <p className="text-lg text-zinc-400">Not called yet.</p>}
        {lines.map((l, i) => {
          const text = l.replace(/^(Agent|Office):\s*/, "");
          const system = text.startsWith("("); // e.g. "(no answer — voicemail box full)"
          const office = !system && l.startsWith("Office:");
          const agent = !system && l.startsWith("Agent:");
          return (
            <div key={i} className={`slide-in flex ${office ? "justify-end" : "justify-start"}`} style={{ animationDelay: `${i * 80}ms` }}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-lg leading-snug ${
                office ? "rounded-br-sm bg-zinc-700 text-white" : agent ? "rounded-bl-sm bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-300 italic"
              }`}>
                {(office || agent) && <div className="mb-0.5 text-xs font-bold uppercase tracking-wider opacity-70">{office ? "Office" : "AI assistant"}</div>}
                {text}
              </div>
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
    <div className="rounded-2xl border-2 border-zinc-800 bg-black/40 p-4">
      <h3 className="mb-2 text-sm font-bold uppercase tracking-widest text-zinc-400">Live activity</h3>
      <ol ref={ref} className="scroll-dark max-h-72 space-y-2 overflow-y-auto pr-1 font-mono">
        {events.map((e) => (
          <li key={e.id} className="slide-in flex gap-3 text-base leading-snug">
            <span className="shrink-0 tabular-nums text-zinc-500">{e.at}</span>
            <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${TONE_DOT[e.tone]}`} />
            {e.pid ? (
              <button onClick={() => onPick(e.pid!)} className="text-left text-zinc-100 hover:underline">{e.text}</button>
            ) : (
              <span className={e.tone === "user" ? "font-bold text-white" : "text-zinc-300"}>{e.text}</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
