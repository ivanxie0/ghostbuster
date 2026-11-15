"use client";

/** Light/dark switch. The theme lives on <html data-theme> (set before paint in layout.tsx) and in localStorage "gb-theme". */
export default function ThemeToggle() {
  function toggle() {
    const h = document.documentElement;
    const next = h.dataset.theme === "dark" ? "light" : "dark";
    h.dataset.theme = next;
    try {
      localStorage.setItem("gb-theme", next);
    } catch {}
  }
  return (
    <button className="theme-toggle" type="button" onClick={toggle} aria-label="Switch between light and dark mode">
      <svg className="icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
      </svg>
      <svg className="icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="4.5" />
        <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
      </svg>
    </button>
  );
}
