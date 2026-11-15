import { STATUS_LABEL } from "@/lib/format";
import type { GhostStatus } from "@/lib/types";

const GLYPH: Record<GhostStatus, string> = {
  ghost: "◌",
  unverified: "·",
  calling: ")))",
  available: "✓",
  violation: "!",
  no_answer: "–",
};

/** Status badge (.badge[data-st]). Remounts on status change (key) so the flip plays on every transition.
 *  `confirmed` = ghost confirmed by the office on the call: "Confirmed ghost", with a red outline. */
export default function StatusBadge({ status, big = false, confirmed = false }: { status: GhostStatus; big?: boolean; confirmed?: boolean }) {
  const isConfirmed = confirmed && status === "ghost";
  return (
    <span
      key={isConfirmed ? "confirmed-ghost" : status}
      className="badge flip"
      data-st={status}
      style={{
        ...(big ? { fontSize: "var(--fs-small)", padding: "6px 10px" } : {}),
        ...(isConfirmed ? { boxShadow: "inset 0 0 0 1px var(--st-past)", color: "var(--ink)" } : {}),
      }}
    >
      <span aria-hidden="true">{GLYPH[status]}</span>
      {isConfirmed ? "Confirmed ghost" : STATUS_LABEL[status]}
    </span>
  );
}
