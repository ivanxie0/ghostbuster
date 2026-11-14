import Link from "next/link";

// TODO(Aryan): landing design. 988 banner is in layout.tsx (must stay on the first screen).
export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold">GhostBuster</h1>
      <p className="text-lg text-zinc-300">
        Your insurer&apos;s directory says they&apos;re available. We check — and if nobody can see you in
        time, we build the evidence for you.
      </p>
      <Link
        href="/search"
        className="inline-block rounded-lg bg-indigo-600 px-5 py-3 font-semibold hover:bg-indigo-500"
      >
        Start
      </Link>
      <p className="text-xs text-zinc-500">Evidence log + templates, not legal advice.</p>
    </div>
  );
}
