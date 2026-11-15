// ASCII-art ghost, shaded with a character density ramp. Pure + deterministic (safe in server components).
const RAMP = ".:-=+*#%@";
const COLS = 38;
const ROWS = 25;

function build(): string {
  const lines: string[] = [];
  for (let r = 0; r < ROWS; r++) {
    let line = "";
    for (let c = 0; c < COLS; c++) {
      const u = (c / (COLS - 1)) * 2.2 - 1.1; // -1.1 .. 1.1
      const v = (r / (ROWS - 1)) * 2.4 - 0.05; // 0 .. 2.35
      const hem = 2.12 + 0.14 * Math.cos(u * Math.PI * 3); // scalloped bottom edge
      // distance to the nearest edge (<= 0 means outside)
      const edge = v < 1 ? 1 - Math.hypot(u, v - 1) : Math.min(1 - Math.abs(u), hem - v);
      const eye = Math.hypot((Math.abs(u) - 0.38) / 0.17, (v - 0.92) / 0.27) < 1;
      const mouth = Math.hypot(u / 0.13, (v - 1.42) / 0.17) < 1;
      if (edge <= 0 || eye || mouth) {
        line += " ";
        continue;
      }
      // soft edges, denser core, lit from the upper left
      const light = 0.62 + 0.38 * ((u + 1) / 2) + 0.12 * (v / 2.2);
      const t = Math.min(1, edge * 3.2) * Math.min(1, light);
      line += RAMP[Math.max(0, Math.min(RAMP.length - 1, Math.round(t * (RAMP.length - 1))))];
    }
    lines.push(line.trimEnd());
  }
  return lines.join("\n");
}

const GHOST = build();

export default function AsciiGhost({ className = "" }: { className?: string }) {
  return (
    <pre aria-hidden className={`ascii ${className}`}>
      {GHOST}
    </pre>
  );
}
