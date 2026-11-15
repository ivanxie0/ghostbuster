"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { APPT_LABEL, INSURERS, PLAN_LABEL, SPECIALTY_LABEL, SPECIALTY_PLURAL, deadlineText } from "@/lib/format";
import type { AppointmentType, PlanType, SearchCreate, Specialty } from "@/lib/types";

// Find care: one question per page (GOV.UK / NHS pattern), then "Check your answers".
// The request it sends is unchanged: api.createSearch(SearchCreate) -> /results/{id}.

type Answers = { insurer: string | null; plan: PlanType | null; care: Specialty | null; appt: AppointmentType | null; prior: string; zip: string };
const STEPS = ["insurer", "plan", "care", "zip", "review"] as const;

const PLANS: [PlanType, string][] = [
  ["hmo", "Most plans that need a referral to see a specialist"],
  ["ppo", "You can see out-of-network providers for a higher cost"],
  ["medi_cal", "California's Medicaid program, through a managed care plan"],
  ["unknown", "That's fine. We'll show what to check"],
];
const CARE: Specialty[] = ["therapist", "psychiatrist", "primary_care", "specialist"];
const APPT_HINT: Record<AppointmentType, string> = {
  new: "You haven't seen this provider before",
  follow_up: "A next session with a therapist you already see",
  urgent: "Care you need within 48 hours",
};

function deadline(a: Answers): [string, string] | null {
  if (!a.care || !a.appt) return null;
  if (a.appt === "urgent") return ["48 hours", "for urgent care that needs no prior authorization"];
  if (a.appt === "follow_up") return [deadlineText({ specialty: a.care, appointment_type: a.appt }), "from your last appointment"];
  return [deadlineText({ specialty: a.care, appointment_type: a.appt }), "for a new-patient appointment"];
}

function Radios<T extends string>({ name, options, value, onChange }: {
  name: string; options: { v: T; label: string; hint?: string }[]; value: T | null; onChange: (v: T) => void;
}) {
  return (
    <div className="radio-list">
      {options.map((o) => (
        <label key={o.v} className="radio-row">
          <input type="radio" name={name} value={o.v} checked={value === o.v} onChange={() => onChange(o.v)} />
          <span className="radio-dot" aria-hidden="true" />
          <span className="radio-label">
            {o.label}
            {o.hint && <span className="radio-hint">{o.hint}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}

/** Coverage text verbatim from Jai (docs/RULES.md). PPO / Not sure get the amber warning. */
function Coverage({ strong }: { strong: boolean }) {
  const body = (
    <>
      California&apos;s appointment deadlines apply to state-regulated coverage: plans licensed by the Department of Managed Health
      Care (most HMOs, many PPOs, most Covered California plans, Medi-Cal managed care) and health insurance policies regulated by
      the California Department of Insurance.
    </>
  );
  const more = (
    <details className="mt-2">
      <summary className="cursor-pointer font-bold">Who does this apply to?</summary>
      <p className="mb-0 mt-2">
        They do not apply to self-funded employer or union plans, which are under federal law even if an insurer&apos;s name is on your
        card, or to Medicare. Not sure which you have? Ask HR or member services &quot;Is my plan self-funded?&quot; before relying on
        these deadlines.
      </p>
    </details>
  );
  return strong ? (
    <div className="notice mt-[18px]" role="note">
      <b className="mb-1 block">Check this before relying on the deadlines</b>
      {body}
      {more}
    </div>
  ) : (
    <div className="t-small mt-4 max-w-[46em]" style={{ color: "var(--ink-2)" }} role="note">
      {body}
      {more}
    </div>
  );
}

export default function FindCare() {
  const router = useRouter();
  const [a, setA] = useState<Answers>({ insurer: null, plan: null, care: null, appt: null, prior: "", zip: "" });
  const [step, setStep] = useState(0);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [flipKey, setFlipKey] = useState(0);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Prefill from the landing search bar: /search?insurer=&zip=&specialty=
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const insurer = q.get("insurer");
    if (!insurer) return;
    const specialty = q.get("specialty") as Specialty | null;
    const zip = (q.get("zip") ?? "").replace(/\D/g, "").slice(0, 5);
    const plan: PlanType | null = insurer === "Medi-Cal plan" ? "medi_cal" : null;
    setA((x) => ({
      ...x,
      insurer: INSURERS.includes(insurer) ? insurer : x.insurer,
      care: specialty && CARE.includes(specialty) ? specialty : x.care,
      appt: specialty && CARE.includes(specialty) ? "new" : x.appt,
      zip: zip || x.zip,
      plan,
    }));
    setStep(plan ? 2 : 1);
  }, []);

  // Move focus to the question heading on every step change (screen readers + keyboard).
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    titleRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const d = deadline(a);
  const lastDeadline = useRef<string | null>(null);
  useEffect(() => {
    if (d && d[0] !== lastDeadline.current) setFlipKey((k) => k + 1);
    lastDeadline.current = d?.[0] ?? null;
  }, [d]);

  function set<K extends keyof Answers>(k: K, v: Answers[K]) {
    setErr("");
    setA((x) => {
      const n = { ...x, [k]: v };
      if (k === "insurer" && v === "Medi-Cal plan") n.plan = "medi_cal";
      // Follow-up has a fixed legal deadline only for therapists (Jai, RULES.md).
      if (k === "care" && v !== "therapist" && n.appt === "follow_up") { n.appt = null; n.prior = ""; }
      return n;
    });
  }

  function next() {
    const s = STEPS[step];
    let e = "";
    if (s === "insurer" && !a.insurer) e = "Select your insurance company.";
    else if (s === "plan" && !a.plan) e = 'Select your plan type, or choose "Not sure".';
    else if (s === "care" && (!a.care || !a.appt)) e = !a.care ? "Select the kind of care you need." : "Select the kind of appointment.";
    else if (s === "zip" && !/^\d{5}$/.test(a.zip)) e = "Enter a 5-digit ZIP code.";
    setErr(e);
    if (!e) setStep(step + 1);
    else titleRef.current?.focus({ preventScroll: true });
  }

  async function submit() {
    if (!a.insurer || !a.plan || !a.care || !a.appt || !/^\d{5}$/.test(a.zip)) return;
    setBusy(true);
    setApiError(null);
    const body: SearchCreate = {
      insurer: a.insurer,
      plan_type: a.plan,
      zip: a.zip,
      specialty: a.care,
      appointment_type: a.appt,
      prior_appointment_date: a.appt === "follow_up" && a.prior ? a.prior : null,
    };
    try {
      const { search_id } = await api.createSearch(body);
      router.push(`/results/${search_id}`);
    } catch (e) {
      setApiError((e as Error).message);
      setBusy(false);
    }
  }

  const s = STEPS[step];
  const appts: AppointmentType[] = a.care === "therapist" ? ["new", "follow_up", "urgent"] : ["new", "urgent"];
  const careLine = a.care ? SPECIALTY_LABEL[a.care] + (a.appt ? ` · ${APPT_LABEL[a.appt]}` : "") : "";

  return (
    <main className="wrap pb-24 pt-10">
      <div className="flow">
        <div aria-live="polite">
          {step > 0 ? (
            <button className="back-link" onClick={() => { setErr(""); setStep(step - 1); }}>‹ Back</button>
          ) : (
            <Link className="back-link" href="/">‹ Back to home</Link>
          )}
          <div className="flow-progress">
            <span>{step < 4 ? `Question ${step + 1} of 4` : "Review"}</span>
            <span className="flow-bar" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => <span key={i} className={i <= step ? "done" : ""} />)}
            </span>
          </div>
          {err && (
            <div className="notice mb-[18px]" data-tone="error" role="alert">
              <b>There&apos;s a problem.</b> {err}
            </div>
          )}

          {s === "insurer" && (
            <fieldset className="q">
              <legend><h1 ref={titleRef} className="q-title" tabIndex={-1}>Which insurance company is on your card?</h1></legend>
              <p className="q-hint">We use this to name your plan in the grievance letter. We don&apos;t check your coverage or contact your insurer.</p>
              <Radios name="insurer" options={INSURERS.map((i) => ({ v: i, label: i }))} value={a.insurer} onChange={(v) => set("insurer", v)} />
            </fieldset>
          )}

          {s === "plan" && (
            <>
              <fieldset className="q">
                <legend><h1 ref={titleRef} className="q-title" tabIndex={-1}>What type of plan do you have?</h1></legend>
                <p className="q-hint">It&apos;s usually printed on the front of your member card.</p>
                <Radios name="plan" options={PLANS.map(([v, hint]) => ({ v, label: PLAN_LABEL[v], hint }))} value={a.plan} onChange={(v) => set("plan", v)} />
              </fieldset>
              {a.plan && <Coverage strong={a.plan === "ppo" || a.plan === "unknown"} />}
            </>
          )}

          {s === "care" && (
            <>
              <fieldset className="q">
                <legend><h1 ref={titleRef} className="q-title" tabIndex={-1}>What kind of care do you need?</h1></legend>
                <p className="q-hint">Pick the closest match. Each one has its own legal deadline.</p>
                <Radios name="care" options={CARE.map((v) => ({ v, label: SPECIALTY_LABEL[v] }))} value={a.care} onChange={(v) => set("care", v)} />
              </fieldset>
              {a.care && (
                <fieldset className="q">
                  <legend className="q-sub">What kind of appointment?</legend>
                  <Radios name="appt" options={appts.map((v) => ({ v, label: APPT_LABEL[v], hint: APPT_HINT[v] }))} value={a.appt} onChange={(v) => set("appt", v)} />
                </fieldset>
              )}
              {a.appt === "follow_up" && (
                <div className="mt-4">
                  <label className="field-label" htmlFor="prior">
                    Date of your last appointment <span style={{ fontWeight: 400, color: "var(--ink-3)" }}>(optional)</span>
                  </label>
                  <p className="t-small mb-2 mt-0" style={{ color: "var(--ink-3)" }}>The follow-up clock starts here.</p>
                  <input id="prior" type="date" className="field max-w-[220px]" value={a.prior} onChange={(e) => set("prior", e.target.value)} />
                </div>
              )}
            </>
          )}

          {s === "zip" && (
            <>
              <h1 ref={titleRef} className="q-title" tabIndex={-1}><label htmlFor="zip">Where do you want to be seen?</label></h1>
              <p className="q-hint" id="zip-hint">Enter a 5-digit California ZIP code. We search for licensed providers near it.</p>
              {err && <p className="field-error" id="zip-err">Enter a 5-digit ZIP code.</p>}
              <input id="zip" className="input-xl" inputMode="numeric" maxLength={5} autoComplete="postal-code"
                aria-describedby={`zip-hint${err ? " zip-err" : ""}`} aria-invalid={err ? true : undefined} value={a.zip}
                onChange={(e) => set("zip", e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); next(); } }} />
            </>
          )}

          {s === "review" && a.insurer && a.plan && a.care && a.appt && (
            <>
              <h1 ref={titleRef} className="q-title" tabIndex={-1}>Check your answers</h1>
              <p className="q-hint">Make sure these are right. They decide which providers we check and which legal deadline applies.</p>
              <dl className="answers">
                {([
                  ["Insurance company", a.insurer, 0],
                  ["Plan type", PLAN_LABEL[a.plan], 1],
                  ["Type of care", careLine + (a.prior ? ` (last visit ${a.prior})` : ""), 2],
                  ["ZIP code", a.zip, 3],
                ] as [string, string, number][]).map(([k, v, st]) => (
                  <div key={k} className="ans-row">
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                    <button className="link cursor-pointer border-0 bg-transparent p-0" style={{ font: "inherit" }} onClick={() => setStep(st)}>
                      Change<span className="sr-only"> {k.toLowerCase()}</span>
                    </button>
                  </div>
                ))}
              </dl>
              {(a.plan === "ppo" || a.plan === "unknown") && (
                <div className="notice mt-5" role="note">
                  <b>Self-funded employer plans may not be covered by these California rules.</b> The call log is still useful evidence.
                </div>
              )}
              <h2 className="q-sub">What happens next</h2>
              <ol className="m-0 list-decimal pl-5" style={{ color: "var(--ink-2)" }}>
                <li>We find licensed {SPECIALTY_PLURAL[a.care].toLowerCase()} near {a.zip} and check each public profile.</li>
                <li>We show you which listings look like ghosts.</li>
                <li>You decide whether our AI assistant calls the rest. Nothing is called without your OK.</li>
              </ol>
              {apiError && (
                <div className="notice mt-5" data-tone="error" role="alert"><b>We couldn&apos;t start the search.</b> {apiError}</div>
              )}
              <div className="flow-actions">
                <button className="btn btn-primary btn-lg" onClick={submit} disabled={busy}>
                  {busy ? "Starting…" : <>Check providers near me <span className="arrow" aria-hidden="true">→</span></>}
                </button>
                {d && <span className="t-small" style={{ color: "var(--ink-3)" }}>Legal deadline: <b style={{ color: "var(--ink)" }}>{d[0]}</b></span>}
              </div>
            </>
          )}

          {s !== "review" && (
            <div className="flow-actions">
              <button className="btn btn-primary btn-lg" onClick={next}>Continue</button>
            </div>
          )}
        </div>

        <aside className="summary" aria-label="Your search so far">
          <h2>Your search</h2>
          <dl>
            {([
              ["Insurance", a.insurer],
              ["Plan type", a.plan && PLAN_LABEL[a.plan]],
              ["Care", careLine],
              ["ZIP code", /^\d{5}$/.test(a.zip) ? a.zip : ""],
            ] as [string, string | null][]).map(([k, v]) => (
              <div key={k} className="sum-row">
                <dt>{k}</dt>
                <dd className={v ? "" : "empty"}>{v || "Not answered yet"}</dd>
              </div>
            ))}
          </dl>
          <div className="deadline-box">
            <div className="t-small" style={{ color: "var(--ink-3)" }}>Legal deadline for this appointment</div>
            <div className="num"><span key={flipKey} className={d ? "flip" : ""}>{d ? d[0] : "—"}</span></div>
            <div className="t-small" style={{ color: "var(--ink-2)" }}>{d ? d[1] : "Answer the questions to see it."}</div>
          </div>
          <p className="t-small mb-0 mt-[22px] border-t pt-3.5" style={{ color: "var(--ink-2)", borderColor: "var(--line)" }}>
            We never ask your name, contact details or health information. No calls happen until you approve them.
          </p>
        </aside>
      </div>
    </main>
  );
}
