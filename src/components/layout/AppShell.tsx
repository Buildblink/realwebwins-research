"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/discover", label: "Discover" },
  { href: "/dashboard", label: "Dashboard" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1117] via-[#101321] to-[#161a23] text-zinc-100">
      <header className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 pb-6 pt-10 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="rounded-full border border-[#00ffe0]/30 px-3 py-1 text-xs uppercase tracking-[0.3em] text-[#00ffe0] transition hover:border-[#00ffe0]/60">
            Realwebwins
          </Link>
          <nav className="hidden gap-2 md:flex">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-[#00ffe0]/20 text-[#00ffe0]"
                      : "text-zinc-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="max-w-xl">
          <h1 className="text-3xl font-semibold text-white md:text-4xl">
            AI Studio Hub
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Explore validated pain points, watch autonomous agents collaborate in real time, and leave with an MVP blueprint you can ship.
          </p>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 pb-16">
        {children}
      </main>
    </div>
  );
}
