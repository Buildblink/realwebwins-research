"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRecentMVPs, type StoredMVP } from "@/lib/storage/localSessions";

export function RecentMVPs() {
  const [items, setItems] = useState<StoredMVP[]>([]);

  useEffect(() => {
    setItems(getRecentMVPs());
  }, []);

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Recent MVP Builds
        </h3>
      </header>
      <div className="flex flex-col gap-3 text-sm text-zinc-300">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/mvp/${encodeURIComponent(item.id)}`}
            className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2 transition hover:border-[#00ffe0]/40 hover:bg-[#00ffe0]/10"
          >
            <div>
              <p className="font-medium text-white">{item.title ?? "Untitled MVP"}</p>
              <p className="text-xs text-zinc-400">
                {new Date(item.timestamp).toLocaleString()} · Validation{" "}
                {((item.validationScore ?? 0) * 100).toFixed(0)}%
              </p>
            </div>
            <span className="text-xs text-[#00ffe0]">View →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
