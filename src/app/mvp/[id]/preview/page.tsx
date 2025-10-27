import { cookies } from "next/headers";
import { PreviewViewer } from "@/components/mvp/PreviewViewer";
import { normalizeTier } from "@/middleware/tierGate";

interface ProjectResponse {
  success: boolean;
  files: Record<string, { mime?: string; size?: number; tier?: string | null; preview?: string | null }>;
  created_at?: string | null;
}

async function fetchProject(id: string): Promise<ProjectResponse | null> {
  const base =
    process.env.API_BASE_URL ??
    "http://localhost:3000";
  const res = await fetch(`${base}/api/mvp/${id}/project`, {
    headers: { "Content-Type": "application/json" },
    next: { revalidate: 0 },
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`Failed to load project: ${res.statusText}`);
  }

  return (await res.json()) as ProjectResponse;
}

export default async function PreviewPage({
  params,
}: {
  params: { id: string };
}) {
  const cookieStore = cookies();
  const tier =
    cookieStore.get("rw-tier")?.value ??
    cookieStore.get("tier")?.value ??
    null;
  const userTier = normalizeTier(tier);

  const data = await fetchProject(params.id);

  if (!data) {
    return (
      <div className="flex min-h-[360px] items-center justify-center px-6 py-10 text-slate-400">
        No project snapshot yet. Generate deliverables to see the preview.
      </div>
    );
  }

  const files = Object.fromEntries(
    Object.entries(data.files).map(([path, entry]) => [
      path,
      {
        path,
        mime: entry.mime ?? "text/plain",
        size: entry.size ?? 0,
        tier: entry.tier ?? "free",
        preview: entry.preview ?? (typeof entry === "object" ? JSON.stringify(entry) : null),
      },
    ])
  );

  return (
    <div className="px-6 py-10 text-slate-100">
      <PreviewViewer files={files} userTier={userTier} />
    </div>
  );
}
