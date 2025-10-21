import { redirect } from "next/navigation";
import VaultPageClient from "@/components/VaultPageClient";
import { fetchVaultProjects } from "@/lib/vaultData";

export const dynamic = "force-dynamic";

export default async function VaultAdminPage() {
  if (!process.env.ADMIN_MODE) {
    redirect("/");
  }

  try {
    const { projects, total } = await fetchVaultProjects({
      page: 1,
      pageSize: 20,
    });

    return (
      <main className="mx-auto max-w-6xl space-y-10 px-4 py-10">
        <VaultPageClient
          initialProjects={projects}
          initialPagination={{
            page: 1,
            pageSize: 20,
            total,
            totalPages: Math.max(1, Math.ceil(total / 20)),
          }}
        />
      </main>
    );
  } catch (error) {
    console.error("[vault.admin] failed to load", error);
    redirect("/");
  }
}
