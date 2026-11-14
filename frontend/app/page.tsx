import Link from "next/link";

const STEPS = [
  { n: "1", title: "Check the directory", body: "We pull your plan's listed providers and flag the ghosts — listed, but not really taking patients." },
  { n: "2", title: "Call the rest for you", body: "With your OK, an AI assistant calls each office and asks for the earliest new-patient opening." },
  { n: "3", title: "Hold the plan to the law", body: "California sets appointment deadlines. If nobody meets them, you get an evidence packet." },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 pb-20 pt-10 sm:pt-16">
      <div className="rise">
        <p className="mb-4 text-lg font-semibold uppercase tracking-widest text-indigo-300">
          For California HMO &amp; Medi-Cal members
        </p>
        <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-7xl">
          Your insurance directory is full of <span className="text-indigo-400">ghosts.</span>
        </h1>
        <p className="mt-6 max-w-3xl text-2xl leading-snug text-zinc-300">
          We find out who&apos;s actually taking patients — and if nobody can see you in time, we build the
          evidence to make your plan fix it.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-5">
          <Link
            href="/search"
            className="rounded-2xl bg-indigo-500 px-9 py-5 text-2xl font-bold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300"
          >
            Find care →
          </Link>
          <span className="text-lg text-zinc-400">Takes about a minute. No account.</span>
        </div>
      </div>

      <div className="mt-20 grid gap-5 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <div
            key={s.n}
            className="rise rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6"
            style={{ animationDelay: `${150 + i * 120}ms` }}
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20 text-xl font-bold text-indigo-300">
              {s.n}
            </div>
            <h2 className="text-xl font-bold">{s.title}</h2>
            <p className="mt-2 text-lg leading-snug text-zinc-400">{s.body}</p>
          </div>
        ))}
      </div>

      <p className="mt-12 text-base text-zinc-500">
        GhostBuster produces an evidence log and letter templates. It is not legal advice.
      </p>
    </main>
  );
}
