"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import type { SearchCreate } from "@/lib/types";

// TODO(Aryan): real form styling, insurer dropdown, Jai's coverage warning text.
export default function SearchPage() {
  const router = useRouter();
  const [form, setForm] = useState<SearchCreate>({
    insurer: "Blue Shield of California",
    plan_type: "hmo",
    zip: "92103",
    specialty: "therapist",
    appointment_type: "new",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof SearchCreate) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value } as SearchCreate);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { search_id } = await api.createSearch(form);
      router.push(`/results/${search_id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const field = "w-full rounded bg-zinc-900 border border-zinc-700 px-3 py-2";
  return (
    <form onSubmit={submit} className="space-y-4">
      <h1 className="text-2xl font-bold">Find care</h1>
      <input className={field} value={form.insurer} onChange={set("insurer")} placeholder="Insurer" />
      <select className={field} value={form.plan_type} onChange={set("plan_type")}>
        <option value="hmo">HMO</option>
        <option value="ppo">PPO</option>
        <option value="medi_cal">Medi-Cal</option>
        <option value="unknown">Not sure</option>
      </select>
      {(form.plan_type === "ppo" || form.plan_type === "unknown") && (
        <p className="rounded border border-amber-600 bg-amber-950/40 p-3 text-sm text-amber-200">
          Heads up: self-funded employer plans (often PPOs) may not be covered by California&apos;s timely
          access rules.
        </p>
      )}
      <input className={field} value={form.zip} onChange={set("zip")} placeholder="ZIP" maxLength={5} />
      <select className={field} value={form.specialty} onChange={set("specialty")}>
        <option value="therapist">Therapist</option>
        <option value="psychiatrist">Psychiatrist</option>
        <option value="primary_care">Primary care</option>
        <option value="specialist">Specialist</option>
      </select>
      <select className={field} value={form.appointment_type} onChange={set("appointment_type")}>
        <option value="new">New patient</option>
        <option value="follow_up">Follow-up</option>
        <option value="urgent">Urgent</option>
      </select>
      {error && <p className="text-red-400">{error}</p>}
      <button disabled={busy} className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold disabled:opacity-50">
        {busy ? "Starting…" : "Search"}
      </button>
    </form>
  );
}
