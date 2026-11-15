"use client";
import { useEffect, useRef } from "react";

/** One frame of the healthcare ghost: shaded silhouette with a rippling hem, a medical cross on the chest
 *  (cleared ring so it reads as a badge) and a two-tube stethoscope. Returns HTML with
 *  <span class="gx-cross"> / <span class="gx-steth">. Generated locally from numbers only, no user input. */
export type GhostCell = { ch: string[]; cl: number[] };

/** Character classes: 0 body, 1 cross (teal), 2 stethoscope (ink), 3 pale ghost, 4 scrub cap (teal). */
export type GhostOpts = { doctor?: boolean; cap?: boolean };

/** The ghost as a character grid. `doctor` adds the chest cross + stethoscope (default on); `cap` adds a scrub cap. */
export function ghostGrid(W: number, H: number, t: number, blink: boolean, opts: GhostOpts = {}): GhostCell[] {
  const { doctor = true, cap = false } = opts;
  const ramp = " .:-=+*#%@";
  const head = H * 0.42;
  const cx = W / 2 - 0.5;
  const rows: { ch: string[]; cl: number[]; m: boolean[] }[] = [];
  for (let y = 0; y < H; y++) {
    const ch: string[] = [], cl: number[] = [], m: boolean[] = [];
    for (let x = 0; x < W; x++) {
      const nx = (x - W / 2 + 0.5) / (W / 2), ny = (y - head) / head;
      let inside: boolean;
      if (y <= head) inside = nx * nx + ny * ny <= 1;
      else {
        const hem = H - 1 - (1 + Math.sin((x / W) * Math.PI * 6 + t)) * 1.5;
        inside = Math.abs(nx) <= 1 && y < hem;
      }
      const ey = head * 1.02, erx = W * 0.075, ery = blink ? 0.6 : H * 0.1;
      const eyeL = ((x - W * 0.33) / erx) ** 2 + ((y - ey) / ery) ** 2 < 1;
      const eyeR = ((x - W * 0.67) / erx) ** 2 + ((y - ey) / ery) ** 2 < 1;
      const mouth = ((x - W / 2) / (W * 0.07)) ** 2 + ((y - (head + H * 0.2)) / (H * 0.045)) ** 2 < 1;
      m.push(inside && !eyeL && !eyeR && !mouth);
      if (!inside || eyeL || eyeR || mouth) { ch.push(" "); cl.push(0); continue; }
      const light = 1 - Math.min(1, Math.hypot(nx + 0.55, ny + 0.9) / 3.1);
      ch.push(ramp[Math.max(3, Math.min(9, Math.round(light * 10)))]);
      cl.push(0);
    }
    rows.push({ ch, cl, m });
  }
  const put = (x: number, y: number, c: string, k: number) => {
    x = Math.round(x);
    if (y >= 0 && y < H && x >= 0 && x < W && rows[y].m[x]) { rows[y].ch[x] = c; rows[y].cl[x] = k; }
  };
  const clr = (x: number, y: number) => {
    x = Math.round(x);
    if (y >= 0 && y < H && x >= 0 && x < W && rows[y].ch[x] !== " ") { rows[y].ch[x] = " "; rows[y].cl[x] = 0; }
  };
  if (cap) {
    // scrub cap over the top of the head: textured crown, a band row at the brim, a tie knot on the right
    const brim = Math.round(head * 0.48);
    for (let y = 0; y <= brim; y++)
      for (let x = 0; x < W; x++)
        if (rows[y].m[x]) put(x, y, y === brim ? "=" : (x + y) % 3 === 0 ? "#" : "%", 4);
    const kx = Math.round(W * 0.86);
    for (const [dx, dy, c] of [[0, 0, "o"], [1, 1, "\\"], [-1, 1, "/"]] as [number, number, string][]) {
      const x = kx + dx, y = brim + dy;
      if (y < H && x < W && rows[y].ch[x] !== undefined) { rows[y].ch[x] = c; rows[y].cl[x] = 4; }
    }
  }
  if (!doctor) return rows;
  // medical cross on the chest, with a clear ring
  const cy = Math.round(head + H * 0.33), vh = Math.max(1, Math.round(H * 0.065)), hw = Math.round(W * 0.11), vw = Math.max(1, Math.round(W * 0.04));
  const inCross = (dx: number, dy: number) => (Math.abs(dx) <= vw && dy >= -vh && dy <= vh + 1) || (dy >= 0 && dy <= 1 && Math.abs(dx) <= hw);
  for (let y = cy - vh - 1; y <= cy + vh + 2; y++)
    for (let x = 0; x < W; x++) {
      const dx = x - cx, dy = y - cy;
      if (inCross(dx, dy)) put(x, y, "@", 1);
      else if (inCross(dx - 1, dy) || inCross(dx + 1, dy) || inCross(dx, dy - 1) || inCross(dx, dy + 1) || inCross(dx - 2, dy) || inCross(dx + 2, dy)) clr(x, y);
    }
  // stethoscope: two tubes from the neck, chest piece on the right
  const y0 = Math.round(head - 1), y1 = Math.round(head + H * 0.3), s = 0.32;
  for (let y = y0; y <= y1; y++) {
    const l = W * 0.24 + (y - y0) * s, r = W * 0.76 - (y - y0) * s;
    clr(l - 1, y); put(l, y, "|", 2); put(l + 1, y, "|", 2); clr(l + 2, y);
    clr(r - 2, y); put(r - 1, y, "|", 2); put(r, y, "|", 2); clr(r + 1, y);
  }
  const lx = W * 0.24 + (y1 - y0) * s;
  clr(lx - 1, y1 + 1); put(lx, y1 + 1, "\\", 2); put(lx + 1, y1 + 1, "/", 2); clr(lx + 2, y1 + 1);
  const px = W * 0.76 - (y1 - y0) * s - 0.5, py = y1 + 1;
  for (let dy = -1; dy <= 3; dy++) for (let dx = -4; dx <= 4; dx++) clr(px + dx, py + dy);
  put(px - 2, py, "/", 2); put(px - 1, py, "@", 2); put(px, py, "@", 2); put(px + 1, py, "@", 2); put(px + 2, py, "\\", 2);
  put(px - 2, py + 1, "|", 2); put(px - 1, py + 1, "(", 1); put(px, py + 1, "+", 1); put(px + 1, py + 1, ")", 1); put(px + 2, py + 1, "|", 2);
  put(px - 2, py + 2, "\\", 2); put(px - 1, py + 2, "@", 2); put(px, py + 2, "@", 2); put(px + 1, py + 2, "@", 2); put(px + 2, py + 2, "/", 2);
  return rows;
}

/** Grid rows -> HTML with <span class="gx-cross|gx-steth"> runs. Characters are generated locally (no user input). */
export function gridHtml(rows: GhostCell[]): string {
  const cls = ["", "gx-cross", "gx-steth", "gx-pale", "gx-cap"];
  return rows
    .map((r) => {
      let o = "", cur = 0, buf = "";
      const flush = () => { if (!buf) return; o += cur ? `<span class="${cls[cur]}">${buf}</span>` : buf; buf = ""; };
      r.ch.forEach((c, i) => { if (r.cl[i] !== cur) { flush(); cur = r.cl[i]; } buf += c; });
      flush();
      return o;
    })
    .join("\n");
}

export function ghostFrame(W: number, H: number, t: number, blink: boolean): string {
  return gridHtml(ghostGrid(W, H, t, blink));
}

const RAMP = " .:-=+*#%@";
const hash = (x: number, y: number, z = 0) => {
  const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return v - Math.floor(v);
};

/** Pale see-through ghost (m=0) decoding top-down into the full-color doctor ghost with a scrub cap (m=1). */
export function materializeFrame(W: number, H: number, t: number, blink: boolean, m: number): string {
  if (m >= 1) return gridHtml(ghostGrid(W, H, t, blink, { cap: true }));
  const pale = ghostGrid(W, H, t, blink, { doctor: false });
  const doc = ghostGrid(W, H, t, blink, { cap: true });
  const out: GhostCell[] = pale.map((row, y) => {
    const ch: string[] = [], cl: number[] = [];
    row.ch.forEach((pc, x) => {
      const dc = doc[y].ch[x];
      const tau = 0.06 + 0.86 * (0.6 * (y / H) + 0.4 * hash(x, y, 2));
      if (Math.abs(m - tau) < 0.07 && (pc !== " " || dc !== " ")) { ch.push(RAMP[1 + Math.floor(hash(x, y, Math.floor(t * 3)) * 9)]); cl.push(0); }
      else if (m > tau) { ch.push(dc); cl.push(doc[y].cl[x]); }
      else { ch.push(pc); cl.push(pc === " " ? 0 : 3); }
    });
    return { ch, cl };
  });
  return gridHtml(out);
}

/** The mascot. `animated`: rippling hem + random blink every 3–6.5s (one still frame under reduced motion). */
/** The mascot. `animated`: rippling hem + random blink every 3–6.5s. `materialize`: starts as a pale ghost and
 *  decodes into the doctor ghost (scrub cap, cross, stethoscope) over ~2.4s; hover replays it.
 *  Reduced motion: one still frame of the finished doctor ghost. */
export default function AsciiGhost({ id, width = 42, height = 30, animated = false, materialize = false, className = "", style }: {
  id?: string; width?: number; height?: number; animated?: boolean; materialize?: boolean; className?: string; style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLPreElement>(null);
  const start = useRef(0);
  const render = (t: number, blink: boolean, m: number) =>
    materialize ? materializeFrame(width, height, t, blink, m) : ghostFrame(width, height, t, blink);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { el.innerHTML = render(0, false, 1); return; }
    if (!animated) return;
    start.current = performance.now() + 700;
    let t = 0, next = performance.now() + 3200, blinkUntil = 0;
    const iv = setInterval(() => {
      const now = performance.now();
      if (now > next) { blinkUntil = now + 140; next = now + 3000 + Math.random() * 3500; }
      t += 0.35;
      const m = Math.min(1, Math.max(0, (now - start.current) / 2400));
      el.innerHTML = render(t, now < blinkUntil, m);
      el.style.setProperty("--m", String(m));
    }, 120);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animated, materialize, width, height]);
  const replay = () => {
    if (materialize && performance.now() - start.current > 2600) start.current = performance.now();
  };
  return (
    <pre ref={ref} id={id} aria-hidden="true" className={className} style={{ ...style, ...(materialize ? { ["--m" as string]: 0 } : {}) }}
      onMouseEnter={replay} data-materialize={materialize || undefined}
      dangerouslySetInnerHTML={{ __html: render(0, false, materialize ? 0 : 1) }} />
  );
}
