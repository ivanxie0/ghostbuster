import { STATUS_LABEL, STATUS_STYLE } from "@/lib/format";
import type { GhostStatus } from "@/lib/types";

/** Remounts on status change (key) so the flip animation plays on every transition. */
export default function StatusBadge({ status, big = false }: { status: GhostStatus; big?: boolean }) {
  return (
    <span
      key={status}
      className={`flip-in inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-bold uppercase tracking-wide ${
        big ? "px-4 py-1.5 text-base" : "px-3 py-1 text-sm"
      } ${STATUS_STYLE[status].badge}`}
    >
      {status === "calling" && <span className="h-2 w-2 rounded-full bg-white" />}
      {STATUS_LABEL[status]}
    </span>
  );
}
