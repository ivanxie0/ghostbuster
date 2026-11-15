"use client";
// Results "mission control" pieces. Pure presentation — data comes in via props from app/results/[id].
import Link from "next/link";
import { useEffect, useRef } from "react";
import StatusBadge from "@/components/StatusBadge";
import {
  CONFIRMED_GHOST_STYLE, PLAN_LABEL, SPECIALTY_LABEL, STATUS_STYLE, deadlineText, isConfirmedGhost, isDemoProvider, longDate, maskPhone, maskPhonesIn, profileCheck,
  shortDate, waitVsDeadline, wasCalled,
} from "@/lib/format";
import type { GhostStatus, Provider, Search, SearchDetail } from "@/lib/types";

// ---------------------------------------------------------------- activity log model
// focus: the results page auto-selects this provider (call results; not directory ghosts)
export type LogEvent = { id: number; at: string; text: string; tone: GhostStatus | "info" | "user" | "fallback"; pid?: string; focus?: boolean };

const TONE_DOT: Record<LogEvent["tone"], string> = {
  info: "bg-ink/35",
  fallback: "bg-sun ring-1 ring-ink/50",
  user: "bg-ink",
  ghost: "bg-ink/25",
  unverified: "bg-ink/60",
  calling: "bg-cobalt animate-pulse",
  available: "bg-moss",
  violation: "bg-signal",
  no_answer: "bg-sun ring-1 ring-ink/50",
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
  // Pipeline stages that fell back to cached/seed data (real mode), in order, once each.
  for (const f of (next.fallbacks ?? []).slice(prev?.fallbacks?.length ?? 0)) {
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
    status === "scraping" ? ["Scanning directory", "bg-paper text-ink"]
    : status === "done" ? ["Complete", "bg-ink text-paper"]
    : calling ? ["Calling offices", "bg-cobalt text-paper"]
    : ["Ready to call", "bg-sun text-ink"];
  return (
    <span key={label} className={`flip-in inline-flex items-center gap-2 rounded-[2px] border border-ink px-3 py-1.5 font-mono text-sm font-semibold uppercase tracking-wider ${cls}`}>
      {status !== "done" && <span className="h-2 w-2 animate-pulse rounded-full bg-current" />}
      {label}
    </span>
  );
}

function Counter({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="border-t border-ink bg-paper px-1 pb-2 pt-3">
      <div className="label text-ink/65">{label}</div>
      <div key={value} className={`flip-in display mt-1 text-6xl lining-nums tabular-nums sm:text-7xl ${tone}`}>{value}</div>
    </div>
  );
}

export function Counters({ providers }: { providers: Provider[] }) {
  const n = (s: GhostStatus) => providers.filter((p) => p.ghost_status === s).length;
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-4">
      <Counter label="Listed" value={providers.length} tone="text-ink" />
      <Counter label="Ghosts" value={n("ghost")} tone="text-ink/45" />
      <Counter label="Checked" value={providers.filter(wasCalled).length} tone="text-cobalt" />
      <Counter label="Past deadline" value={n("violation")} tone="text-signal" />
    </div>
  );
}

// ---------------------------------------------------------------- consent
export function ConsentCard({ search, count, skipped = 0, onApprove, busy }: { search: Search; count: number; skipped?: number; onApprove: () => void; busy: boolean }) {
  return (
    <section className="rise card p-6 shadow-[6px_6px_0_var(--cobalt)] sm:p-8">
      <p className="label text-cobalt">Your permission needed</p>
      <h2 className="display mt-2 text-4xl sm:text-5xl">
        Want us to call {skipped > 0 ? `the ${count} demo offices` : `the ${count} remaining offices`}?
      </h2>
      <p className="mt-4 text-xl text-ink/85">
        With your permission, our AI assistant will act as your <b>authorized representative</b> and phone each office
        below. It will:
      </p>
      <ul className="mt-3 space-y-1.5 text-xl text-ink/85">
        <li>✓ say at the start of the call that it&apos;s an <b>AI assistant calling on behalf of a patient</b> and that the call is being transcribed</li>
        <li>✓ ask only for the <b>earliest opening, in person or by telehealth</b>, with {search.insurer} {PLAN_LABEL[search.plan_type]}</li>
        <li>✓ <b>not</b> share your name, contact info, or health details</li>
      </ul>
      <p className="mt-3 text-xl text-ink/85">
        Calls are <b>recorded and transcribed</b> so the transcript can go in your evidence log.
      </p>
      <p className="rule-dotted mt-4 pt-3 font-mono text-xs text-ink/65">Hackathon demo: calls only go to our own team&apos;s test phones.</p>
      {skipped > 0 && (
        <p className="mt-1 font-mono text-xs text-ink/65">
          The other {skipped} listed offices are real providers from the public registry. They won&apos;t be called and
          won&apos;t get a result.
        </p>
      )}
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
export function EndingA({ search, provider, id, violations }: { search: Search; provider: Provider; id: string; violations: number }) {
  const w = waitVsDeadline(search, provider);
  return (
    <section className="rise card border-moss p-6 shadow-[6px_6px_0_var(--moss)] sm:p-8">
      <p className="label inline-block bg-moss px-2 py-1 text-paper">Good news</p>
      <h2 className="display mt-3 text-5xl sm:text-6xl">
        {provider.name} can see you {longDate(provider.earliest_date)}.
      </h2>
      <p className="mt-4 text-2xl text-ink">
        That&apos;s <b>{w?.wait}</b> away — within the legal limit of {w?.limit}.
      </p>
      {provider.address && <p className="mt-2 font-mono text-sm text-ink/65">{provider.address}</p>}
      <div className="mt-6 flex flex-wrap items-center gap-4">
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
      <p className="rule-dotted mt-5 pt-3 font-mono text-xs text-ink/65">
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
    <section className="rise card border-signal p-6 shadow-[6px_6px_0_var(--signal)] sm:p-8">
      <p className="label inline-block bg-signal px-2 py-1 text-paper">Timely access grievance ready</p>
      <h2 className="display mt-3 text-5xl sm:text-6xl">
        No provider we reached could offer a timely appointment.
      </h2>
      <p className="mt-4 text-2xl font-semibold leading-snug text-ink">
        You can now ask your plan to arrange timely care, including out-of-network at in-network cost.
      </p>
      <p className="mt-4 text-xl leading-snug text-ink/85">
        Legal limit: {deadlineText(search)}. Of {checked} offices we reached, <b>{n("violation")}</b> were past the legal
        deadline{confirmed > 0 && <>, <b>{confirmed}</b> said they aren&apos;t taking this plan or new patients</>}, and{" "}
        <b>{n("no_answer")}</b> didn&apos;t answer. <b>{listedGhosts}</b> more listings appear unavailable.
      </p>
      <p className="mt-2 text-xl text-ink/70">
        Your packet has the evidence log, a grievance letter to {search.insurer}, a phone script, and next steps with the DMHC.
      </p>
      {selfFunded && (
        <p className="mt-4 rounded-[2px] border border-ink bg-sun p-3 text-lg text-ink">
          If your PPO is a self-funded employer plan, these California rules may not apply — the call log is still useful evidence.
        </p>
      )}
      <Link href={`/packet/${id}`} className="btn btn-solid btn-lg mt-6">
        Download grievance packet <span aria-hidden>↓</span>
      </Link>
      <p className="label mt-4 text-ink/60">Evidence log + template, not legal advice.</p>
    </section>
  );
}

// ---------------------------------------------------------------- provider list
function rowDetail(search: Search, p: Provider) {
  const w = waitVsDeadline(search, p);
  switch (p.ghost_status) {
    case "ghost": return <span className="text-ink/55">{maskPhonesIn(profileCheck(p)?.text ?? p.ghost_reason ?? "")}</span>;
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
    <span className="label inline-flex items-center gap-2 rounded-[2px] border border-ink bg-sun px-2 py-1 text-ink">
      ⚑ {all ? "Demo data — fictional providers" : `Includes ${demo} fictional demo providers (marked)`}
    </span>
  );
}

/** Jai's legal caveats — always visible on results. */
export function LegalNote() {
  return (
    <p className="rounded-[2px] border border-dotted border-ink/50 bg-paper px-4 py-2.5 text-lg text-ink/80">
      <span className="label mr-1 text-ink">Note</span> A provider can lawfully set a longer wait if they note
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
              className={`relative w-full rounded-[2px] border px-5 py-4 text-left transition-all duration-500 ${confirmed ? CONFIRMED_GHOST_STYLE.row : st.row} ${
                selected === p.id ? "outline outline-2 outline-offset-2 outline-ink" : "hover:-translate-y-px hover:shadow-[3px_3px_0_rgba(20,20,15,.25)]"
              }`}
            >
              {p.ghost_status !== "unverified" && (
                <span key={p.ghost_status} className="flash pointer-events-none absolute inset-0 rounded-[2px]" style={{ ["--flash" as string]: st.flash }} />
              )}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className={`truncate text-2xl font-semibold tracking-tight ${p.ghost_status === "ghost" ? "line-through decoration-ink/40 decoration-1" : ""}`}>
                    {p.name}
                    {mixed && isDemoProvider(p) && (
                      <span className="ml-2 inline-block align-middle rounded-[2px] border border-ink bg-sun px-1.5 py-0.5 font-mono text-[0.6rem] font-bold uppercase tracking-wider text-ink no-underline">Demo</span>
                    )}
                  </div>
                  <div className="mt-1 font-mono text-sm leading-snug">{rowDetail(search, p)}</div>
                </div>
                <StatusBadge status={p.ghost_status} confirmed={confirmed} />
              </div>
            </button>
            {(() => {
              // Real ghost from the public-profile check: show where it came from (link sits outside the button).
              const pc = profileCheck(p);
              return pc?.url ? (
                <a
                  href={pc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 ml-5 inline-flex items-center gap-1.5 font-mono text-xs text-cobalt underline underline-offset-2"
                >
                  ✓ Profile checked · {pc.host ?? "source"} ↗
                </a>
              ) : null;
            })()}
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
      <div className="flex h-full min-h-48 items-center justify-center rounded-[2px] border border-dashed border-ink/45 bg-paper p-6 text-center font-mono text-sm text-ink/55">
        Select a provider to see their details and call transcript.
      </div>
    );
  const w = waitVsDeadline(search, provider);
  // Skip empty turns (e.g. "Agent: " left after TTS tags are stripped).
  const lines = (provider.call_transcript ?? "").split("\n").filter((l) => l.replace(/^(Agent|Office):\s*/, "").trim());
  return (
    <div className="window">
      <div className="window-bar"><span>call-transcript.txt</span><span className="text-ink/50">{maskPhone(provider.phone) || "no phone listed"}</span></div>
      <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="display text-3xl">{provider.name}</h3>
          <p className="mt-2 font-mono text-xs text-ink/60">
            {[maskPhone(provider.phone), provider.address].filter(Boolean).join(" · ")}
          </p>
        </div>
        <StatusBadge status={provider.ghost_status} big confirmed={isConfirmedGhost(provider)} />
      </div>

      {w && provider.earliest_date && (
        <div className={`mt-4 grid grid-cols-2 gap-3 rounded-[2px] border p-3 ${provider.violation ? "border-signal bg-[#fdf0ee]" : "border-moss bg-[#eef7f1]"}`}>
          <div>
            <div className="label text-ink/60">Wait</div>
            <div className={`display text-3xl ${provider.violation ? "text-signal" : "text-moss"}`}>{w.wait}</div>
          </div>
          <div>
            <div className="label text-ink/60">Legal limit</div>
            <div className="display text-3xl text-ink">{w.limit}</div>
          </div>
        </div>
      )}

      <div className="scroll-dark mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
        {provider.ghost_status === "calling" && (
          <div className="flex items-center gap-4 rounded-[2px] border border-cobalt bg-[#eef1fc] p-4 text-cobalt">
            <span className="eq" aria-hidden><span /><span /><span /><span /><span /></span>
            <span className="font-mono text-sm font-semibold">Live call in progress — transcript arrives when the call ends.</span>
          </div>
        )}
        {provider.ghost_status === "ghost" && wasCalled(provider) && (
          <p className="rounded-[2px] border border-signal bg-paper p-3 text-lg text-ink">
            Confirmed on the call: <b>listed, but not accepting this plan/new patients.</b>
          </p>
        )}
        {provider.ghost_status === "ghost" && !wasCalled(provider) && (
          <p className="text-lg text-ink/80">
            Not called — this listing is a ghost:{" "}
            <b>{maskPhonesIn(profileCheck(provider)?.text ?? provider.ghost_reason ?? "")}</b>.{" "}
            {profileCheck(provider)?.url ? (
              <a href={profileCheck(provider)!.url!} target="_blank" rel="noreferrer" className="text-cobalt underline underline-offset-2">
                Profile checked · {profileCheck(provider)!.host ?? "source"} ↗
              </a>
            ) : (
              provider.source_url && (
                <a href={provider.source_url} target="_blank" rel="noreferrer" className="text-cobalt underline underline-offset-2">Source</a>
              )
            )}
          </p>
        )}
        {provider.ghost_status === "unverified" && <p className="font-mono text-sm text-ink/55">Not called yet.</p>}
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
              <div className={`max-w-[85%] rounded-[2px] px-4 py-2.5 text-lg leading-snug ${
                office ? "border border-ink bg-paper text-ink" : agent ? "bg-ink text-paper" : "border border-dotted border-ink/45 text-ink/65 italic"
              }`}>
                {(office || agent) && <div className="mb-1 font-mono text-[0.62rem] font-semibold uppercase tracking-widest opacity-65">{office ? "Office" : "AI assistant"}</div>}
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
      <h3 className="window-bar font-medium"><span>live-activity.log</span><span className="text-ink/50">{events.length} lines</span></h3>
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
