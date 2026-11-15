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
    const a = Object.assign(document.createElement("a"), { href: url, download: `ghostbuster-grievance-${id.slice(0, 8)}.html` });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 pb-20 pt-2">
      <div className="sticky top-10 z-40 -mx-6 mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-ink bg-paper/95 px-6 py-4 backdrop-blur print:hidden">
        <div>
          <Link href={`/results/${id}`} className="label text-ink/60 hover:text-ink">← Back to results</Link>
          <h1 className="display mt-2 text-5xl">Your timely access grievance</h1>
          <p className="mt-2 font-mono text-xs text-ink/60">Evidence log · grievance letter · next steps (phone script, DMHC) · transcripts</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={savePdf}
            disabled={!html}
            className="btn btn-solid"
          >
            Save as PDF <span aria-hidden>↓</span>
          </button>
          <button
            onClick={download}
            disabled={!html}
            className="btn"
          >
            Download .html
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-[2px] border border-signal bg-[#fdf0ee] p-6 text-xl">
          Couldn&apos;t load the packet: {error}.{" "}
          <Link href="/search" className="underline">Start a new search</Link>
        </div>
      )}
      {!html && !error && <div className="h-[70vh] animate-pulse rounded-[2px] border border-dashed border-ink/30 bg-ink/5" />}
      {html && (
        <div className="rise overflow-hidden rounded-[2px] border border-ink bg-white shadow-[8px_8px_0_rgba(20,20,15,.15)]">
          <iframe
            ref={frame}
            title="Timely access grievance"
            srcDoc={html}
            onLoad={fit}
            style={{ height }}
            className="block w-full border-0 bg-white"
          />
        </div>
      )}
      <p className="label mt-6 text-center text-ink/60 print:hidden">
        Evidence log + templates, not legal advice. Review and fill in your member ID before sending.
      </p>
    </main>
  );
}
