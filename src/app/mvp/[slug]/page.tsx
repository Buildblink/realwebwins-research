import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { MVPCard } from "@/components/mvp/MVPCard";
import { DownloadModal } from "@/components/mvp/DownloadModal";
import { ChatPanel } from "@/components/agents/ChatPanel";
import { getMVPOutput } from "@/lib/mvp/outputs";
import { getAgentSession } from "@/lib/agents/sessions";

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
      <section className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="flex-1">
          <MVPCard output={output} />
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:w-64">
          <h3 className="text-sm font-semibold text-white">Downloads</h3>
          <p className="mt-2 text-xs text-zinc-400">
            Export the full MVP pack including markdown, validation summary, and transcripts.
          </p>
          <div className="mt-4">
            <DownloadModal mvpId={output.id} triggerLabel="Download ZIP" />
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Agent Transcript
        </h2>
        <ChatPanel transcript={session.transcript} />
      </section>
    </AppShell>
  );
}
