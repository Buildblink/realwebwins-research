import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getPainPointById } from "@/lib/painpoints/queryPainPoints";
import { StudioClient } from "@/app/pain/[id]/studio-client";

export const dynamic = "force-dynamic";

export default async function PainStudioPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const painPoint = await getPainPointById(id);

  if (!painPoint) {
    notFound();
  }

  return (
    <AppShell>
      <StudioClient painPoint={painPoint} />
    </AppShell>
  );
}
