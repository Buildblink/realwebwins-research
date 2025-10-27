import { cookies } from "next/headers";
import { DeliverableList } from "@/components/mvp/DeliverableList";
import { listMVPArtifacts } from "@/lib/mvp/artifacts";
import { listMVPExports } from "@/lib/mvp/exports";
import { getMVPOutput } from "@/lib/mvp/outputs";
import { normalizeTier } from "@/middleware/tierGate";

interface DeliverablesPageProps {
  params: { id: string };
}

export const revalidate = 0;

export default async function DeliverablesPage({ params }: DeliverablesPageProps) {
  const mvpId = params.id;
  const [output, artifacts, exports] = await Promise.all([
    getMVPOutput(mvpId),
    listMVPArtifacts(mvpId),
    listMVPExports(mvpId),
  ]);

  if (!output) {
    throw new Error("MVP not found");
  }

  const cookieStore = cookies();
  const tierCookie =
    cookieStore.get("rw-tier")?.value ??
    cookieStore.get("rw_tier")?.value ??
    cookieStore.get("tier")?.value ??
    null;
  const userTier = normalizeTier(tierCookie);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-slate-500">MVP Deliverables</p>
        <h1 className="text-3xl font-semibold text-slate-100">
          {output.title ?? "Generated MVP"} — Deliverables
        </h1>
        <p className="text-base text-slate-400">
          Explore generated artifacts, validation status, and premium exports. Your current tier:{" "}
          <span className="font-semibold text-slate-200">{userTier.toUpperCase()}</span>
        </p>
      </header>
      <DeliverableList
        mvpId={mvpId}
        artifacts={artifacts}
        exports={exports}
        userTier={userTier}
      />
    </main>
  );
}
