"use client";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

// TODO(Aryan): native packet view (letter editor, copy buttons). For now embed the backend HTML.
export default function PacketPage() {
  const { id } = useParams<{ id: string }>();
  const url = api.packetUrl(id);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Evidence packet</h1>
      <p className="text-sm text-zinc-400">Evidence log + template, not legal advice.</p>
      <a href={url} target="_blank" className="inline-block rounded bg-indigo-600 px-4 py-2 font-semibold">
        Open printable version
      </a>
      <iframe src={url} className="h-[70vh] w-full rounded bg-white" />
    </div>
  );
}
