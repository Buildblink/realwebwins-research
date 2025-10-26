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
      <header className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 pb-6 pt-10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-[#00ffe0]">Realwebwins</p>
          <h1 className="text-3xl font-semibold text-white md:text-4xl">
            Pain Point → MVP Studio
          </h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-400">
            Search validated pain points and watch autonomous agents assemble an MVP blueprint in minutes.
          </p>
        </div>
        <nav className="flex gap-2">
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
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 pb-16">
        {children}
      </main>
    </div>
  );
}
