import Image from "next/image";
import Link from "next/link";
import AsciiGhost from "@/components/AsciiGhost";
import GerardoReveal from "@/components/GerardoReveal";
import HeroSearch from "@/components/HeroSearch";
import Reveal from "@/components/Reveal";

// Landing. Copy follows design-handoff/preview-final.html (approved mockup).

function Photo({ src, alt, ratio, position, sizes = "(max-width: 860px) 100vw, 600px", className = "", rounded }: {
  src: string; alt: string; ratio: string; position?: string; sizes?: string; className?: string; rounded?: string;
}) {
  return (
    <div className={`photo ${className}`} style={{ aspectRatio: ratio, borderRadius: rounded }}>
      <Image src={src} alt={alt} fill sizes={sizes} style={{ objectFit: "cover", objectPosition: position }} />
    </div>
  );
}

function Ruler({ wait, limit, scale, label, lg = false }: { wait: number; limit: number; scale: number; label: string; lg?: boolean }) {
  return (
    <div className={`ruler ${lg ? "ruler-lg" : ""}`} style={{ "--wait": wait, "--limit": limit, "--scale": scale } as React.CSSProperties}>
      <div className="ruler-track">
        <div className="ruler-fill"><div className="ruler-in" /><div className="ruler-out" /></div>
        <div className="ruler-tick" data-label={label} />
      </div>
    </div>
  );
}

const STORY_NUM = { color: "var(--terra)" };
const MUTED = { color: "var(--ink-2)" };

const TEAM = [
  ["Aryan Khanna", "team-aryan.jpg"],
  ["Hardik Chopra", "team-hardik.jpg"],
  ["Ivan Xie", "team-ivan.jpg"],
  ["Jaideep Gorijavolu", "team-jaideep.jpg"],
];

const FAQ = [
  ["Will you call anyone without asking me?", "No. Calls only start after you approve them on the results page. You'll see exactly which offices will be called first."],
  ["What does the AI say on the phone?", "It says it's an AI assistant calling on behalf of a patient and that the call is being transcribed, then asks only for the earliest opening, in person or by telehealth. It doesn't share your name, contact info, or health details."],
  ["Is this legal advice?", "No. You get an evidence log and letter templates, not legal advice. What you do with them is your call."],
  ["Does this work for my plan?", "California's deadlines apply to state-regulated coverage. They don't apply to self-funded employer or union plans, or to Medicare. Not sure? Ask HR or member services \"Is my plan self-funded?\""],
  ["What do you store about me?", "Your search (insurer, plan type, ZIP, type of care) and the call results. No account, no name, no health details. You can delete a search from its results page."],
];

export default function Landing() {
  return (
    <main>
      {/* Everything above the terracotta panel scrolls over it (revealed footer, desktop only). */}
      <div className="relative z-10 bg-page">
        {/* ---------------- hero ---------------- */}
        <section id="hero" className="wrap grid items-center gap-8 pb-14 pt-7 min-[901px]:grid-cols-[minmax(0,1.3fr)_minmax(0,.7fr)] min-[901px]:gap-12 min-[901px]:pt-[52px]">
          <div>
            <p className="t-small mb-4 font-bold" style={MUTED}>For California HMO &amp; Medi-Cal members</p>
            <h1 className="t-hero">Your insurance directory is full of ghosts.</h1>
            <p className="t-lead mb-[30px] mt-[18px] max-w-[33em]">
              We find out who&apos;s actually taking patients. If nobody can see you in time, we build the evidence to make your plan fix it.
            </p>
            <HeroSearch />
            <p className="t-small mt-3.5 max-w-[38em]" style={MUTED}>
              It&apos;s free, and you don&apos;t need an account. We never ask for your name or health details, and nobody gets called until you say so.
            </p>
            <p className="t-small mt-[22px] max-w-[38em] border-t pt-3.5" style={{ ...MUTED, borderColor: "var(--line-strong)" }}>
              <b style={{ color: "var(--ink)" }}>From our live test run:</b> of 90 licensed therapists near 92103 (Hillcrest, San Diego), 4 appear to be ghosts.
            </p>
          </div>
          <figure className="m-0 flex flex-col items-center">
            <AsciiGhost id="heroGhost" width={42} height={30} animated materialize className="floaty" />
            <figcaption className="mt-[18px] max-w-[24em] border-t pt-3 text-[length:var(--fs-small)]" style={{ ...MUTED, borderColor: "var(--line-strong)" }}>
              <b style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}>ghost listing</b> <span style={{ color: "var(--ink-3)" }}>(noun)</span>
              <br />
              A provider your plan lists as taking new patients, who can&apos;t actually see you.
            </figcaption>
          </figure>
        </section>

        {/* ---------------- sources line ---------------- */}
        <section id="rights" className="border-y" style={{ borderColor: "var(--line-strong)" }}>
          <p className="wrap t-small py-4" style={MUTED}>
            Built on public sources: California Health &amp; Safety Code{" "}
            <a className="link" href="https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=1367.03">§1367.03</a>, the national{" "}
            <a className="link" href="https://npiregistry.cms.hhs.gov/">NPI registry</a>, and the{" "}
            <a className="link" href="https://www.dmhc.ca.gov/">DMHC</a> grievance process. GhostBuster is an independent student project and isn&apos;t affiliated with any agency or health plan.
          </p>
        </section>

        {/* ---------------- story ---------------- */}
        <section className="wrap pt-[88px]">
          <div className="grid items-end gap-8 pb-12 min-[901px]:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)] min-[901px]:gap-14">
            <h2 className="t-display">Finding a therapist who takes your insurance shouldn&apos;t be a second job.</h2>
            <figure className="m-0 border-l-[3px] pl-[18px]" style={{ borderColor: "var(--terra)" }}>
              <blockquote className="m-0 text-[1.0625rem] font-semibold leading-normal">
                &ldquo;A study published last month called almost six thousand therapists and psychiatrists listed in insurer directories. About one call in eight ended with an appointment option.&rdquo;
              </blockquote>
              <figcaption className="source-note mt-2">JAMA Health Forum, Oct 2026 · five states, not California</figcaption>
            </figure>
          </div>

          <Reveal className="story-row">
            <div>
              <div className="t-data" style={STORY_NUM}>01</div>
              <h3 className="t-h2 mb-3 mt-2">The directory says yes.</h3>
              <p className="m-0 max-w-[32em]" style={MUTED}>Your health plan publishes a directory of in-network providers. Search for a therapist near you and it hands back a long, reassuring list.</p>
            </div>
            <pre aria-hidden="true" className="m-0 overflow-auto px-5 py-[18px] text-[14px] leading-[1.6]" style={{ background: "var(--sunk)", borderRadius: "var(--r-md)", fontFamily: "var(--font-data)", color: "var(--ink-2)" }}>
              {"THERAPISTS NEAR 92103 ........ 10 results\n"}
              {[" R. Okafor, LMFT ...... ", " S. Lindqvist, LMFT ... ", " M. Hale, LCSW ........ ", " G. Tanaka, PsyD ...... "].map((n, i) => (
                <span key={n}>{n}<b style={{ color: "var(--st-available)" }}>accepting new patients</b>{i < 3 ? "\n" : ""}</span>
              ))}
            </pre>
          </Reveal>

          <Reveal className="story-row flip">
            <div>
              <div className="t-data" style={STORY_NUM}>02</div>
              <h3 className="t-h2 mb-3 mt-2">The phone says no.</h3>
              <p className="m-0 max-w-[32em]" style={MUTED}>Then you start calling. One office stopped taking new patients. One moved away. One number is disconnected. One never calls back. These are ghost listings, and you find out one call at a time.</p>
            </div>
            <Photo src="/images/clinic-call.jpg" alt="A doctor on the phone at her desk, typing on a laptop" ratio="3/2" position="35% 40%" />
          </Reveal>

          <Reveal className="story-row">
            <div>
              <div className="t-data" style={STORY_NUM}>03</div>
              <h3 className="t-h2 mb-3 mt-2">The law is on your side.</h3>
              <p className="m-0 max-w-[32em]" style={MUTED}>California&apos;s timely-access rules set deadlines for state-regulated plans: 10 business days for a therapist or primary care appointment, 15 for a specialist, 48 hours for urgent care that needs no prior authorization. When a plan can&apos;t offer an appointment in time, it has to arrange one for you, including out of network.</p>
            </div>
            <div className="grid gap-3.5">
              <Photo src="/images/waiting-room.jpg" alt="Patients waiting on chairs along a hospital corridor, black and white" ratio="2/1" position="50% 45%" />
              <div className="card px-6 py-[22px]">
                <div className="t-small mb-3.5 font-bold">Therapist, new patient</div>
                <Ruler lg wait={29} limit={10} scale={31} label="legal limit: day 10" />
                <p className="t-small mb-0 mt-2.5" style={MUTED}>Earliest opening offered: <b style={{ color: "var(--st-past)" }}>day 29</b></p>
              </div>
            </div>
          </Reveal>

          <Reveal className="story-row flip">
            <div>
              <div className="t-data" style={STORY_NUM}>04</div>
              <h3 className="t-h2 mb-3 mt-2">But the proof is on you.</h3>
              <p className="m-0 max-w-[32em]" style={MUTED}>To use those rules, you need to show the plan failed: who you called, when, and what they said. GhostBuster does that legwork for you and writes it down.</p>
            </div>
            <Photo src="/images/clinic-chart.jpg" alt="A doctor writes notes on a clipboard across the desk from a patient" ratio="3/2" />
          </Reveal>
        </section>

        {/* ---------------- how it works ---------------- */}
        <section id="how" className="wrap py-[72px]">
          <div className="max-w-[40em]">
            <h2 className="t-display">We make the calls. You keep the receipts.</h2>
            <p className="t-lead mb-0 mt-4">One search. About a minute of your time. Either an appointment you can actually get, or the paperwork that makes your plan find you one.</p>
          </div>
          <div className="mt-10 grid items-start gap-12 min-[901px]:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <figure className="m-0">
              <Image src="/images/results-screenshot.png" width={1200} height={720} sizes="(max-width: 900px) 100vw, 680px"
                alt="The GhostBuster results page during a search: provider rows with deadline bars, and a live call transcript"
                className="h-auto w-full border" style={{ borderColor: "var(--line-strong)", borderRadius: "var(--r-md)" }} />
              <figcaption className="source-note mt-2.5">The results page, partway through a search (demo data). Each answered call is measured against the legal limit; the transcript on the right is what goes in your evidence log.</figcaption>
            </figure>
            <div>
              <ol className="rows m-0 list-none p-0">
                {[
                  ["Check providers near you", "We pull licensed providers near you from the national provider registry, then use Bright Data to check each one's public profile."],
                  ["Call the rest for you", "With your OK, an AI assistant calls each office and asks for the earliest new-patient opening. It says it's an AI in its first sentence."],
                  ["Hold the plan to the law", "California sets appointment deadlines. If nobody meets them, you get an evidence packet."],
                ].map(([t, d], i) => (
                  <li key={t} style={{ gridTemplateColumns: "3rem minmax(0,1fr)" }}>
                    <span className="n">{i + 1}</span>
                    <div>
                      <h3 className="t-h3">{t}</h3>
                      <p className="mb-0 mt-1.5" style={MUTED}>{d}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <Link className="btn btn-primary btn-lg mt-7" href="/search">Find care <span className="arrow" aria-hidden="true">→</span></Link>
            </div>
          </div>
          <div className="split mt-16">
            <div className="grid grid-cols-[96px_1fr] items-start gap-5 min-[561px]:grid-cols-[140px_1fr]">
              <Photo src="/images/clinic-visit.jpg" alt="A smiling doctor talks with a patient in an exam room" ratio="1" position="58% 35%" sizes="140px" rounded="var(--r-md)" />
              <div>
                <h3 className="t-h3" style={{ color: "var(--st-available)" }}>If someone can see you</h3>
                <p className="mb-0 mt-1.5" style={MUTED}>We show you who, when, and the number to call to book.</p>
              </div>
            </div>
            <div className="grid grid-cols-[1fr_auto] items-start gap-5">
              <div>
                <h3 className="t-h3" style={{ color: "var(--st-past)" }}>If nobody can in time</h3>
                <p className="mb-0 mt-1.5" style={MUTED}>You get the call log, a letter to your plan, a phone script, and how to reach the regulator.</p>
              </div>
              <div className="stamp" style={{ fontSize: ".95rem" }} aria-hidden="true">Past deadline<small>evidence attached</small></div>
            </div>
          </div>
        </section>

        {/* ---------------- honest about what it is ---------------- */}
        <section className="border-y" style={{ background: "var(--surface)", borderColor: "var(--line-strong)" }}>
          <div className="wrap py-[72px]">
            <h2 className="t-display mb-7 max-w-[16em]">Honest about what it is, and what it isn&apos;t.</h2>
            <div className="dl-grid">
              {[
                ["It says it's an AI.", "The assistant opens every call by saying it is an AI assistant calling on behalf of a patient. It never shares your name or health details."],
                ["It's evidence, not legal advice.", "You get a call log and letter templates to send to your plan. What you do with them is your call."],
                ["Not every plan is covered.", "The deadlines apply to state-regulated California plans. Self-funded employer plans and Medicare follow federal rules instead."],
                ["This is a hackathon demo.", "Built in a weekend at SanD Hacks. In the demo, calls only go to our own team's phones, never to a real office."],
              ].map(([t, d]) => (
                <div key={t}>
                  <h3 className="t-h3">{t}</h3>
                  <p className="mb-0 mt-1.5" style={MUTED}>{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- team ---------------- */}
        <section id="team" className="wrap pb-10 pt-[72px]">
          <h2 className="t-h2">Built by four UC San Diego students at SanD Hacks, Fall 2026.</h2>
          <div className="mt-6 grid grid-cols-2 gap-5 min-[901px]:grid-cols-4">
            {TEAM.map(([name, file]) => (
              <figure key={name} className="m-0">
                <Photo src={`/images/${file}`} alt={name} ratio="4/5" sizes="(max-width: 900px) 50vw, 280px" rounded="var(--r-md)" />
                <figcaption className="mt-2.5 text-[1.0625rem] font-bold" style={{ fontFamily: "var(--font-display)" }}>{name}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* ---------------- FAQ ---------------- */}
        <section id="faq" className="wrap faq pb-[88px] pt-12" style={{ maxWidth: 880 }}>
          <h2 className="t-h2 mb-5">Common questions</h2>
          {FAQ.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </section>
      </div>

      {/* ---------------- terracotta panel: pinned while the ghost turns into a real person ---------------- */}
      <section className="footer-reveal gerardo-pin" aria-label="Get started">
        <div className="gerardo-pin-inner wrap grid items-center gap-10 py-16 min-[901px]:py-6 min-[901px]:grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)]">
          <div>
            <h2 className="t-hero" style={{ color: "var(--panel-ink)" }}>Find out who&apos;s really there.</h2>
            <div className="mt-8 grid gap-[18px] min-[901px]:grid-cols-2">
              <fieldset className="box-rule">
                <legend>Start here</legend>
                <Link className="btn btn-lg" href="/search" style={{ background: "var(--panel-ink)", color: "var(--panel-bg)", border: 0 }}>
                  Find care <span className="arrow" aria-hidden="true">→</span>
                </Link>
                <p className="t-small mb-0 mt-2.5">about a minute · no account · free</p>
              </fieldset>
              <fieldset className="box-rule">
                <legend>In crisis?</legend>
                <p className="m-0">Call or text <a href="tel:988" style={{ color: "var(--panel-ink)", fontWeight: 700 }}>988</a> to reach the Suicide &amp; Crisis Lifeline, any time.</p>
              </fieldset>
            </div>
          </div>
          <GerardoReveal />
        </div>
      </section>
    </main>
  );
}
