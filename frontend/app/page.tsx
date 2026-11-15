import Link from "next/link";
import AsciiGhost from "@/components/AsciiGhost";
import Reveal from "@/components/Reveal";

// ASCII illustrations for the problem story. Names are fictional (same as the demo seed data).
const ART_DIRECTORY = String.raw`
+--------------------------------------+
|  PROVIDER DIRECTORY        ZIP 92103 |
+--------------------------------------+
|  [x] R. Okafor, LMFT      accepting  |
|  [x] E. Marsh, LCSW       accepting  |
|  [x] S. Lindqvist, LMFT   accepting  |
|  [x] M. Hale, LCSW        accepting  |
|  [x] G. Tanaka, PsyD      accepting  |
+--------------------------------------+
   5 of 5 in network. Looks full.
`;

const ART_CALLS = String.raw`
> dialing office 1 ............ ring
  "we're not taking new patients"
> dialing office 2 ............ ring
  "she moved to Sacramento"
> dialing office 3 ............ ---
  number disconnected
> dialing office 4 ............ ring
  voicemail box is full
> dialing office 5 ............ ring
  "earliest is in six weeks"
`;

const ART_CALENDAR = String.raw`
   MON   TUE   WED   THU   FRI
  [ 1 ] [ 2 ] [ 3 ] [ 4 ] [ 5 ]
  [ 6 ] [ 7 ] [ 8 ] [ 9 ] [10 ] <- legal limit
  [ . ] [ . ] [ . ] [ . ] [ . ]
  [ . ] [ . ] [ . ] [ . ] [ . ]
  [ . ] [ . ] [ . ] [29 ] <- earliest opening
`;

const ART_BURDEN = String.raw`
  calls made        ||||  ||||  ||||  ||
  hours on hold     ##############......
  callbacks         -
  appointments      0

  proof collected   (that part is on you)
`;

const STORY = [
  {
    n: "01",
    title: "The directory says yes.",
    art: ART_DIRECTORY,
    body: [
      "Your health plan publishes a directory of in-network providers. Search for a therapist near you and it hands back a long, reassuring list.",
      "On paper, the network looks full. That list is also what the plan points to when it says it has enough providers.",
    ],
  },
  {
    n: "02",
    title: "The phone says no.",
    art: ART_CALLS,
    body: [
      "Then you start calling. One office stopped taking new patients. One moved away. One number is disconnected. One never calls back.",
      "These are ghost listings: providers who appear in the directory but can't actually see you. Nobody tells you which ones they are. You find out one call at a time.",
    ],
  },
  {
    n: "03",
    title: "The law is on your side.",
    art: ART_CALENDAR,
    body: [
      "California's timely-access rules set deadlines for state-regulated plans: 10 business days for a therapist or primary care appointment, 15 for a specialist, 48 hours for urgent care that needs no prior authorization.",
      "When a plan can't offer an appointment in time, it has to arrange one for you, including out of network.",
    ],
  },
  {
    n: "04",
    title: "But the proof is on you.",
    art: ART_BURDEN,
    body: [
      "To use those rules, you need to show the plan failed: who you called, when, and what they said. Today that means the person who needs care does the legwork, office by office.",
      "GhostBuster does that legwork for you and writes it down.",
    ],
  },
];

const STEPS = [
  { n: "1", title: "Check the directory", body: "We pull your plan's listed providers and flag the ghosts — listed, but not really taking patients." },
  { n: "2", title: "Call the rest for you", body: "With your OK, an AI assistant calls each office and asks for the earliest new-patient opening." },
  { n: "3", title: "Hold the plan to the law", body: "California sets appointment deadlines. If nobody meets them, you get an evidence packet." },
];

const PROMISES = [
  { title: "It says it's an AI.", body: "The assistant opens every call by saying it is an AI assistant calling on behalf of a patient. It never shares your name or health details." },
  { title: "It's evidence, not legal advice.", body: "You get a call log and letter templates to send to your plan. What you do with them is your call." },
  { title: "Not every plan is covered.", body: "The deadlines apply to state-regulated California plans. Self-funded employer plans and Medicare follow federal rules instead." },
  { title: "This is a hackathon demo.", body: "Built in a weekend at SanD Hacks. In the demo, calls only go to our own team's phones, never to a real office." },
];

const BOX_RULE = "-".repeat(120);

export default function Home() {
  return (
    <>
      {/* Everything in this wrapper sits above the footer and slides up to reveal it. */}
      <div className="relative z-10 rounded-b-[2rem] bg-page shadow-[0_24px_60px_-20px_rgba(31,30,29,0.45)]">
        {/* Hero: pins under the crisis banner on desktop while the story sheet slides over it. */}
        <section className="top-9 flex min-h-[calc(100svh-6.5rem)] items-center lg:sticky">
          <div className="rise mx-auto grid w-full max-w-7xl items-center gap-12 px-6 py-14 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <p className="label mb-5 text-accent-deep">For California HMO &amp; Medi-Cal members</p>
              <h1 className="display text-5xl sm:text-7xl">
                Your insurance directory is full of <span className="block-mark">ghosts.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-xl leading-relaxed text-ink/75">
                We find out who&apos;s actually taking patients — and if nobody can see you in time, we build the
                evidence to make your plan fix it.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-5">
                <Link href="/search" className="btn btn-solid btn-lg">
                  Find care <span aria-hidden>→</span>
                </Link>
                <span className="text-sm text-ink/60">Takes about a minute. No account.</span>
              </div>
              <p className="label mt-14 hidden text-ink/45 lg:block">
                <span aria-hidden>↓</span> Why this exists
              </p>
            </div>
            <div className="hidden justify-center lg:col-span-5 lg:flex">
              <AsciiGhost className="float text-[15px] font-bold text-accent" />
            </div>
          </div>
        </section>

        {/* The problem: a white sheet that slides up over the hero. Each title pins while its text scrolls. */}
        <section className="relative z-10 rounded-t-[2rem] border-t border-line bg-paper shadow-[0_-18px_50px_-24px_rgba(31,30,29,0.35)]">
          <div className="mx-auto max-w-7xl px-6 pb-10 pt-16 sm:pt-24">
            <p className="label text-accent-deep">The problem</p>
            <h2 className="display mt-3 max-w-4xl text-4xl sm:text-6xl">
              Finding a therapist who takes your insurance shouldn&apos;t be a second job.
            </h2>
          </div>
          <div className="mx-auto max-w-7xl px-6 pb-24">
            {STORY.map((s) => (
              <article key={s.n} className="grid gap-x-12 gap-y-6 border-t border-line py-14 lg:grid-cols-12 lg:py-24">
                <div className="self-start lg:sticky lg:top-24 lg:col-span-5">
                  <p className="font-mono text-sm text-ink/45">{s.n} / 04</p>
                  <h3 className="display mt-3 text-4xl sm:text-5xl">{s.title}</h3>
                </div>
                <div className="lg:col-span-7">
                  <Reveal>
                    <pre aria-hidden className="ascii overflow-x-auto rounded-xl border border-line bg-page p-5 text-[11px] leading-[1.45] text-ink/80 sm:text-[13px]">
                      {s.art.trim()}
                    </pre>
                  </Reveal>
                  {s.body.map((p, i) => (
                    <Reveal key={i} delay={80 * (i + 1)}>
                      <p className="mt-6 text-xl leading-relaxed text-ink/80 lg:text-2xl lg:leading-relaxed">{p}</p>
                    </Reveal>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* What we do about it */}
        <section className="relative z-10 bg-page">
          <div className="mx-auto grid max-w-7xl gap-x-12 gap-y-8 px-6 py-20 lg:grid-cols-12 lg:py-28">
            <div className="self-start lg:sticky lg:top-24 lg:col-span-5">
              <p className="label text-accent-deep">What GhostBuster does</p>
              <h2 className="display mt-3 text-4xl sm:text-5xl">We make the calls. You keep the receipts.</h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-ink/70">
                One search. About a minute of your time. Either an appointment you can actually get, or the paperwork
                that makes your plan find you one.
              </p>
            </div>
            <div className="space-y-5 lg:col-span-7">
              {STEPS.map((s, i) => (
                <Reveal key={s.n} delay={i * 80}>
                  <div className="card flex gap-5 p-6">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 font-semibold text-accent-deep">{s.n}</div>
                    <div>
                      <h3 className="display text-2xl">{s.title}</h3>
                      <p className="mt-2 text-lg leading-relaxed text-ink/70">{s.body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
              <Reveal delay={240}>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="rounded-xl border border-moss/40 bg-[#f0f8f3] p-6">
                    <p className="label text-moss">If someone can see you</p>
                    <p className="mt-2 text-lg leading-snug">We show you who, when, and the number to call to book.</p>
                  </div>
                  <div className="rounded-xl border border-signal/35 bg-[#fdf3f1] p-6">
                    <p className="label text-signal">If nobody can in time</p>
                    <p className="mt-2 text-lg leading-snug">You get the call log, a letter to your plan, a phone script, and how to reach the regulator.</p>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Honesty */}
        <section className="relative z-10 rounded-b-[2rem] border-t border-line bg-paper">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
            <p className="label text-accent-deep">What to know</p>
            <h2 className="display mt-3 text-4xl sm:text-5xl">Straight with you, and with the offices we call.</h2>
            <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
              {PROMISES.map((p, i) => (
                <Reveal key={p.title} delay={i * 70}>
                  <div className="border-t border-ink pt-4">
                    <h3 className="text-lg font-semibold">{p.title}</h3>
                    <p className="mt-2 leading-relaxed text-ink/70">{p.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Revealed footer: pinned to the bottom of the viewport, uncovered as the page above scrolls away. */}
      <footer className="sticky bottom-0 z-0 flex h-[100svh] flex-col justify-end overflow-hidden bg-accent px-6 pb-8 pt-16 text-ink">
        <div className="mx-auto grid w-full max-w-7xl items-end gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 className="display text-6xl text-paper sm:text-8xl">Find out who&apos;s really there.</h2>
            <div aria-hidden className="mt-8 overflow-hidden whitespace-nowrap font-mono text-sm text-ink/70">+-- START HERE {BOX_RULE}</div>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 border-l border-ink/40 py-6 pl-5">
              <Link href="/search" className="btn btn-solid btn-lg">
                Find care <span aria-hidden>→</span>
              </Link>
              <span className="font-mono text-sm text-ink/80">about a minute · no account · free</span>
            </div>
            <div aria-hidden className="overflow-hidden whitespace-nowrap font-mono text-sm text-ink/70">+-- IN CRISIS? {BOX_RULE}</div>
            <p className="border-l border-ink/40 py-5 pl-5 font-mono text-sm text-ink/85">
              Call or text{" "}
              <a href="tel:988" className="font-bold underline underline-offset-2">
                988
              </a>{" "}
              — Suicide &amp; Crisis Lifeline, 24/7
            </p>
            <div aria-hidden className="overflow-hidden whitespace-nowrap font-mono text-sm text-ink/70">+{BOX_RULE}</div>
          </div>
          <div className="hidden justify-end lg:col-span-5 lg:flex">
            <AsciiGhost className="text-[17px] font-bold text-ink/85" />
          </div>
        </div>
        <p className="label mx-auto mt-8 w-full max-w-7xl text-ink/70">
          © 2026 GhostBuster · Evidence log + templates, not legal advice
        </p>
      </footer>
    </>
  );
}
