import Link from "next/link";
import { VaultFeedPanels } from "@/components/VaultFeedPanels";
import { fetchVaultFeed } from "@/lib/vaultData";
import { buildVaultFeedSections } from "@/lib/vaultFeed";

export const dynamic = "force-dynamic";

export default async function VaultFeedPage() {
  const feedItems = await fetchVaultFeed({ limit: 20 });
  const sections = buildVaultFeedSections(feedItems);

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-12">
      <header className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Vault activity feed
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Watch the Realwebwins research agents keep public projects fresh.
              New ideas land in the vault continuously, and tracked entries get
              refreshed every week.
            </p>
          </div>
          <Link
            href="/vault"
            className="inline-flex items-center justify-center rounded-full border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:border-secondary hover:bg-secondary"
          >
            Explore the full vault
          </Link>
        </div>
      </header>

      <VaultFeedPanels
        topNew={sections.topNew}
        mostRefreshed={sections.mostRefreshed}
        layout="page"
      />
    </main>
  );
}
