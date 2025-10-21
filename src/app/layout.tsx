import Link from "next/link";
import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { FeedbackWidget } from "@/components/FeedbackWidget";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RealWebWins Research System",
  description:
    "Validate business ideas in minutes with an AI research vault powered by Claude and Supabase.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentYear = new Date().getFullYear();
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} bg-background text-foreground antialiased`}
      >
        {plausibleDomain ? (
          <Script
            src="https://plausible.io/js/script.js"
            data-domain={plausibleDomain}
            strategy="lazyOnload"
          />
        ) : null}
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10">
          <header className="mb-12 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-primary/70">
                RealWebWins
              </p>
              <h1 className="font-heading text-3xl font-semibold text-slate-900 sm:text-4xl">
                Research System
              </h1>
            </div>
            <nav className="flex gap-3 text-sm text-foreground/70">
              <Link className="rounded-lg px-3 py-2 hover:bg-foreground/5" href="/">
                Home
              </Link>
              <Link
                className="rounded-lg px-3 py-2 hover:bg-foreground/5"
                href="/pain-points"
              >
                Pain Points
              </Link>
              <Link
                className="rounded-lg px-3 py-2 hover:bg-foreground/5"
                href="/cases"
              >
                Cases
              </Link>
              <Link
                className="rounded-lg px-3 py-2 hover:bg-foreground/5"
                href="/dashboard"
              >
                Dashboard
              </Link>
            </nav>
          </header>
          <main className="flex-1 pb-12">{children}</main>
          <footer className="border-t border-foreground/10 pt-6 text-xs text-foreground/60">
            Built with Next.js, Supabase, and Claude (mocked) - (c) {currentYear} RealWebWins
          </footer>
        </div>
        <FeedbackWidget />
      </body>
    </html>
  );
}
