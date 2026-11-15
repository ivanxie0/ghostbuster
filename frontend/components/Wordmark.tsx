/** "ghostbuster" wordmark: geometric monoline lowercase with round ends, drawn as SVG strokes.
 *  The "o" is a little ghost (terracotta, eyes cut out, wavy hem). Ink follows currentColor. */

const W = 10; // stroke width
const R = 18; // bowl radius (stroke center): x-height 22..68, ascender from 1, descender to 93
const GAP = 6;

type Glyph = { w: number; d?: (x: number) => string; ghost?: true };

const bowl = (cx: number) => `M ${cx - R} 45 A ${R} ${R} 0 1 0 ${cx + R} 45 A ${R} ${R} 0 1 0 ${cx - R} 45`;

const GLYPHS: Record<string, Glyph> = {
  g: { w: 46, d: (x) => `${bowl(x + 23)} M ${x + 41} 27 V 70 A ${R} ${R} 0 0 1 ${x + 5} 70` },
  h: { w: 46, d: (x) => `M ${x + 5} 6 V 63 M ${x + 5} 45 A ${R} ${R} 0 0 1 ${x + 41} 45 V 63` },
  o: { w: 46, ghost: true },
  s: {
    w: 28,
    d: (x) => `M ${x + 21.8} 31.5 A 9 9 0 1 0 ${x + 14} 45 A 9 9 0 1 1 ${x + 6.2} 58.5`,
  },
  t: { w: 31, d: (x) => `M ${x + 12} 12 V 54 A 9 9 0 0 0 ${x + 21} 63 H ${x + 26} M ${x + 5} 27 H ${x + 26}` },
  b: { w: 46, d: (x) => `M ${x + 5} 6 V 63 ${bowl(x + 23)}` },
  u: { w: 46, d: (x) => `M ${x + 5} 27 V 45 A ${R} ${R} 0 0 0 ${x + 41} 45 M ${x + 41} 27 V 63` },
  e: { w: 46, d: (x) => `M ${x + 5} 45 H ${x + 41} A ${R} ${R} 0 1 0 ${x + 36.8} 56.6` },
  r: { w: 31, d: (x) => `M ${x + 5} 27 V 63 M ${x + 5} 47 A ${R} ${R} 0 0 1 ${x + 23} 27 H ${x + 26}` },
};

/** Filled ghost "o": dome, straight sides, three-point wavy hem, eyes cut out (evenodd). */
function ghostPath(x: number) {
  const hem = 64, sc = 46 / 3; // floats: sits 6 units above the other letters
  const eye = (cx: number) => `M ${cx - 3.6} 37 a 3.6 5.2 0 1 0 7.2 0 a 3.6 5.2 0 1 0 -7.2 0`;
  return (
    `M ${x} 39 A 23 23 0 0 1 ${x + 46} 39 V ${hem}` +
    ` A ${sc / 2} 6 0 0 0 ${x + 46 - sc} ${hem} A ${sc / 2} 6 0 0 0 ${x + 46 - 2 * sc} ${hem} A ${sc / 2} 6 0 0 0 ${x} ${hem} Z ` +
    eye(x + 15.5) + " " + eye(x + 30.5)
  );
}

const TEXT = "ghostbuster";
let cursor = 0;
const LAYOUT = TEXT.split("").map((c) => {
  const g = GLYPHS[c];
  const x = cursor;
  cursor += g.w + GAP;
  return { c, x, g };
});
const WIDTH = cursor - GAP;

export default function Wordmark({ height = 26, className = "" }: { height?: number; className?: string }) {
  return (
    <svg className={className} height={height} viewBox={`-1 0 ${WIDTH + 2} 94`} role="img" aria-label="GhostBuster"
      style={{ width: "auto", overflow: "visible" }}>
      <g fill="none" stroke="currentColor" strokeWidth={W} strokeLinecap="round" strokeLinejoin="round">
        {LAYOUT.filter((l) => !l.g.ghost).map((l, i) => <path key={i} d={l.g.d!(l.x)} />)}
      </g>
      {LAYOUT.filter((l) => l.g.ghost).map((l, i) => (
        <path key={i} d={ghostPath(l.x)} fillRule="evenodd" style={{ fill: "var(--terra)" }} className="wordmark-ghost" />
      ))}
    </svg>
  );
}
