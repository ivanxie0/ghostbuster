"use client";
// San Diego Ghost Map: insurer scorecard + ZIP view from GET /api/stats/ghosts (real Neon data).
// Real providers come from the national NPI registry (NOT an insurer's directory); demo = fictional seed data.
// No map library: the ZIP view is a small hand-placed SVG schematic.
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { GhostStats, GroupStats } from "@/lib/types";

const REAL_LABEL = "Licensed providers near you (national registry)";
const DEMO_LABEL = "Demo data — fictional providers";

// Rough positions on a 600x420 schematic of the San Diego coast (north up). Not to scale.
const ZIP_INFO: Record<string, { name: string; x: number; y: number }> = {
  "92037": { name: "La Jolla", x: 135, y: 95 },
  "92122": { name: "University City", x: 300, y: 75 },
  "92103": { name: "Hillcrest", x: 385, y: 180 },
  "92101": { name: "Downtown", x: 255, y: 270 },
  "91932": { name: "Imperial Beach", x: 300, y: 345 },
  "92173": { name: "San Ysidro", x: 505, y: 345 },
};

const pct = (n: number | null) => (n === null ? "—" : `${n}%`);

function Bar({ value, tone }: { value: number | null; tone: "signal" | "ink" }) {
  return (
    <div className="mt-1 h-2 w-full max-w-40 bg-ink/10" aria-hidden>
      <div className={`h-2 ${tone === "signal" ? "bg-signal" : "bg-ink"}`} style={{ width: `${value ?? 0}%` }} />
    </div>
  );
}

function ScoreRow({ label, g, demo }: { label: string; g: GroupStats; demo?: boolean }) {
  return (
    <tr className="border-t border-ink/20 align-top">
      <td className="py-3 pr-4">
        <span className={`label ${demo ? "bg-sun px-1.5 py-0.5 text-ink" : "text-ink/70"}`}>{label}</span>
        <div className="mt-1 font-mono text-xs text-ink/55">{g.providers} providers seen</div>
      </td>
      <td className="py-3 pr-4 font-mono text-2xl tabular-nums">{g.checked}</td>
      <td className="py-3 pr-4">
        <div className="font-mono text-2xl tabular-nums">{pct(g.unavailable_pct)}</div>
        <div className="font-mono text-xs text-ink/55">{g.unavailable} of {g.checked} checked</div>
        <Bar value={g.unavailable_pct} tone="ink" />
      </td>
      <td className="py-3">
        <div className="font-mono text-2xl tabular-nums">{pct(g.past_deadline_pct)}</div>
        <div className="font-mono text-xs text-ink/55">
          {g.called ? `${g.past_deadline} of ${g.called} called` : demo ? "none called" : "not called (calls only go to our test phones)"}
        </div>
        <Bar value={g.past_deadline_pct} tone="signal" />
      </td>
    </tr>
  );
}

export default function GhostMapPage() {
  const [stats, setStats] = useState<GhostStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zip, setZip] = useState<string>("92103");

  useEffect(() => {
    api.ghostStats().then(setStats).catch((e) => setError((e as Error).message));
  }, []);

  const zipRow = stats?.by_zip.find((z) => z.zip === zip);
  // The map shows REAL registry data only; demo data gets a separate marker and lives in the side panel.
  const maxProviders = Math.max(1, ...(stats?.by_zip ?? []).map((z) => z.real.providers));

  return (
    <main className="mx-auto max-w-7xl px-6 pb-20 pt-4">
      <p className="label text-ink/60">
        <Link href="/" className="underline underline-offset-2">GhostBuster</Link> / map
      </p>
      <h1 className="display mt-3 text-6xl sm:text-7xl">
        San Diego <span className="block-mark">Ghost Map</span>
      </h1>
      <p className="mt-4 max-w-3xl font-mono text-sm leading-relaxed text-ink/75">
        What we&apos;ve checked so far, from our own searches. <b className="text-ink">{REAL_LABEL}</b> come from the
        federal NPI registry and are checked against their public profiles; they are not an insurer&apos;s directory.
        Rows marked <span className="bg-sun px-1 text-ink">Demo data</span> are fictional providers used for the demo.
      </p>

      {error && <p className="mt-6 border-2 border-signal p-4 font-mono">Couldn&apos;t load stats: {error}</p>}
      {stats?.fake_mode && (
        <p className="mt-6 border-2 border-ink p-4 font-mono text-sm">
          The backend is in fake mode (no database), so there&apos;s nothing to map yet. Set FAKE_MODE=false with a
          DATABASE_URL to see real data.
        </p>
      )}
      {!stats && !error && <div className="mt-8 h-64 animate-pulse bg-ink/5" />}

      {stats && !stats.fake_mode && (
        <>
          <section className="mt-12">
            <h2 className="display text-4xl">Insurer scorecard</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="label text-ink/60">
                    <th className="pb-2 pr-4 font-normal">Insurer / source</th>
                    <th className="pb-2 pr-4 font-normal">Providers checked</th>
                    <th className="pb-2 pr-4 font-normal">% appearing unavailable</th>
                    <th className="pb-2 font-normal">% past deadline</th>
                  </tr>
                </thead>
                {stats.by_insurer.length === 0 && (
                  <tbody>
                    <tr><td colSpan={4} className="border-t border-ink/20 py-4 font-mono text-ink/60">No searches yet.</td></tr>
                  </tbody>
                )}
                {stats.by_insurer.map((i) => (
                  <tbody key={i.insurer}>
                    <tr>
                      <th colSpan={4} className="display pt-6 text-2xl font-semibold">{i.insurer}</th>
                    </tr>
                    {i.real.providers > 0 && <ScoreRow label={REAL_LABEL} g={i.real} />}
                    {i.demo.providers > 0 && <ScoreRow label={DEMO_LABEL} g={i.demo} demo />}
                  </tbody>
                ))}
              </table>
            </div>
            <p className="mt-3 font-mono text-xs text-ink/55">
              &ldquo;Appearing unavailable&rdquo; = public profile says not accepting new patients or this plan, or the office
              said so on a call. &ldquo;Past deadline&rdquo; = earliest opening offered on a call was past California&apos;s
              timely-access limit. One office being booked isn&apos;t a violation by that office; the duty is the plan&apos;s.
            </p>
          </section>

          <section className="mt-16 grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <h2 className="display text-4xl">By ZIP code</h2>
              <p className="mt-1 font-mono text-xs text-ink/55">Where the provider&apos;s office is. Real registry data only: circle size = providers seen, fill = % appearing unavailable. A DEMO tag means fictional demo providers too (see panel). Not to scale.</p>
              <svg viewBox="0 0 600 420" className="mt-4 w-full border border-ink bg-paper" role="img" aria-label="Schematic map of San Diego ZIP codes">
                {/* Pacific + coastline (schematic) */}
                <path d="M0,0 L120,0 C110,60 150,110 175,140 C205,180 230,230 255,270 C270,300 290,330 300,420 L0,420 Z" fill="var(--ink)" opacity="0.06" />
                <text x="40" y="250" className="font-mono" fontSize="13" fill="var(--ink)" opacity="0.45">Pacific Ocean</text>
                {/* Border */}
                <line x1="300" y1="402" x2="600" y2="402" stroke="var(--ink)" strokeDasharray="6 5" opacity="0.5" />
                <text x="590" y="416" textAnchor="end" className="font-mono" fontSize="11" fill="var(--ink)" opacity="0.5">Mexico border</text>
                {stats.by_zip.map((z) => {
                  const info = ZIP_INFO[z.zip];
                  if (!info) return null;
                  const total = z.real.providers;
                  const frac = z.real.checked ? z.real.unavailable / z.real.checked : 0;
                  const hasDemo = z.demo.providers > 0;
                  const r = total ? 14 + 26 * Math.sqrt(total / maxProviders) : 10;
                  const active = z.zip === zip;
                  return (
                    <g key={z.zip} onClick={() => setZip(z.zip)} className="cursor-pointer" role="button" aria-label={`ZIP ${z.zip}`}>
                      <circle cx={info.x} cy={info.y} r={r} fill={total ? "var(--signal)" : "var(--paper)"} fillOpacity={total ? 0.12 + 0.75 * frac : 1}
                        stroke="var(--ink)" strokeWidth={active ? 3 : 1.25} strokeDasharray={total ? undefined : "4 3"} />
                      <text x={info.x} y={info.y + 5} textAnchor="middle" className="font-mono" fontSize="14" fontWeight="700" fill="var(--ink)">{z.zip}</text>
                      <text x={info.x} y={info.y + r + 16} textAnchor="middle" className="font-mono" fontSize="11" fill="var(--ink)" opacity="0.7">
                        {info.name}{total ? "" : " · no data yet"}
                      </text>
                      {hasDemo && (
                        <g>
                          <rect x={info.x + r * 0.7} y={info.y - r * 0.7 - 9} width="34" height="14" fill="var(--sun)" stroke="var(--ink)" strokeWidth="0.75" />
                          <text x={info.x + r * 0.7 + 17} y={info.y - r * 0.7 + 1.5} textAnchor="middle" className="font-mono" fontSize="9" fontWeight="700" fill="var(--ink)">DEMO</text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="lg:col-span-5">
              <div className="flex flex-wrap gap-2">
                {stats.by_zip.map((z) => (
                  <button key={z.zip} onClick={() => setZip(z.zip)}
                    className={`border px-3 py-1.5 font-mono text-sm ${z.zip === zip ? "border-ink bg-ink text-paper" : "border-ink/40 hover:border-ink"}`}>
                    {z.zip}
                  </button>
                ))}
              </div>
              {zipRow && (
                <div className="mt-5 border border-ink p-5">
                  <p className="label text-ink/60">{ZIP_INFO[zipRow.zip]?.name}</p>
                  <h3 className="display text-4xl">{zipRow.zip}</h3>
                  {[{ label: REAL_LABEL, g: zipRow.real, demo: false }, { label: DEMO_LABEL, g: zipRow.demo, demo: true }].map(({ label, g, demo }) => (
                    <div key={label} className="mt-4 border-t border-ink/20 pt-3">
                      <span className={`label ${demo ? "bg-sun px-1.5 py-0.5 text-ink" : "text-ink/70"}`}>{label}</span>
                      {g.providers === 0 ? (
                        <p className="mt-2 font-mono text-sm text-ink/55">No data yet for this ZIP.</p>
                      ) : (
                        <dl className="mt-2 grid grid-cols-2 gap-y-1 font-mono text-sm">
                          <dt className="text-ink/60">Providers seen</dt><dd className="tabular-nums">{g.providers}</dd>
                          <dt className="text-ink/60">Checked</dt><dd className="tabular-nums">{g.checked}</dd>
                          <dt className="text-ink/60">Appearing unavailable</dt><dd className="tabular-nums">{g.unavailable} ({pct(g.unavailable_pct)})</dd>
                          <dt className="text-ink/60">Called</dt><dd className="tabular-nums">{g.called}</dd>
                          <dt className="text-ink/60">Past deadline</dt><dd className="tabular-nums">{g.past_deadline} ({pct(g.past_deadline_pct)})</dd>
                        </dl>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <p className="rule-dotted label mt-16 pt-4 text-ink/60">
            Counts from GhostBuster searches and public-profile checks · not a statistical sample · evidence, not legal advice
          </p>
        </>
      )}
    </main>
  );
}
