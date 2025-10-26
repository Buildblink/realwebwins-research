"use client";

import { useState } from "react";
import Link from "next/link";

interface DownloadModalProps {
  mvpId: string;
  triggerLabel?: string;
}

export function DownloadModal({ mvpId, triggerLabel = "Download Pack" }: DownloadModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-[#00ffe0]/20 px-4 py-2 text-sm font-medium text-[#00ffe0] transition hover:bg-[#00ffe0]/30"
      >
        {triggerLabel}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#11131f] p-6 shadow-xl">
            <header className="mb-4">
              <h3 className="text-lg font-semibold text-white">Download MVP Pack</h3>
              <p className="mt-1 text-sm text-zinc-400">
                Grab the Markdown summary, validation report, and full transcript as a ZIP file.
              </p>
            </header>
            <div className="flex flex-col gap-3 text-sm text-zinc-300">
              <Link
                href={`/api/export/mvp/${mvpId}`}
                className="rounded-lg border border-white/10 px-3 py-2 text-center transition hover:bg-white/5"
              >
                Download ZIP
              </Link>
            </div>
            <footer className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-white/10 px-3 py-1 text-sm text-zinc-300 hover:bg-white/5"
              >
                Close
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}
