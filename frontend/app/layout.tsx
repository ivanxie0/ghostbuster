import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next, Schibsted_Grotesk } from "next/font/google";
import Link from "next/link";
import DemoPanel from "@/components/DemoPanel";
import GhostMark from "@/components/GhostMark";
import ThemeToggle from "@/components/ThemeToggle";
import "./globals.css";

const heading = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-heading" });
const body = Atkinson_Hyperlegible_Next({ subsets: ["latin"], variable: "--font-body", adjustFontFallback: false });
const mono = Atkinson_Hyperlegible_Mono({ subsets: ["latin"], variable: "--font-mono-src", adjustFontFallback: false });

export const metadata: Metadata = {
  title: "GhostBuster",
  description: "Find providers who aren't really taking patients, call the rest for you, and document timely-access failures.",
};

// Runs before paint: saved choice, else the OS setting. No flash of the wrong theme.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("gb-theme");if(!t)t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="light"}})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light" className={`${heading.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      {/* suppressHydrationWarning: browser extensions (e.g. Grammarly) add attributes to <body> */}
      <body className="min-h-screen" suppressHydrationWarning>
        <a className="skip-link" href="#main">Skip to content</a>
        {/* Honesty rule: crisis line on every screen, including the first. Hidden when printing. */}
        <div className="crisis print:hidden" role="region" aria-label="Crisis support">
          In crisis? Call or text <a href="tel:988">988</a> to reach the Suicide &amp; Crisis Lifeline, any time.
        </div>
        <header className="site-header print:hidden">
          <div className="wrap">
            <Link className="brand" href="/" aria-label="GhostBuster home">
              <GhostMark />
              GhostBuster
            </Link>
            <nav className="nav" aria-label="Main">
              <Link className="hide-sm" href="/#how">How it works</Link>
              <Link className="hide-sm" href="/#rights">Your rights</Link>
              <Link className="hide-sm" href="/#team">About us</Link>
              <span className="t-small" style={{ color: "var(--ink-3)", whiteSpace: "nowrap" }}>
                <span className="legal-long">Evidence log + templates · not legal advice</span>
                <span className="legal-short">Not legal advice</span>
              </span>
              <ThemeToggle />
              <Link className="btn btn-primary cta-header" href="/search">
                Find care <span className="arrow" aria-hidden="true">→</span>
              </Link>
            </nav>
          </div>
        </header>
        <div id="main">{children}</div>
        <footer className="site-footer print:hidden">
          <div className="wrap flex flex-wrap justify-between gap-x-7 gap-y-3 py-7">
            <span>© 2026 GhostBuster · Evidence log + templates, not legal advice</span>
            <nav aria-label="Footer" className="flex flex-wrap gap-[18px]">
              <Link href="/how">How it works</Link>
              <Link href="/map">Ghost Map</Link>
              <Link href="/#faq">Common questions</Link>
            </nav>
            <span>Content last reviewed Nov 15, 2026</span>
            <span className="basis-full text-xs opacity-80">
              Photos via <a href="https://unsplash.com/license">Unsplash</a> (free license):{" "}
              <a href="https://unsplash.com/photos/egCFrNJ6Djw">Vitaly Gariev</a>,{" "}
              <a href="https://unsplash.com/photos/8WYkI3cEZm8">Vitaly Gariev</a>,{" "}
              <a href="https://unsplash.com/photos/tl447mekwuQ">National Cancer Institute</a>,{" "}
              <a href="https://unsplash.com/photos/rqdWlkRzerg">Navy Medicine</a>.
            </span>
          </div>
        </footer>
        <DemoPanel />
      </body>
    </html>
  );
}
