"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { APPT_LABEL, PLAN_LABEL, SPECIALTY_LABEL, deadlineText } from "@/lib/format";
import type { AppointmentType, PlanType, SearchCreate, Specialty } from "@/lib/types";

const INSURERS = [
  "Blue Shield of California",
  "Anthem Blue Cross",
  "Health Net",
  "Kaiser Permanente",
  "Molina Healthcare",
  "L.A. Care",
  "Medi-Cal plan",
];

function Segmented<T extends string>({
  value, options, labels, onChange, name,
}: { value: T; options: T[]; labels: Record<T, string>; onChange: (v: T) => void; name: string }) {
  return (
    <div role="radiogroup" aria-label={name} className="grid grid-cols-2 gap-2 sm:grid-flow-col sm:auto-cols-fr sm:grid-cols-none">
      {options.map((o) => (
        <button
          type="button"
          role="radio"
          aria-checked={value === o}
          key={o}
          onClick={() => onChange(o)}
          className={`rounded-lg border px-4 py-3 text-base font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-deep ${
            value === o ? "border-ink bg-ink text-paper" : "border-ink/20 bg-paper text-ink hover:border-ink/60"
          }`}
        >
          {labels[o]}
        </button>
      ))}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-base font-semibold text-ink">{label}</span>
        {hint && <span className="text-right text-sm text-ink/55">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/** Coverage text verbatim from Jai (docs/RULES.md): first sentence always, the rest behind the expander.
 *  Shown to everyone; `strong` (PPO / Not sure) gets the amber warning style. */
function CoverageNote({ strong }: { strong: boolean }) {
  return (
    <div
      key={strong ? "strong" : "plain"}
      role="note"
      className={`slide-in mt-3 p-4 leading-relaxed ${
        strong
          ? "notice text-base"
          : "rounded-lg border border-line bg-page text-sm text-ink/75"
      }`}
    >
      <p>
        California&apos;s appointment deadlines apply to state-regulated coverage: plans licensed by the Department of
        Managed Health Care (most HMOs, many PPOs, most Covered California plans, Medi-Cal managed care) and health
        insurance policies regulated by the California Department of Insurance.
      </p>
      <details className="group mt-2">
        <summary
          className="cursor-pointer list-none text-sm font-semibold underline-offset-4 hover:underline"
        >
          <span className="inline-block transition-transform group-open:rotate-90">▸</span> Who does this apply to?
        </summary>
        <p className="mt-2">
          They do not apply to self-funded employer or union plans, which are under federal law even if an
          insurer&apos;s name is on your card, or to Medicare. Not sure which you have? Ask HR or member services
          &quot;Is my plan self-funded?&quot; before relying on these deadlines.
        </p>
      </details>
    </div>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const [form, setForm] = useState<SearchCreate>({
    insurer: INSURERS[0],
    plan_type: "hmo",
    zip: "92103",
    specialty: "therapist",
    appointment_type: "new",
    prior_appointment_date: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const patch = (p: Partial<SearchCreate>) => setForm((f) => ({ ...f, ...p }));

  const zipOk = /^\d{5}$/.test(form.zip);
  const warnCoverage = form.plan_type === "ppo" || form.plan_type === "unknown";
  const input =
    "field";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!zipOk) return setError("Enter a 5-digit ZIP code.");
    setBusy(true);
    setError(null);
    try {
      const { search_id } = await api.createSearch({
        ...form,
        prior_appointment_date:
          form.appointment_type === "follow_up" && form.prior_appointment_date ? form.prior_appointment_date : null,
      });
      router.push(`/results/${search_id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 pb-20 pt-6">
      <h1 className="display mt-6 text-5xl">Find care</h1>
      <p className="mt-3 text-lg text-ink/70">Tell us about your plan. We&apos;ll check who&apos;s really available.</p>

      <form onSubmit={submit} className="card mt-8 space-y-7 p-6 sm:p-8">
        <Field label="Insurance company">
          <select
            className={input}
            value={form.insurer}
            onChange={(e) => {
              const insurer = e.target.value;
              patch({ insurer, ...(insurer === "Medi-Cal plan" ? { plan_type: "medi_cal" as PlanType } : {}) });
            }}
          >
            {INSURERS.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </select>
        </Field>

        <Field label="Plan type" hint="Check your member card">
          <Segmented<PlanType>
            name="Plan type"
            value={form.plan_type}
            options={["hmo", "ppo", "medi_cal", "unknown"]}
            labels={PLAN_LABEL}
            onChange={(plan_type) => patch({ plan_type })}
          />
          <CoverageNote strong={warnCoverage} />
        </Field>

        <Field label="ZIP code">
          <input
            className={`${input} max-w-48 font-mono tracking-widest`}
            inputMode="numeric"
            maxLength={5}
            value={form.zip}
            onChange={(e) => patch({ zip: e.target.value.replace(/\D/g, "") })}
            aria-invalid={!zipOk}
          />
        </Field>

        <Field label="What kind of care?">
          <Segmented<Specialty>
            name="Specialty"
            value={form.specialty}
            options={["therapist", "psychiatrist", "primary_care", "specialist"]}
            labels={SPECIALTY_LABEL}
            onChange={(specialty) =>
              // Follow-up has a fixed legal deadline only for therapists (Jai, RULES.md); reset it otherwise.
              patch({
                specialty,
                ...(specialty !== "therapist" && form.appointment_type === "follow_up"
                  ? { appointment_type: "new" as AppointmentType, prior_appointment_date: null }
                  : {}),
              })
            }
          />
        </Field>

        <Field label="Appointment" hint={`Legal deadline: ${deadlineText(form)}`}>
          <Segmented<AppointmentType>
            name="Appointment type"
            value={form.appointment_type}
            options={form.specialty === "therapist" ? ["new", "follow_up", "urgent"] : ["new", "urgent"]}
            labels={APPT_LABEL}
            onChange={(appointment_type) => patch({ appointment_type })}
          />
        </Field>

        {form.appointment_type === "follow_up" && (
          <div className="slide-in">
            <Field label="Date of your last appointment" hint="Optional — the follow-up clock starts here">
              <input
                type="date"
                className={`${input} max-w-64`}
                value={form.prior_appointment_date ?? ""}
                onChange={(e) => patch({ prior_appointment_date: e.target.value || null })}
              />
            </Field>
          </div>
        )}

        {error && <p className="text-sm font-semibold text-signal">{error}</p>}

        <button
          disabled={busy || !zipOk}
          className="btn btn-solid btn-lg w-full sm:w-auto"
        >
          {busy ? "Starting…" : "Check providers near me →"}
        </button>
      </form>
    </main>
  );
}
