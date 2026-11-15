import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import DemoPanel from "@/components/DemoPanel";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GhostBuster",
  description: "Find ghost listings in your insurance directory and document timely-access failures.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased min-h-screen`}>
        {/* Honesty rule: crisis line on every screen, including the first. Hidden when printing. */}
        <div className="sticky top-0 z-50 bg-red-700 text-white text-center text-base font-semibold py-2 print:hidden">
          In crisis? Call or text{" "}
          <a href="tel:988" className="underline decoration-2 underline-offset-2">
            988
          </a>{" "}
          — the Suicide &amp; Crisis Lifeline, 24/7
        </div>
        <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 print:hidden">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <span aria-hidden className="text-2xl">👻</span> GhostBuster
          </Link>
          <span className="text-sm text-zinc-400">Evidence log + templates · not legal advice</span>
        </header>
        {children}
        <DemoPanel />
      </body>
    </html>
  );
}
