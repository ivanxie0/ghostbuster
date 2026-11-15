import Link from "next/link";
import AsciiGhost from "@/components/AsciiGhost";
import Typewriter from "@/components/Typewriter";

const STEPS = [
  { n: "01", title: "Check the directory", body: "We pull your plan's listed providers and flag the ghosts — listed, but not really taking patients." },
  { n: "02", title: "Call the rest for you", body: "With your OK, an AI assistant calls each office and asks for the earliest new-patient opening." },
  { n: "03", title: "Hold the plan to the law", body: "California sets appointment deadlines. If nobody meets them, you get an evidence packet." },
];

const GHOST_REASONS = ["not taking new patients.", "moved two years ago.", "never picks up.", "doesn't take your plan."];

export default function Home() {
  return (
    <main className="mx-auto max-w-7xl px-6 pb-20 pt-6 sm:pt-10">
      <div className="rise grid items-center gap-10 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <p className="label mb-6 text-ink/70">For California HMO &amp; Medi-Cal members</p>
          <h1 className="display text-6xl sm:text-8xl">
            Your insurance directory is full of <span className="block-mark">ghosts.</span>
          </h1>
          <p className="mt-8 font-mono text-lg tracking-tight">
            Listed, but <Typewriter phrases={GHOST_REASONS} />
          </p>
          <p className="mt-4 max-w-2xl font-mono text-sm leading-relaxed text-ink/70">
            <b className="text-ink">Ghost listing</b> - A provider who appears in an insurer&apos;s directory but
            can&apos;t actually see you. We find out who&apos;s really taking patients, and if nobody can see you in
            time, we build the evidence to make your plan fix it.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-6">
            <Link href="/search" className="btn btn-solid btn-lg">
              Find care <span aria-hidden>→</span>
            </Link>
            <span className="label text-ink/60">Takes about a minute · no account</span>
          </div>
        </div>
        <div className="hidden justify-center lg:col-span-4 lg:flex">
          <AsciiGhost className="float text-[15px] font-bold text-ink" />
        </div>
      </div>

      <section className="mt-24">
        <h2 className="display text-5xl">How it works</h2>
        <div className="mt-6 grid gap-x-10 gap-y-8 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.n} className="rise border-t border-ink pt-3" style={{ animationDelay: `${150 + i * 120}ms` }}>
              <p className="label text-ink/70">
                {s.n} / 0{STEPS.length}
              </p>
              <h3 className="display mt-4 text-3xl">{s.title}</h3>
              <p className="mt-3 text-xl leading-snug text-ink/85">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="rule-dotted mt-16 flex flex-wrap items-baseline justify-between gap-4 pt-4">
        <p className="label text-ink/60">GhostBuster produces an evidence log and letter templates. It is not legal advice.</p>
        <nav className="label flex gap-5">
          <Link href="/map" className="underline underline-offset-4 hover:text-cobalt">San Diego Ghost Map →</Link>
          <Link href="/how" className="underline underline-offset-4 hover:text-cobalt">How it works →</Link>
        </nav>
      </footer>
    </main>
  );
}
