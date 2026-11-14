"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

// Evidence packet: backend renders print-ready HTML (packet/render.py); we show it same-origin via srcDoc
// so "Save as PDF" can print just the document, and "Download" can save the HTML file.
export default function PacketPage() {
  const { id } = useParams<{ id: string }>();
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [height, setHeight] = useState(1200);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    api.getPacketHtml(id).then(setHtml).catch((e) => setError((e as Error).message));
  }, [id]);

  function fit() {
    const doc = frame.current?.contentDocument;
    if (doc) setHeight(doc.documentElement.scrollHeight + 40);
  }

  function savePdf() {
    frame.current?.contentWindow?.focus();
    frame.current?.contentWindow?.print();
  }

  function download() {
    if (!html) return;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `ghostbuster-evidence-${id.slice(0, 8)}.html` });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 pb-20 pt-2">
      <div className="sticky top-10 z-40 -mx-6 mb-6 flex flex-wrap items-center justify-between gap-4 bg-[var(--background)]/95 px-6 py-4 backdrop-blur print:hidden">
        <div>
          <Link href={`/results/${id}`} className="text-base text-zinc-400 hover:text-white">← Back to results</Link>
          <h1 className="text-4xl font-extrabold tracking-tight">Your evidence packet</h1>
          <p className="text-lg text-zinc-400">Call log · ghost listings · letter · phone script · DMHC info · transcripts</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={savePdf}
            disabled={!html}
            className="rounded-2xl bg-white px-6 py-4 text-xl font-bold text-zinc-900 shadow-lg transition hover:bg-zinc-200 disabled:opacity-50"
          >
            ⬇ Save as PDF
          </button>
          <button
            onClick={download}
            disabled={!html}
            className="rounded-2xl border-2 border-zinc-600 px-5 py-4 text-lg font-semibold hover:bg-zinc-800 disabled:opacity-50"
          >
            Download .html
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border-2 border-red-500 bg-red-950/50 p-6 text-xl">
          Couldn&apos;t load the packet: {error}.{" "}
          <Link href="/search" className="underline">Start a new search</Link>
        </div>
      )}
      {!html && !error && <div className="h-[70vh] animate-pulse rounded-2xl bg-zinc-900" />}
      {html && (
        <div className="rise overflow-hidden rounded-xl bg-white shadow-2xl shadow-black/60 ring-1 ring-white/10">
          <iframe
            ref={frame}
            title="Evidence packet"
            srcDoc={html}
            onLoad={fit}
            style={{ height }}
            className="block w-full border-0 bg-white"
          />
        </div>
      )}
      <p className="mt-4 text-center text-base text-zinc-500 print:hidden">
        Evidence log + templates, not legal advice. Review and fill in your member ID before sending.
      </p>
    </main>
  );
}
