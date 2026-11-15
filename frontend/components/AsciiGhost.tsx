"use client";
import { useEffect, useRef } from "react";

/** One frame of the healthcare ghost: shaded silhouette with a rippling hem, a medical cross on the chest
 *  (cleared ring so it reads as a badge) and a two-tube stethoscope. Returns HTML with
 *  <span class="gx-cross"> / <span class="gx-steth">. Generated locally from numbers only, no user input. */
export function ghostFrame(W: number, H: number, t: number, blink: boolean): string {
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
  const cls = ["", "gx-cross", "gx-steth"];
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

/** The mascot. `animated`: rippling hem + random blink every 3–6.5s (one still frame under reduced motion). */
export default function AsciiGhost({ id, width = 42, height = 30, animated = false, className = "", style }: {
  id?: string; width?: number; height?: number; animated?: boolean; className?: string; style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLPreElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !animated || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let t = 0, next = performance.now() + 3200, blinkUntil = 0;
    const iv = setInterval(() => {
      const now = performance.now();
      if (now > next) { blinkUntil = now + 140; next = now + 3000 + Math.random() * 3500; }
      t += 0.35;
      el.innerHTML = ghostFrame(width, height, t, now < blinkUntil);
    }, 120);
    return () => clearInterval(iv);
  }, [animated, width, height]);
  return (
    <pre ref={ref} id={id} aria-hidden="true" className={className} style={style}
      dangerouslySetInnerHTML={{ __html: ghostFrame(width, height, 0, false) }} />
  );
}
