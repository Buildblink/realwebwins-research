import { cookies } from "next/headers";
import { normalizeTier } from "@/middleware/tierGate";
import { DeployPanel } from "@/components/mvp/DeployPanel";

export default function DeployPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const tier =
    cookieStore.get("rw-tier")?.value ??
    cookieStore.get("tier")?.value ??
    null;
  const userTier = normalizeTier(tier);

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-10 text-slate-100">
      <h1 className="text-3xl font-semibold">Deploy Your MVP</h1>
      <p className="text-sm text-slate-400">
        Push generated project files to GitHub and optionally trigger a Vercel deploy.
      </p>
      <DeployPanel mvpId={params.id} userTier={userTier} />
    </div>
  );
}
