"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { INSURERS, SPECIALTY_LABEL } from "@/lib/format";
import type { Specialty } from "@/lib/types";

/** Unified search bar: starts the Find care flow with these three answers prefilled. */
export default function HeroSearch() {
  const router = useRouter();
  const [insurer, setInsurer] = useState(INSURERS[0]);
  const [zip, setZip] = useState("92103");
  const [specialty, setSpecialty] = useState<Specialty>("therapist");
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = new URLSearchParams({ insurer, specialty });
    if (/^\d{5}$/.test(zip)) q.set("zip", zip);
    router.push(`/search?${q}`);
  }
  const focusIn = (e: React.MouseEvent<HTMLDivElement>) => e.currentTarget.querySelector<HTMLElement>("select,input")?.focus();
  return (
    <form className="search-unified" onSubmit={submit} aria-label="Find care">
      <div className="search-seg" onClick={focusIn}>
        <label htmlFor="h-ins">Insurance company</label>
        <select id="h-ins" value={insurer} onChange={(e) => setInsurer(e.target.value)}>
          {INSURERS.map((i) => <option key={i}>{i}</option>)}
        </select>
      </div>
      <div className="search-seg" onClick={focusIn}>
        <label htmlFor="h-zip">ZIP code</label>
        <input id="h-zip" inputMode="numeric" maxLength={5} autoComplete="postal-code" placeholder="92103" value={zip}
          onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))} />
      </div>
      <div className="search-seg" onClick={focusIn}>
        <label htmlFor="h-care">Type of care</label>
        <select id="h-care" value={specialty} onChange={(e) => setSpecialty(e.target.value as Specialty)}>
          {(Object.keys(SPECIALTY_LABEL) as Specialty[]).sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)).map((s) => (
            <option key={s} value={s}>{SPECIALTY_LABEL[s]}</option>
          ))}
        </select>
      </div>
      <button className="search-go" type="submit">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="M15.5 15.5L21 21" />
        </svg>
        Find care
      </button>
    </form>
  );
}

const ORDER: Specialty[] = ["therapist", "psychiatrist", "primary_care", "specialist"];
