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
          className="fixed bottom-3 right-3 z-50 notice !rounded-full px-3 py-1 text-xs font-semibold shadow-sm"
        >
          ⚠ {indicator}
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Demo controls"
          className="slide-in fixed bottom-3 right-3 z-50 card w-80 p-4 text-sm text-ink shadow-xl"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Demo controls</h2>
            <button onClick={() => setOpen(false)} className="rounded px-2 text-ink/60 hover:text-ink" aria-label="Close">
              ✕
            </button>
          </div>
          <p className="mt-0.5 text-xs text-ink/55">Shift+D to toggle · Esc to close</p>

          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <dt className="text-ink/55">Backend</dt>
            <dd>{settings ? (settings.fake_mode ? "Fake mode (in memory)" : "Live · Neon") : "…"}</dd>
            <dt className="text-ink/55">Real phone calls</dt>
            <dd>{settings ? (settings.real_calls ? "On (teammate phones)" : "Off · simulated") : "…"}</dd>
            <dt className="text-ink/55">Gemini</dt>
            <dd>{settings ? (settings.gemini ? "configured" : "not configured") : "…"}</dd>
            <dt className="text-ink/55">Bright Data</dt>
            <dd>{settings ? (settings.brightdata ? "configured" : "not configured") : "…"}</dd>
            <dt className="text-ink/55">This search</dt>
            <dd>{stages.length ? `fell back: ${stages.join(", ")}` : "no fallbacks"}</dd>
          </dl>

          <button
            onClick={resetToPreset}
            disabled={busy !== null}
            className="mt-4 w-full rounded-lg bg-ink px-3 py-2.5 text-left font-semibold text-paper hover:bg-cobalt disabled:opacity-50"
          >
            {busy === "reset" ? "Starting…" : "↺ Reset: preset demo search"}
            <span className="block text-xs font-normal text-paper/75">
              Blue Shield of CA · HMO · 92122 · therapist · new
            </span>
          </button>

          <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[var(--ink)]"
              checked={forced}
              disabled={!settings || settings.fake_mode || busy !== null}
              onChange={toggleFallback}
            />
            <span>
              <span className="font-semibold">Force fallback to cached data</span>
              <span className="block text-xs text-ink/60">
                {settings?.fake_mode
                  ? "Fake mode is already offline."
                  : "Skip live scraping, calls and Gemini; use seed providers and simulated demo calls. Applies to new searches."}
              </span>
            </span>
          </label>

          {error && <p className="mt-2 text-xs text-signal">{error}</p>}
        </div>
      )}
    </div>
  );
}
