"use client";
// Demo control panel (Shift+D) + small fallback indicator in the corner. Mounted once in app/layout.tsx.
// Talks to the results page through window events:
//   "gb-demo"      (detail: DemoSettings)  panel -> page, after settings change
//   "gb-fallbacks" (detail: string[])      page -> panel, stages that fell back for the open search
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { DemoSettings, SearchCreate } from "@/lib/types";

export const DEMO_PRESET: SearchCreate = {
  insurer: "Blue Shield of California",
  plan_type: "hmo",
  zip: "92122",
  specialty: "therapist",
  appointment_type: "new",
  prior_appointment_date: null,
};

function typingInField(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}

export default function DemoPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<DemoSettings | null>(null);
  const [stages, setStages] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const publish = useCallback((s: DemoSettings) => {
    setSettings(s);
    window.dispatchEvent(new CustomEvent("gb-demo", { detail: s }));
  }, []);

  const load = useCallback(() => {
    api.getDemo().then(publish).catch((e) => setError((e as Error).message));
  }, [publish]);

  useEffect(() => {
    load();
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === "d" && !typingInField(e.target)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onFallbacks = (e: Event) => setStages((e as CustomEvent<string[]>).detail ?? []);
    window.addEventListener("keydown", onKey);
    window.addEventListener("gb-fallbacks", onFallbacks);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("gb-fallbacks", onFallbacks);
    };
  }, [load]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function toggleFallback() {
    if (!settings) return;
    setBusy("fallback");
    setError(null);
    try {
      publish(await api.setDemo(!settings.force_fallback));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function resetToPreset() {
    setBusy("reset");
    setError(null);
    try {
      const { search_id } = await api.createSearch(DEMO_PRESET);
      setOpen(false);
      router.push(`/results/${search_id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const forced = !!settings?.force_fallback;
  const indicator =
    settings?.fake_mode ? "Fake mode · simulated data"
    : forced ? "Forced fallback · cached data"
    : stages.length ? `Fallback: ${stages.join(", ")}`
    : null;

  return (
    <div className="print:hidden">
      {indicator && !open && (
        <button
          onClick={() => setOpen(true)}
          title="Demo controls (Shift+D)"
          className="fixed bottom-3 right-3 z-50 rounded-full border border-amber-400/70 bg-black/80 px-3 py-1 text-xs font-semibold text-amber-200 shadow-lg backdrop-blur hover:bg-black"
        >
          ⚠ {indicator}
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Demo controls"
          className="slide-in fixed bottom-3 right-3 z-50 w-80 rounded-2xl border-2 border-zinc-600 bg-zinc-950/95 p-4 text-sm text-zinc-200 shadow-2xl backdrop-blur"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">Demo controls</h2>
            <button onClick={() => setOpen(false)} className="rounded px-2 text-zinc-400 hover:text-white" aria-label="Close">
              ✕
            </button>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">Shift+D to toggle · Esc to close</p>

          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <dt className="text-zinc-500">Backend</dt>
            <dd>{settings ? (settings.fake_mode ? "Fake mode (in memory)" : "Live · Neon") : "…"}</dd>
            <dt className="text-zinc-500">Real phone calls</dt>
            <dd>{settings ? (settings.real_calls ? "On (teammate phones)" : "Off · simulated") : "…"}</dd>
            <dt className="text-zinc-500">This search</dt>
            <dd>{stages.length ? `fell back: ${stages.join(", ")}` : "no fallbacks"}</dd>
          </dl>

          <button
            onClick={resetToPreset}
            disabled={busy !== null}
            className="mt-4 w-full rounded-xl bg-indigo-500 px-3 py-2.5 text-left font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
          >
            {busy === "reset" ? "Starting…" : "↺ Reset: preset demo search"}
            <span className="block text-xs font-normal text-indigo-100/80">
              Blue Shield of CA · HMO · 92122 · therapist · new
            </span>
          </button>

          <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-700 p-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-amber-400"
              checked={forced}
              disabled={!settings || settings.fake_mode || busy !== null}
              onChange={toggleFallback}
            />
            <span>
              <span className="font-semibold">Force fallback to cached data</span>
              <span className="block text-xs text-zinc-400">
                {settings?.fake_mode
                  ? "Fake mode is already offline."
                  : "Skip live scraping, calls and Gemini; use seed providers and simulated demo calls. Applies to new searches."}
              </span>
            </span>
          </label>

          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
