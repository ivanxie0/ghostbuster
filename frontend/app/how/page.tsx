// How it works: architecture diagram (inline SVG, no library) + 4 cards. Static page.
import Link from "next/link";

type Node = { id: string; x: number; y: number; title: string; lines: string[]; tone?: "gemini" | "packet" | "rules" };

const W = 200;
const H = 74;
const COL = [25, 275, 525, 775];
const ROW = [40, 205, 370, 535];

// Snake layout: row 0 left→right, row 1 right→left, row 2 left→right, then down to the packet.
const NODES: Node[] = [
  { id: "user", x: COL[1], y: ROW[0], title: "Member", lines: ["insurer, plan, ZIP,", "type of care"] },
  { id: "next", x: COL[2], y: ROW[0], title: "Next.js", lines: ["search · live results", "· packet"] },
  { id: "api", x: COL[3], y: ROW[0], title: "FastAPI", lines: ["pipeline, timeouts,", "fallbacks"] },

  { id: "npi", x: COL[3], y: ROW[1], title: "NPI Registry", lines: ["licensed providers", "near the ZIP"] },
  { id: "bd", x: COL[2], y: ROW[1], title: "Bright Data", lines: ["profile search (SERP)", "+ page fetch (Unlocker)"] },
  { id: "gem1", x: COL[1], y: ROW[1], title: "Gemini", lines: ["profile classifier:", "accepting patients?"], tone: "gemini" },
  { id: "neon", x: COL[0], y: ROW[1], title: "Neon Postgres", lines: ["searches · providers", "· scrape cache"] },

  { id: "eleven", x: COL[0], y: ROW[2], title: "ElevenLabs agent", lines: ["over Twilio · says", "it's an AI"] },
  { id: "hook", x: COL[1], y: ROW[2], title: "Post-call webhook", lines: ["transcript → FastAPI"] },
  { id: "gem2", x: COL[2], y: ROW[2], title: "Gemini", lines: ["earliest-date", "extraction"], tone: "gemini" },
  { id: "rules", x: COL[3], y: ROW[2], title: "CA rules engine", lines: ["HSC §1367.03 · business", "days + holidays"], tone: "rules" },

  { id: "packet", x: COL[3], y: ROW[3], title: "Grievance packet", lines: ["evidence log + letter", "+ next steps"], tone: "packet" },
];

const EDGES: [string, string][] = [
  ["user", "next"], ["next", "api"], ["api", "npi"], ["npi", "bd"], ["bd", "gem1"], ["gem1", "neon"],
  ["neon", "eleven"], ["eleven", "hook"], ["hook", "gem2"], ["gem2", "rules"], ["rules", "packet"],
];

const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));

function edgePath(a: Node, b: Node) {
  if (a.y === b.y) {
    const y = a.y + H / 2;
    return a.x < b.x ? `M${a.x + W},${y} L${b.x - 8},${y}` : `M${a.x},${y} L${b.x + W + 8},${y}`;
  }
  const x = a.x + W / 2;
  return `M${x},${a.y + H} L${x},${b.y - 8}`;
}

const ROW_LABELS = [
  { y: ROW[1] - 14, text: "1 · find and check providers" },
  { y: ROW[2] - 14, text: "2 · call, extract, judge" },
];

const CARDS = [
  {
    title: "Live web data (Bright Data)",
    body: "For each licensed provider from the national NPI registry, Bright Data searches for their public profile and fetches the page. Gemini reads it for “not accepting new patients”. Every flag links to its source page.",
  },
  {
    title: "Real AI phone calls (ElevenLabs + Twilio)",
    body: "An ElevenLabs voice agent calls over Twilio, says up front that it’s an AI calling for a patient, and asks for the earliest opening. The post-call webhook returns the transcript. This build only dials our team’s own phones.",
  },
  {
    title: "Deterministic legal rules engine",
    body: "No AI decides the law. Plain code counts business days (weekends and California/federal holidays) and compares them with the HSC §1367.03 deadlines, checked against the statute text. Gemini only pulls the date out of the transcript.",
  },
  {
    title: "Never fakes results for real providers",
    body: "Real registry providers never get a simulated call or a made-up result. Fictional demo providers are labeled “Demo data”, every stage has a timeout and a cached fallback, and each fallback is shown in the activity log.",
  },
  {
    title: "Clinic-friendly by design",
    body: "The rules for calling real offices: at most one call per office per week, only during office hours, and results shared between patients so an office isn’t called again and again. During the hackathon it only dials our team’s own phones.",
  },
];

export default function HowPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 pb-20 pt-4">
      <p className="label text-ink/60">
        <Link href="/" className="underline underline-offset-2">GhostBuster</Link> / how it works
      </p>
      <h1 className="display mt-3 text-6xl sm:text-7xl">
        How it <span className="block-mark">works</span>
      </h1>
      <p className="mt-4 max-w-3xl font-mono text-sm leading-relaxed text-ink/75">
        One search, start to finish: find the licensed providers near you, check their public profiles, call the
        rest with your permission, and measure the answers against California&apos;s timely-access law.
      </p>

      <p className="mt-8 text-sm text-ink/55 sm:hidden">Swipe to see the whole diagram →</p>
      <figure className="mt-2 overflow-x-auto border border-ink bg-paper p-3 sm:mt-10">
        <svg viewBox="0 0 1000 630" className="min-w-[760px] w-full" role="img"
          aria-label="Architecture: Member, Next.js, FastAPI; NPI Registry, Bright Data, Gemini profile classifier, Neon; ElevenLabs agent over Twilio, post-call webhook, Gemini date extraction, California rules engine; grievance packet.">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--ink)" />
            </marker>
          </defs>

          {ROW_LABELS.map((r) => (
            <text key={r.text} x={COL[1]} y={r.y} className="font-mono" fontSize="12" fill="var(--ink)" opacity="0.55" letterSpacing="1">
              {r.text.toUpperCase()}
            </text>
          ))}

          {EDGES.map(([a, b]) => (
            <path key={a + b} d={edgePath(byId[a], byId[b])} stroke="var(--ink)" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
          ))}

          {NODES.map((n) => {
            const fill = n.tone === "packet" ? "var(--st-noanswer-bg)" : "var(--surface)";
            const stroke = n.tone === "gemini" ? "var(--color-cobalt)" : n.tone === "rules" ? "var(--color-moss)" : "var(--ink)";
            return (
              <g key={n.id}>
                <rect x={n.x + 3} y={n.y + 3} width={W} height={H} fill="var(--ink)" opacity="0.18" />
                <rect x={n.x} y={n.y} width={W} height={H} fill={fill} stroke={stroke} strokeWidth={n.tone && n.tone !== "packet" ? 2.5 : 1.5} />
                <text x={n.x + 12} y={n.y + 24} fontSize="17" fontWeight="600" fill="var(--ink)" style={{ fontFamily: "var(--font-display), serif" }}>
                  {n.title}
                </text>
                {n.lines.map((l, i) => (
                  <text key={i} x={n.x + 12} y={n.y + 43 + i * 15} className="font-mono" fontSize="11.5" fill="var(--ink)" opacity="0.75">
                    {l}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>
        <figcaption className="mt-2 font-mono text-xs text-ink/55">
          Blue outline = Gemini (extraction only) · green outline = deterministic rules · every arrow out of FastAPI has a timeout and a cached fallback.
        </figcaption>
      </figure>

      <section className="mt-14 grid gap-x-10 gap-y-10 md:grid-cols-2">
        {CARDS.map((c, i) => (
          <div key={c.title} className="border-t border-ink pt-3">
            <p className="label text-ink/60">0{i + 1} / 0{CARDS.length}</p>
            <h2 className="display mt-3 text-3xl">{c.title}</h2>
            <p className="mt-3 text-lg leading-snug text-ink/85">{c.body}</p>
          </div>
        ))}
      </section>

      <p className="mt-10 text-lg text-ink/80">
        Providers can correct their status: every real provider on the results page has a &ldquo;Report an error&rdquo; link,
        and a reported provider is marked &ldquo;under review&rdquo;.
      </p>
      <p className="mt-3 text-lg text-ink/80">
        Privacy: we don&apos;t store your name or health details; delete your search anytime from its results page.
      </p>

      <p className="rule-dotted label mt-16 pt-4 text-ink/60">
        Evidence log + templates · not legal advice ·{" "}
        <Link href="/map" className="underline underline-offset-4">San Diego Ghost Map →</Link>
      </p>
    </main>
  );
}
