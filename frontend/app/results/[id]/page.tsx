"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityLog, ConsentCard, Counters, DemoDataTag, GhostFunnel, EndingA, EndingB, LegalNote, PhasePill, ProviderList, TranscriptPanel, diffEvents, tallyText,
  type LogEvent,
} from "@/components/results";
import { api, POLL_MS } from "@/lib/api";
import { PLAN_LABEL, SPECIALTY_PLURAL, clock, deadlineText, isDemoProvider, isRealCallUpdate, shortDate, wasCalled } from "@/lib/format";
import type { SearchDetail } from "@/lib/types";

const POLL_AFTER_DONE_MS = 45_000;

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<SearchDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [pinned, setPinned] = useState<string | null>(null); // user-clicked provider
  const [focus, setFocus] = useState<string | null>(null); // auto-follow: latest thing that happened
  const [approving, setApproving] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const deletedRef = useRef(false); // stops polling once the search is deleted
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


  // Tell the corner indicator which stages fell back for this search.
  const fallbackStages = [...new Set((data?.fallbacks ?? []).filter((f) => !isRealCallUpdate(f.detail)).map((f) => f.stage))].join("|");
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
    let doneSince: number | null = null; // keep polling a while after done: late real-call webhooks
    const tick = async () => {
      if (deletedRef.current) return;
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
        if (d.search.status === "done") doneSince ??= Date.now();
        else doneSince = null;
        if (doneSince === null || Date.now() - doneSince < POLL_AFTER_DONE_MS) timer = setTimeout(tick, POLL_MS);
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

  async function deleteSearch() {
    if (!window.confirm("Delete this search? This removes its providers, call transcripts and records. It can't be undone.")) return;
    try {
      await api.deleteSearch(id);
      deletedRef.current = true;
      setDeleted(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (deleted) {
    return (
      <main className="wrap max-w-3xl py-16 text-center">
        <h1 className="t-h2">Search deleted</h1>
        <p className="t-lead mt-3">Its providers, call transcripts and records were removed.</p>
        <Link href="/search" className="btn btn-primary mt-6">New search</Link>
      </main>
    );
  }

  if (!data) {
    const expired = error === "search not found";
    return (
      <main className="wrap max-w-3xl py-16 text-center">
        {expired ? (
          <>
            <h1 className="t-h2">This search has expired</h1>
            <p className="t-lead mt-3">The server restarted. Start a new search.</p>
            <Link href="/search" className="btn btn-primary mt-6">New search</Link>
          </>
        ) : (
          <p className="t-lead animate-pulse">{error ? `Reconnecting… (${error})` : "Loading…"}</p>
        )}
      </main>
    );
  }

  const { search, providers } = data;
  const callable = providers.filter((p) => p.ghost_status === "unverified");
  // "Started" = any row is being or has been called. Directory ghosts don't count (they exist before consent).
  const started = approving || providers.some((p) => p.ghost_status === "calling" || wasCalled(p));
  // Only demo offices (the teammate test phones) are ever dialed. Real registry providers are never called,
  // in live mode or not, so they're neither counted nor sent to /verify.
  const willCall = callable.filter(isDemoProvider);
  const showConsent = search.status === "verifying" && !started && willCall.length > 0;
  const done = search.status === "done";
  const available = providers
    .filter((p) => p.ghost_status === "available")
    .sort((a, b) => (a.earliest_date ?? "").localeCompare(b.earliest_date ?? ""))[0];
  const selectedId = pinned ?? focus;
  const selected = providers.find((p) => p.id === selectedId) ?? null;

  // Human check: correct an extracted date, then refresh (polling may have stopped after "done").
  async function correctDate(providerId: string, date: string) {
    await api.correctDate(id, providerId, date);
    const d = await api.getSearch(id);
    const name = d.providers.find((p) => p.id === providerId)?.name ?? "Provider";
    log([{ tone: "user", text: `You confirmed ${name}'s earliest date as ${shortDate(date)}.` }]);
    prev.current = d;
    setData(d);
  }

  // "Report an error" on a real provider row; refresh so the row shows "Under review".
  async function reportError(providerId: string, what: string, contact: string) {
    await api.reportError(id, providerId, what, contact);
    const d = await api.getSearch(id);
    prev.current = d;
    setData(d);
  }

  async function approve() {
    setApproving(true);
    log([{ tone: "user", text: `You approved AI calls to ${willCall.length} offices.` }]);
    try {
      await api.verify(id, willCall.map((p) => p.id));
    } catch (e) {
      setError((e as Error).message);
      setApproving(false);
    }
  }

  return (
    <main className="wrap pb-[120px] pt-8">
      <section className="case-panel">
      <div className="case-head flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="t-data" style={{ color: "var(--ink-3)" }}>
            Case GB-{id.slice(0, 6).toUpperCase()} · {search.insurer} · {PLAN_LABEL[search.plan_type]} · {search.zip}
          </div>
          <h1 className="t-h2 mt-1">
            {SPECIALTY_PLURAL[search.specialty]} <span style={{ color: "var(--ink-3)", fontWeight: 500 }}>· legal limit {deadlineText(search)}</span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <DemoDataTag providers={providers} />
          <PhasePill detail={data} />
          <Link href="/map" className="link t-small print:hidden">San Diego Ghost Map →</Link>
        </div>
      </div>

      <Counters providers={providers} scanning={search.status === "scraping"} />
      </section>

      {error && <div className="notice mb-4" data-tone="error" role="alert"><b>Connection issue:</b> {error}. Retrying…</div>}

      {search.status === "scraping" && (
        <div className="relative mb-[18px] h-1.5 overflow-hidden rounded-full" style={{ background: "var(--sunk)" }}>
          <div className="scan-bar absolute inset-y-0 w-1/3 rounded-full" style={{ background: "var(--primary)" }} />
        </div>
      )}

      {showConsent && (
        <div className="mb-[18px]">
          <ConsentCard search={search} count={willCall.length} skipped={callable.length - willCall.length} onApprove={approve} busy={approving} />
        </div>
      )}
      <div ref={endingRef} className="mb-[18px] scroll-mt-32">
        {done && (available ? (
          <EndingA search={search} provider={available} id={id} violations={providers.filter((p) => p.violation).length} />
        ) : (
          <EndingB detail={data} id={id} />
        ))}
        {done && <GhostFunnel providers={providers} />}
      </div>

      <div className="grid gap-6 min-[901px]:grid-cols-[minmax(0,7fr)_minmax(300px,5fr)]">
        <section className="min-w-0">
          <div className="flex flex-wrap justify-between gap-2">
            <h2 className="t-h3" style={{ fontSize: "1.0625rem" }}>
              {providers.length && providers.every(isDemoProvider) ? `Demo ${SPECIALTY_PLURAL[search.specialty].toLowerCase()} (fictional)` : `Licensed ${SPECIALTY_PLURAL[search.specialty].toLowerCase()} near ${search.zip}`}
            </h2>
            {!(providers.length && providers.every(isDemoProvider)) && (
              <span className="t-small" style={{ color: "var(--ink-3)" }}>from the national provider registry</span>
            )}
          </div>
          <LegalNote />
          {providers.length === 0 ? (
            <div className="flex flex-col gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg" style={{ background: "var(--sunk)" }} />
              ))}
            </div>
          ) : (
            <ProviderList search={search} providers={providers} selected={selectedId} onSelect={setPinned} confirmedIds={data.patient_confirmed ?? []}
              reviewIds={data.under_review ?? []} onReport={reportError} />
          )}
        </section>
        <aside className="console min-w-0 self-start p-[18px] min-[901px]:sticky min-[901px]:top-[130px]" aria-label="Call transcript">
          <TranscriptPanel search={search} provider={selected} tally={search.status === "scraping" ? undefined : tallyText(providers)} confirmed={!!selected && (data.patient_confirmed ?? []).includes(selected.id)}
            onCorrect={selected ? (date) => correctDate(selected.id, date) : undefined} />
          <ActivityLog events={events} onPick={setPinned} />
        </aside>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-4 print:hidden" style={{ borderColor: "var(--line)" }}>
        <p className="t-small m-0" style={{ color: "var(--ink-2)" }}>We don&apos;t store your name or health details; delete your search anytime.</p>
        <button onClick={deleteSearch} className="btn btn-outline" style={{ minHeight: 40, padding: "8px 14px", color: "var(--st-past)", borderColor: "var(--st-past)" }}>
          Delete this search
        </button>
      </div>
    </main>
  );
}
