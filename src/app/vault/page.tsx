import VaultPublicPageClient from "@/components/VaultPublicPageClient";
import { VaultFeedPanels } from "@/components/VaultFeedPanels";
import {
  fetchVaultProjects,
  fetchVaultTags,
  fetchVaultFeed,
} from "@/lib/vaultData";
import { buildVaultFeedSections } from "@/lib/vaultFeed";

export const dynamic = "force-dynamic";

export default async function VaultPublicPage() {
  const [{ projects, total }, tagData, feedItems] = await Promise.all([
    fetchVaultProjects({
      page: 1,
      pageSize: 12,
      publicOnly: true,
    }),
    fetchVaultTags({ publicOnly: true }),
    fetchVaultFeed({ limit: 10 }),
  ]);
  const feedSections = buildVaultFeedSections(feedItems);

  return (
    <main className="mx-auto max-w-6xl space-y-12 px-4 py-12">
      <VaultFeedPanels
        topNew={feedSections.topNew}
        mostRefreshed={feedSections.mostRefreshed}
        layout="widget"
      />
      <VaultPublicPageClient
        initialProjects={projects}
        initialPagination={{
          page: 1,
          pageSize: 12,
          total,
          totalPages: Math.max(1, Math.ceil(total / 12)),
        }}
        initialTags={tagData}
      />
    </main>
  );
}
