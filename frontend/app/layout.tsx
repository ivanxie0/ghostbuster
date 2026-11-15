import type { Metadata } from "next";
import { Cormorant_Garamond, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import DemoPanel from "@/components/DemoPanel";
import "./globals.css";

const display = Cormorant_Garamond({ variable: "--font-display", subsets: ["latin"], weight: ["400", "500", "600", "700"], style: ["normal", "italic"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GhostBuster",
  description: "Find ghost listings in your insurance directory and document timely-access failures.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${mono.variable} font-sans antialiased min-h-screen`}>
        {/* Honesty rule: crisis line on every screen, including the first. Hidden when printing. */}
        <div className="sticky top-0 z-50 bg-ink py-2 text-center font-mono text-sm font-medium tracking-wide text-paper print:hidden">
          In crisis? Call or text{" "}
          <a href="tel:988" className="bg-sun px-1.5 py-0.5 font-bold text-ink">
            988
          </a>{" "}
          — the Suicide &amp; Crisis Lifeline, 24/7
        </div>
        <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 print:hidden">
          <Link href="/" className="display text-3xl" aria-label="GhostBuster home">
            Ghost<span className="block-mark ml-0.5">buster</span>
          </Link>
          <span className="label text-right text-ink/60">Evidence log + templates · not legal advice</span>
        </header>
        {children}
        <DemoPanel />
      </body>
    </html>
  );
}
