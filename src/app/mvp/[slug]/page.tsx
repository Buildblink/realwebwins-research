import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getMVPOutput } from "@/lib/mvp/outputs";
import { getAgentSession } from "@/lib/agents/sessions";
import { ResultClient } from "@/app/mvp/[slug]/result-client";

type Params = Promise<{ slug: string }>;

export const dynamic = "force-dynamic";

export default async function MVPPage(props: { params: Params }) {
  const { slug } = await props.params;
  const output = await getMVPOutput(slug);
  if (!output) {
    notFound();
  }

  const session = await getAgentSession(output.session_id);

  return (
    <AppShell>
      <ResultClient output={output} session={session} />
    </AppShell>
  );
}
