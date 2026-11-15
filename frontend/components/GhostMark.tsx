/** Small solid ghost logo (terracotta). */
export default function GhostMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 2.5C9.1 2.5 4.5 7.7 4.5 14.4V29l3.8-2.7 3.9 2.7 3.8-2.7 3.8 2.7 3.9-2.7 3.8 2.7V14.4C27.5 7.7 22.9 2.5 16 2.5z" style={{ fill: "var(--terra)" }} />
      <ellipse cx="11.6" cy="14" rx="2.2" ry="3" style={{ fill: "var(--page)" }} />
      <ellipse cx="20.4" cy="14" rx="2.2" ry="3" style={{ fill: "var(--page)" }} />
    </svg>
  );
}
