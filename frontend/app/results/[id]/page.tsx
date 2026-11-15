"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityLog, ConsentCard, Counters, DemoDataTag, EndingA, EndingB, LegalNote, PhasePill, ProviderList, TranscriptPanel, diffEvents,
  type LogEvent,
} from "@/components/results";
import { api, POLL_MS } from "@/lib/api";
import { PLAN_LABEL, SPECIALTY_LABEL, clock, deadlineText, isDemoProvider, wasCalled } from "@/lib/format";
import type { DemoSettings, SearchDetail } from "@/lib/types";

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<SearchDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [pinned, setPinned] = useState<string | null>(null); // user-clicked provider
  const [focus, setFocus] = useState<string | null>(null); // auto-follow: latest thing that happened
  const [approving, setApproving] = useState(false);
  const [demo, setDemo] = useState<DemoSettings | null>(null); // from /api/demo + the Shift+D panel
  const prev = useRef<SearchDetail | null>(null);
  const seq = useRef(0);
  const endingRef = useRef<HTMLDivElement>(null);
  const isDone = data?.search.status === "done";

  // Bring the Ending A/B card into view the moment the run finishes.
  useEffect(() => {
    if (isDone) setTimeout(() => endingRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 150);
  }, [isDone]);

  const log = useCallback((items: Omit<LogEvent, "id" | "at">[]) => {
    if (!items.length) return;
    const at = clock();
    setEvents((ev) => [...ev, ...items.map((e) => ({ ...e, id: seq.current++, at }))]);
  }, []);

  // Demo settings decide who will really be called (consent card count).
  useEffect(() => {
    api.getDemo().then(setDemo).catch(() => {});
    const onDemo = (e: Event) => setDemo((e as CustomEvent<DemoSettings>).detail);
    window.addEventListener("gb-demo", onDemo);
    return () => window.removeEventListener("gb-demo", onDemo);
  }, []);

  // Tell the corner indicator which stages fell back for this search.
  const fallbackStages = [...new Set((data?.fallbacks ?? []).map((f) => f.stage))].join("|");
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("gb-fallbacks", { detail: fallbackStages ? fallbackStages.split("|") : [] }));
  }, [fallbackStages]);
  useEffect(() => () => void window.dispatchEvent(new CustomEvent("gb-fallbacks", { detail: [] })), []);

  // Poll GET /api/search/{id} every 2s until done (docs/API.md). Fresh state per search (demo Reset reuses this page).
  useEffect(() => {
    let stop = false;
    prev.current = null;
    setData(null);
    setEvents([]);
    setPinned(null);
    setFocus(null);
    setApproving(false);
    setError(null);
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const d = await api.getSearch(id);
        if (stop) return;
        const items = diffEvents(prev.current, d);
        log(items);
        const last = [...items].reverse().find((e) => e.pid && e.focus);
        if (last?.pid) setFocus(last.pid);
        if (d.search.status === "done") {
          const hit = d.providers.find((p) => p.ghost_status === "available");
          if (hit) setFocus(hit.id);
        }
        prev.current = d;
        setData(d);
        setError(null);
        if (d.search.status !== "done") timer = setTimeout(tick, POLL_MS);
      } catch (e) {
        if (stop) return;
        setError((e as Error).message);
        timer = setTimeout(tick, POLL_MS);
      }
    };
    tick();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [id, log]);

  if (!data) {
    const expired = error === "search not found";
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-center">
        {expired ? (
          <>
            <h1 className="display text-4xl">This search has expired</h1>
            <p className="mt-3 text-lg text-ink/65">The server restarted. Start a new search.</p>
            <Link href="/search" className="btn btn-solid mt-6">New search</Link>
          </>
        ) : (
          <p className="animate-pulse text-lg text-ink/60">{error ? `Reconnecting… (${error})` : "Loading…"}</p>
        )}
      </main>
    );
  }

  const { search, providers } = data;
  const callable = providers.filter((p) => p.ghost_status === "unverified");
  // "Started" = any row is being or has been called. Directory ghosts don't count (they exist before consent).
  const started = approving || providers.some((p) => p.ghost_status === "calling" || wasCalled(p));
  // Only demo (seed) providers get calls unless live calling is on; real offices are never simulated.
  const live = !!demo?.real_calls && !demo?.force_fallback;
  const willCall = live ? callable : callable.filter(isDemoProvider);
  const showConsent = search.status === "verifying" && !started && willCall.length > 0;
  const done = search.status === "done";
  const available = providers
    .filter((p) => p.ghost_status === "available")
    .sort((a, b) => (a.earliest_date ?? "").localeCompare(b.earliest_date ?? ""))[0];
  const selectedId = pinned ?? focus;
  const selected = providers.find((p) => p.id === selectedId) ?? null;

  async function approve() {
    setApproving(true);
    log([{ tone: "user", text: `You approved AI calls to ${willCall.length} offices.` }]);
    try {
      await api.verify(id, callable.map((p) => p.id));
    } catch (e) {
      setError((e as Error).message);
      setApproving(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 pb-20 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink/60">
            {search.insurer} · {PLAN_LABEL[search.plan_type]} · ZIP {search.zip}
          </p>
          <h1 className="display mt-1 text-4xl sm:text-5xl">
            {SPECIALTY_LABEL[search.specialty]} · legal limit {deadlineText(search)}
          </h1>
        </div>
        <div className="flex flex-col items-end gap-2">
          <PhasePill detail={data} />
          <DemoDataTag providers={providers} />
        </div>
      </div>

      {error && <p className="rounded-lg border border-signal/40 bg-[#fdf3f1] p-3 text-sm text-signal">Connection issue: {error} — retrying…</p>}

      <Counters providers={providers} />
      <LegalNote />

      {search.status === "scraping" && (
        <div className="relative h-1.5 overflow-hidden rounded-full bg-ink/10">
          <div className="scan-bar absolute inset-y-0 w-1/3 rounded-full bg-cobalt" />
        </div>
      )}

      {showConsent && (
        <ConsentCard search={search} count={willCall.length} skipped={callable.length - willCall.length} onApprove={approve} busy={approving} />
      )}
      <div ref={endingRef} className="scroll-mt-16">
        {done && (available ? (
          <EndingA search={search} provider={available} id={id} violations={providers.filter((p) => p.violation).length} />
        ) : (
          <EndingB detail={data} id={id} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="lg:col-span-7">
          <h2 className="label mb-3 text-ink/60">
            Listed in the {search.insurer} directory
          </h2>
          {providers.length === 0 ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-ink/5" />
              ))}
            </div>
          ) : (
            <ProviderList search={search} providers={providers} selected={selectedId} onSelect={setPinned} />
          )}
        </section>
        <aside className="space-y-4 lg:sticky lg:top-14 lg:col-span-5 lg:self-start">
          <TranscriptPanel search={search} provider={selected} />
          <ActivityLog events={events} onPick={setPinned} />
        </aside>
      </div>
    </main>
  );
}
