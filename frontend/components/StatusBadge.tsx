import { CONFIRMED_GHOST_STYLE, STATUS_LABEL, STATUS_STYLE } from "@/lib/format";
import type { GhostStatus } from "@/lib/types";

/** Remounts on status change (key) so the flip animation plays on every transition.
 *  `confirmed` = ghost confirmed by the office on the call: "Confirmed ghost", grey with a red outline. */
export default function StatusBadge({ status, big = false, confirmed = false }: { status: GhostStatus; big?: boolean; confirmed?: boolean }) {
  const isConfirmed = confirmed && status === "ghost";
  return (
    <span
      key={isConfirmed ? "confirmed-ghost" : status}
      className={`flip-in inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ${
        big ? "px-3.5 py-1.5 text-sm" : "px-3 py-1 text-xs"
      } ${isConfirmed ? CONFIRMED_GHOST_STYLE.badge : STATUS_STYLE[status].badge}`}
    >
      {status === "calling" && <span className="h-2 w-2 rounded-full bg-paper" />}
      {isConfirmed ? "Confirmed ghost" : STATUS_LABEL[status]}
    </span>
  );
}
