"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityLog, ConsentCard, Counters, DemoDataTag, EndingA, EndingB, LegalNote, PhasePill, ProviderList, TranscriptPanel, diffEvents,
  type LogEvent,
} from "@/components/results";
import { api, POLL_MS } from "@/lib/api";
import { PLAN_LABEL, SPECIALTY_LABEL, clock, deadlineText, wasCalled } from "@/lib/format";
import type { SearchDetail } from "@/lib/types";

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<SearchDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [pinned, setPinned] = useState<string | null>(null); // user-clicked provider
  const [focus, setFocus] = useState<string | null>(null); // auto-follow: latest thing that happened
  const [approving, setApproving] = useState(false);
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

  // Poll GET /api/search/{id} every 2s until done (docs/API.md).
  useEffect(() => {
    let stop = false;
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
            <h1 className="text-3xl font-bold">This search has expired</h1>
            <p className="mt-2 text-lg text-zinc-400">The server restarted. Start a new search.</p>
            <Link href="/search" className="mt-6 inline-block rounded-2xl bg-indigo-500 px-6 py-3 text-xl font-bold">New search</Link>
          </>
        ) : (
          <p className="animate-pulse text-2xl text-zinc-400">{error ? `Reconnecting… (${error})` : "Loading…"}</p>
        )}
      </main>
    );
  }

  const { search, providers } = data;
  const callable = providers.filter((p) => p.ghost_status === "unverified");
  // "Started" = any row is being or has been called. Directory ghosts don't count (they exist before consent).
  const started = approving || providers.some((p) => p.ghost_status === "calling" || wasCalled(p));
  const showConsent = search.status === "verifying" && !started && callable.length > 0;
  const done = search.status === "done";
  const available = providers
    .filter((p) => p.ghost_status === "available")
    .sort((a, b) => (a.earliest_date ?? "").localeCompare(b.earliest_date ?? ""))[0];
  const selectedId = pinned ?? focus;
  const selected = providers.find((p) => p.id === selectedId) ?? null;

  async function approve() {
    setApproving(true);
    log([{ tone: "user", text: `You approved AI calls to ${callable.length} offices.` }]);
    try {
      await api.verify(id, callable.map((p) => p.id));
    } catch (e) {
      setError((e as Error).message);
      setApproving(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 pb-20 pt-2">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-zinc-400">
            {search.insurer} · {PLAN_LABEL[search.plan_type]} · ZIP {search.zip}
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            {SPECIALTY_LABEL[search.specialty]} · legal limit {deadlineText(search)}
          </h1>
        </div>
        <div className="flex flex-col items-end gap-2">
          <PhasePill detail={data} />
          <DemoDataTag providers={providers} />
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-950 p-3 text-lg text-red-200">Connection issue: {error} — retrying…</p>}

      <Counters providers={providers} />
      <LegalNote />

      {search.status === "scraping" && (
        <div className="relative h-2 overflow-hidden rounded-full bg-zinc-800">
          <div className="scan-bar absolute inset-y-0 w-1/3 rounded-full bg-sky-400" />
        </div>
      )}

      {showConsent && <ConsentCard search={search} count={callable.length} onApprove={approve} busy={approving} />}
      <div ref={endingRef} className="scroll-mt-16">
        {done && (available ? (
          <EndingA search={search} provider={available} id={id} violations={providers.filter((p) => p.violation).length} />
        ) : (
          <EndingB detail={data} id={id} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="lg:col-span-7">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-zinc-400">
            Listed in the {search.insurer} directory
          </h2>
          {providers.length === 0 ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-zinc-900" />
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
