"use client";
import { useEffect, useRef, useState } from "react";
import { type GhostCell, ghostGrid, gridHtml } from "@/components/AsciiGhost";
import { GERARDO_H, GERARDO_ROWS, GERARDO_TEAL, GERARDO_W } from "@/components/gerardoAscii";

// Bottom panel art: "Find out who's really there."
// Scroll 1: the ASCII ghost (a ghost listing) decodes, character by character, into an ASCII Gerardo whose
// lower body still trails off into the ghost's rippling hem. Scroll 2: a scan line resolves him into the real photo.
// One 64x48 character grid drives both figures; the photo sits exactly behind it. Reduced motion: final frame.

const C = GERARDO_W, R = GERARDO_H;
const RAMP = " .:-=+*#%@";
// Ghost placement inside the grid: centered on Gerardo's head/torso.
const GW = 40, GH = 40, GX = 18, GY = 1;

const clamp = (x: number) => Math.min(1, Math.max(0, x));
const span = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const hash = (x: number, y: number, z = 0) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Ghost -> Gerardo at morph m (0..1), hem ripple phase t. */
function frame(m: number, t: number, blink: boolean): string {
  const ghost = ghostGrid(GW, GH, t, blink);
  const out: GhostCell[] = [];
  for (let y = 0; y < R; y++) {
    const ch: string[] = [], cl: number[] = [];
    for (let x = 0; x < C; x++) {
      const gy = y - GY, gx = x - GX;
      const inG = gy >= 0 && gy < GH && gx >= 0 && gx < GW;
      const gc = inG ? ghost[gy].ch[gx] : " ";
      const gk = inG ? ghost[gy].cl[gx] : 0;
      // Gerardo, with a ghostly rippling hem and a thinning tail at the bottom
      let pc = GERARDO_ROWS[y][x];
      const pk = GERARDO_TEAL[y][x] === "1" ? 1 : 0;
      const hem = R - 2 - (1 + Math.sin((x / C) * Math.PI * 6 + t)) * 1.6;
      const tail = (y - (R - 11)) / 11;
      if (pc !== " " && (y > hem || (tail > 0 && hash(x, y) < tail * 0.75))) pc = " ";
      // decode threshold: top-down with noise; scrambled glyphs on the boundary
      const tau = 0.08 + 0.84 * (0.55 * (y / R) + 0.45 * hash(x, y, 1));
      if (Math.abs(m - tau) < 0.06 && (gc !== " " || pc !== " ")) {
        ch.push(RAMP[1 + Math.floor(hash(x, y, Math.floor(t * 3)) * 9)]);
        cl.push(0);
      } else if (m > tau) {
        ch.push(pc);
        cl.push(pc === " " ? 0 : pk);
      } else {
        ch.push(gc);
        cl.push(gk);
      }
    }
    out.push({ ch, cl });
  }
  return gridHtml(out);
}

const CAPTIONS = ["◌ ghost listing", "··· checking who's really there", "✓ Someone's really there."];

export default function GerardoReveal() {
  const stage = useRef<HTMLDivElement>(null);
  const pre = useRef<HTMLPreElement>(null);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const el = stage.current, txt = pre.current;
    if (!el || !txt) return;
    let m = 0, t = 0, blinkUntil = 0, nextBlink = performance.now() + 3000;

    // Stretch the character grid to exactly cover the photo box.
    const fit = () => {
      txt.style.transform = "none";
      const sx = el.clientWidth / txt.offsetWidth, sy = el.clientHeight / txt.offsetHeight;
      if (isFinite(sx) && isFinite(sy)) txt.style.transform = `scale(${sx}, ${sy})`;
    };
    const draw = () => { txt.innerHTML = frame(m, t, performance.now() < blinkUntil); };
    const set = (p: number) => {
      m = span(p, 0.15, 0.55);
      const real = span(p, 0.62, 0.92);
      el.style.setProperty("--real", String(real));
      el.style.setProperty("--scan", real > 0.01 && real < 0.99 ? "1" : "0");
      setPhase(real >= 0.98 ? 2 : m >= 0.5 ? 1 : 0);
      draw();
    };

    const ro = new ResizeObserver(fit);
    ro.observe(el);
    document.fonts?.ready.then(fit);
    fit();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { set(1); return () => ro.disconnect(); }

    const inner = el.closest(".gerardo-pin-inner") as HTMLElement | null;
    const panel = el.closest("section");
    let raf = 0;
    const measure = () => {
      raf = 0;
      const vh = window.innerHeight;
      // Panel background fades from the page color to orange as it scrolls into view (done before it pins).
      if (panel) panel.style.setProperty("--fade", String(clamp((vh - panel.getBoundingClientRect().top) / (vh * 0.7))));
      let p: number;
      if (inner && panel && getComputedStyle(inner).position === "sticky") {
        // Desktop: content is pinned; progress = how far we've scrolled through the tall panel.
        const top = parseFloat(getComputedStyle(inner).top) || 0;
        const r = panel.getBoundingClientRect();
        p = (top - r.top) / Math.max(1, r.height - inner.offsetHeight);
      } else {
        // Phones (no pin): from the stage entering the screen to its top reaching 20%.
        p = (vh - el.getBoundingClientRect().top) / (vh * 0.8);
      }
      set(clamp(p));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    // Hem ripple + blink, only while the stage is on screen.
    let iv: ReturnType<typeof setInterval> | null = null;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !iv) {
        iv = setInterval(() => {
          const now = performance.now();
          if (now > nextBlink) { blinkUntil = now + 140; nextBlink = now + 3000 + Math.random() * 3500; }
          t += 0.35;
          draw();
        }, 120);
      } else if (!e.isIntersecting && iv) { clearInterval(iv); iv = null; }
    });
    io.observe(el);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      if (iv) clearInterval(iv);
    };
  }, []);

  return (
    <figure className="gerardo m-0 justify-self-center">
      <div ref={stage} className="gerardo-stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="gerardo-real" src="/images/gerardo.webp" width={760} height={950}
          alt="A smiling person in a white coat and stethoscope, arms crossed" />
        <pre ref={pre} className="gerardo-ascii" aria-hidden="true" dangerouslySetInnerHTML={{ __html: frame(0, 0, false) }} />
        <div className="gerardo-scan" aria-hidden="true"><span>SCANNING</span></div>
      </div>
      <figcaption className="gerardo-caption">
        <span key={phase} className="flip">{CAPTIONS[phase]}</span>
      </figcaption>
    </figure>
  );
}
