import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Newsreader } from "next/font/google";
import Link from "next/link";
import DemoPanel from "@/components/DemoPanel";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const display = Newsreader({ variable: "--font-display", subsets: ["latin"], style: ["normal", "italic"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GhostBuster",
  description: "Find providers who aren't really taking patients, call the rest for you, and document timely-access failures.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${display.variable} ${mono.variable} font-sans antialiased min-h-screen`}>
        {/* Honesty rule: crisis line on every screen, including the first. Hidden when printing. */}
        <div className="sticky top-0 z-50 bg-ink px-4 py-2 text-center text-sm font-medium text-paper print:hidden">
          In crisis? Call or text{" "}
          <a href="tel:988" className="font-bold underline decoration-2 underline-offset-2">
            988
          </a>{" "}
          — the Suicide &amp; Crisis Lifeline, 24/7
        </div>
        <header className="relative z-20 border-b border-line bg-paper print:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3.5">
            <Link href="/" className="display text-2xl font-semibold" aria-label="GhostBuster home">
              Ghost<span className="text-accent">Buster</span>
            </Link>
            <span className="text-right text-sm text-ink/60">Evidence log + templates · not legal advice</span>
          </div>
        </header>
        {children}
        <DemoPanel />
      </body>
    </html>
  );
}
