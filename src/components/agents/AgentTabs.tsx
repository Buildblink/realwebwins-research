"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs: Array<{ href: string; label: string }> = [
  { href: "/dashboard/agents", label: "Conversations" },
  { href: "/dashboard/agents/behavior", label: "Behaviors" },
  { href: "/dashboard/agents/memory", label: "Memory" },
  { href: "/dashboard/agents/reflections", label: "Reflections" },
  { href: "/dashboard/agents/network", label: "Network" },
  { href: "/dashboard/agents/analytics", label: "Analytics" },
  { href: "/dashboard/agents/leaderboard", label: "Leaderboard" },
];

export function AgentTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-2 rounded-lg border border-white/10 bg-[#111113] p-2">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              isActive
                ? "bg-indigo-500 text-white"
                : "text-zinc-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
