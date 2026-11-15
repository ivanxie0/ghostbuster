"use client";
import { useEffect, useState } from "react";

/** Types each phrase, pauses, deletes, moves on. Shows the first phrase in full if motion is reduced. */
export default function Typewriter({ phrases }: { phrases: string[] }) {
  const [i, setI] = useState(0);
  const [n, setN] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [still, setStill] = useState(false);

  useEffect(() => {
    setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (still) return;
    const word = phrases[i];
    const t = setTimeout(
      () => {
        if (!deleting && n < word.length) setN(n + 1);
        else if (!deleting) setDeleting(true);
        else if (n > 0) setN(n - 1);
        else {
          setDeleting(false);
          setI((i + 1) % phrases.length);
        }
      },
      !deleting && n === word.length ? 1500 : deleting ? 28 : 60,
    );
    return () => clearTimeout(t);
  }, [i, n, deleting, still, phrases]);

  return (
    <span>
      {still ? phrases[0] : phrases[i].slice(0, n)}
      <span aria-hidden className="caret ml-0.5 inline-block w-[2px] translate-y-[0.15em] self-stretch bg-ink" style={{ height: "1.1em" }} />
    </span>
  );
}
