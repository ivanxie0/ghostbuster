"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, POLL_MS } from "@/lib/api";
import { CALL_IN_PROGRESS, type GhostStatus, type SearchDetail } from "@/lib/types";

const BADGE: Record<GhostStatus, string> = {
  ghost: "bg-zinc-700",
  unverified: "bg-sky-800",
  available: "bg-emerald-700",
  violation: "bg-red-700",
  no_answer: "bg-amber-700",
};

// TODO(Aryan): permission modal before calling, live call animation, Ending A / Ending B views.
export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<SearchDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const d = await api.getSearch(id);
        if (stop) return;
        setData(d);
        if (d.search.status !== "done") timer = setTimeout(tick, POLL_MS);
      } catch (e) {
        setError((e as Error).message);
        timer = setTimeout(tick, POLL_MS);
      }
    };
    tick();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [id]);

  async function verify() {
    if (!data) return;
    setVerifying(true);
    const ids = data.providers.filter((p) => p.ghost_status === "unverified").map((p) => p.id);
    try {
      await api.verify(id, ids);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!data) return <p>{error ?? "Loading…"}</p>;
  const { search, providers } = data;
  const called = providers.filter((p) => ["available", "violation", "no_answer"].includes(p.ghost_status));
  const anyAvailable = providers.some((p) => p.ghost_status === "available");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">
        {search.specialty} · {search.insurer} · {search.zip}
      </h1>
      <p className="text-sm text-zinc-400">Status: {search.status}</p>
      {error && <p className="text-red-400">{error}</p>}

      {search.status === "verifying" && !verifying && called.length === 0 && (
        <button onClick={verify} className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold">
          Let the AI assistant call the remaining offices
        </button>
      )}

      <ul className="space-y-2">
        {providers.map((p) => (
          <li key={p.id} className="rounded border border-zinc-800 p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{p.name}</span>
              <span className={`rounded px-2 py-0.5 text-xs ${BADGE[p.ghost_status]}`}>
                {p.ghost_reason === CALL_IN_PROGRESS ? "calling…" : p.ghost_status}
              </span>
            </div>
            {p.ghost_reason && <p className="text-sm text-zinc-400">{p.ghost_reason}</p>}
          </li>
        ))}
      </ul>

      {search.status === "done" &&
        (anyAvailable ? (
          <p className="rounded bg-emerald-900/40 p-3">Ending A: someone can see you in time.</p>
        ) : (
          <Link href={`/packet/${id}`} className="inline-block rounded-lg bg-red-700 px-4 py-2 font-semibold">
            Ending B: build my evidence packet
          </Link>
        ))}
    </div>
  );
}
