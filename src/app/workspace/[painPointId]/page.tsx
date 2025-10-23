'use client';

import { use, useEffect, useMemo, useRef, useState } from "react";
import { SectionTabs } from "@/components/workspace/SectionTabs";
import { SectionPanel } from "@/components/workspace/SectionPanel";
import {
  useDeliverables,
  useWorkspace,
  useWorkspaceCopilot,
  useWorkspaceSection,
  WorkspaceOutputRow,
  WorkspaceSectionId,
} from "@/hooks/useWorkspace";
import { CopilotInput } from "@/components/workspace/CopilotInput";
import { DeliverablesCard } from "@/components/workspace/DeliverablesCard";
import { RecommendationsSidebar } from "@/components/workspace/RecommendationsSidebar";
import { PublishModal } from "@/components/workspace/PublishModal";
import { ShareMenu } from "@/components/workspace/ShareMenu";
import { Button } from "@/components/ui/button";
import { RefreshCcw, ArrowLeft, Globe } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAnalytics, EVENT_TYPES } from "@/hooks/useAnalytics";

const FALLBACK_SECTIONS: Array<{
  id: WorkspaceSectionId;
  label: string;
  systemGoal: string;
}> = [
  {
    id: "understand",
    label: "Understand",
    systemGoal:
      "Summarize the pain point context, audience, severity, and supporting evidence.",
  },
  {
    id: "ideate",
    label: "Ideate",
    systemGoal:
      "Generate differentiated solution concepts with positioning and GTM hooks.",
  },
  {
    id: "build",
    label: "Build",
    systemGoal:
      "Lay out an MVP blueprint, recommended stack, and launch readiness checklist.",
  },
  {
    id: "validate",
    label: "Validate",
    systemGoal:
      "Craft validation experiments, pricing tests, and competitor benchmarks.",
  },
];

export default function WorkspacePage({
  params,
}: {
  params: Promise<{ painPointId: string }>;
}) {
  const { painPointId } = use(params);
  const [activeSection, setActiveSection] =
    useState<WorkspaceSectionId>("understand");
  const [showPublishModal, setShowPublishModal] = useState(false);

  const autoTriggered = useRef<Set<WorkspaceSectionId>>(new Set());
  const { trackEvent } = useAnalytics();

  const {
    data: workspace,
    isLoading,
    error: workspaceError,
    refresh,
    updateSectionOutput,
  } = useWorkspace(painPointId);

  const {
    generateSection,
    activeSection: generatingSection,
    isGenerating,
    error: sectionError,
  } = useWorkspaceSection(painPointId, {
    onSuccess: (output: WorkspaceOutputRow) => {
      updateSectionOutput(output);
      // Track section generation
      trackEvent(EVENT_TYPES.SECTION_GENERATED, {
        painPointId,
        workspaceId: workspace?.workspace?.id,
        section: output.section,
      });
    },
  });

  const {
    history,
    askQuestion,
    isLoading: isCopilotLoading,
    error: copilotError,
    reset: resetCopilot,
  } = useWorkspaceCopilot(painPointId);

  const {
    fetchDeliverables,
    isLoading: isExporting,
    error: deliverablesError,
  } = useDeliverables(painPointId);

  const sections = useMemo(() => {
    return workspace?.sections ?? FALLBACK_SECTIONS;
  }, [workspace?.sections]);

  // Track workspace opened on mount
  useEffect(() => {
    if (workspace) {
      trackEvent(EVENT_TYPES.WORKSPACE_OPENED, {
        painPointId,
        workspaceId: workspace.workspace.id,
        painPointText: workspace.painPoint.text,
        category: workspace.painPoint.category,
        niche: workspace.painPoint.niche,
      });
    }
  }, [workspace, painPointId, trackEvent]);

  useEffect(() => {
    if (!workspace) return;
    if (activeSection !== "understand") return;
    const currentOutput = workspace.outputs[activeSection];
    if (currentOutput || autoTriggered.current.has(activeSection)) {
      return;
    }
    autoTriggered.current.add(activeSection);
    void generateSection(activeSection);
  }, [activeSection, generateSection, workspace]);

  const onSelectSection = (section: WorkspaceSectionId) => {
    setActiveSection(section);
  };

  const painPoint = workspace?.painPoint;
  const output = workspace?.outputs?.[activeSection] ?? null;
  const systemGoal =
    sections.find((section) => section.id === activeSection)?.systemGoal ??
    FALLBACK_SECTIONS.find((section) => section.id === activeSection)
      ?.systemGoal ??
    "";

  return (
    <div className="min-h-screen bg-[#060608] pb-12 pt-14 text-zinc-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6">
        <TopBar
          workspaceName={workspace?.workspace?.title ?? "Workspace"}
          workspaceId={workspace?.workspace?.id}
          painPointId={painPointId}
          userId={workspace?.workspace?.user_id}
          onRefresh={async () => {
            trackEvent(EVENT_TYPES.WORKSPACE_REFRESHED, {
              painPointId,
              workspaceId: workspace?.workspace?.id,
            });
            await refresh();
          }}
          onPublish={() => setShowPublishModal(true)}
          isRefreshing={isLoading}
        />

        {workspaceError && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {workspaceError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
          <aside className="flex flex-col gap-4">
            <div className="flex h-full flex-col gap-4 rounded-2xl border border-white/5 bg-[#111113]/80 p-5">
              <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-[#22d3ee]">
                Pain Point Snapshot
              </h2>
              {painPoint ? (
                <PainPointSummary
                  text={painPoint.text}
                  audience={painPoint.audience}
                  category={painPoint.category}
                  niche={painPoint.niche}
                  source={painPoint.source}
                  proofLink={painPoint.proof_link}
                  relatedPlaybook={painPoint.related_playbook}
                />
              ) : (
                <p className="text-sm text-zinc-500">
                  Loading pain point context...
                </p>
              )}
            </div>

            {workspace && (
              <RecommendationsSidebar
                workspaceId={workspace.workspace.id}
                userId={workspace.workspace.user_id ?? undefined}
              />
            )}
          </aside>

          <main className="flex flex-col gap-5">
            <SectionTabs
              sections={sections.map((section) => ({
                id: section.id,
                label: section.label,
              }))}
              active={activeSection}
              onSelect={onSelectSection}
              generatingSection={generatingSection}
            />
            <SectionPanel
              section={activeSection}
              title={
                sections.find((section) => section.id === activeSection)?.label ??
                activeSection
              }
              systemGoal={systemGoal}
              output={output}
              painPointId={painPointId}
              workspaceId={workspace?.workspace?.id}
              playbookSlug={workspace?.painPoint?.related_playbook ?? undefined}
              isLoading={isLoading && !workspace}
              isGenerating={isGenerating}
              onGenerate={async (sectionId) => {
                await generateSection(sectionId);
              }}
              error={sectionError}
            />
          </main>

          <div className="flex h-full flex-col gap-5">
            <DeliverablesCard
              workspaceTitle={workspace?.workspace?.title ?? "workspace"}
              onExport={async () => {
                trackEvent(EVENT_TYPES.EXPORT_CLICKED, {
                  painPointId,
                  workspaceId: workspace?.workspace?.id,
                });
                const result = await fetchDeliverables();
                if (result) {
                  trackEvent(EVENT_TYPES.EXPORT_COMPLETED, {
                    painPointId,
                    workspaceId: workspace?.workspace?.id,
                  });
                }
                return result;
              }}
              isLoading={isExporting}
              error={deliverablesError}
            />
            <CopilotInput
              history={history}
              isLoading={isCopilotLoading}
              error={copilotError}
              onSubmit={async (question) => {
                trackEvent(EVENT_TYPES.COPILOT_ASKED, {
                  painPointId,
                  workspaceId: workspace?.workspace?.id,
                  questionLength: question.length,
                });
                await askQuestion(question);
              }}
              onReset={resetCopilot}
            />
          </div>
        </div>

        {/* Publish Modal */}
        {showPublishModal && workspace && (
          <PublishModal
            painPointId={painPointId}
            workspaceTitle={workspace.workspace.title}
            painPointText={workspace.painPoint.text}
            painPointCategory={workspace.painPoint.category}
            isPublished={!!workspace.workspace.published_workspace_id}
            onClose={() => setShowPublishModal(false)}
            onSuccess={() => refresh()}
          />
        )}
      </div>
    </div>
  );
}

function TopBar({
  workspaceName,
  workspaceId,
  painPointId,
  userId,
  onRefresh,
  onPublish,
  isRefreshing,
}: {
  workspaceName: string;
  workspaceId?: string;
  painPointId: string;
  userId?: string | null;
  onRefresh: () => Promise<void>;
  onPublish: () => void;
  isRefreshing: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-gradient-to-r from-[#111113] to-[#16161a] p-6 shadow-[0_0_35px_rgba(79,70,229,0.18)] md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-[#4f46e5]">
          Workspace System - Phase 12
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-100">
          {workspaceName}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {workspaceId && (
            <ShareMenu
              workspaceId={workspaceId}
              painPointId={painPointId}
              userId={userId ?? undefined}
            />
          )}
          <Button
            variant="outline"
            onClick={onPublish}
            className="border-[#22d3ee]/50 bg-[#17171c] text-xs text-zinc-200 hover:border-[#22d3ee]/70 hover:bg-[#1f1f23]"
          >
            <Globe className="mr-2 h-4 w-4" />
            Publish
          </Button>
          <Button
            variant="outline"
            onClick={() => onRefresh()}
            disabled={isRefreshing}
            className="border-[#4f46e5]/50 bg-[#17171c] text-xs text-zinc-200 hover:border-[#22d3ee]/70 hover:bg-[#1f1f23]"
          >
            <RefreshCcw className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")} />
            Refresh Snapshot
          </Button>
          <Button
            asChild
            variant="ghost"
            className="text-xs text-zinc-400 hover:text-zinc-100"
          >
            <Link href="/pain-points" className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Vault
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function PainPointSummary({
  text,
  audience,
  category,
  niche,
  source,
  proofLink,
  relatedPlaybook,
}: {
  text: string;
  audience: string | null;
  category: string | null;
  niche: string | null;
  source: string | null;
  proofLink: string | null;
  relatedPlaybook: string | null;
}) {
  return (
    <div className="flex flex-col gap-4 text-sm text-zinc-300">
      <p className="rounded-xl border border-white/5 bg-[#0e0e10]/70 p-4 text-zinc-200">
        {text}
      </p>
      <div className="grid grid-cols-1 gap-2 text-xs text-zinc-400">
        <Meta label="Audience" value={audience} />
        <Meta label="Category" value={category} />
        <Meta label="Niche" value={niche} />
        <Meta label="Source" value={source} />
        {proofLink && (
          <Link
            href={proofLink}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-[#22d3ee]/30 bg-[#0e0e10]/60 px-3 py-2 text-xs text-[#22d3ee] transition hover:border-[#22d3ee]/60 hover:text-[#5eead4]"
          >
            Proof Link -&gt;
          </Link>
        )}
        {relatedPlaybook && <Meta label="Linked Playbook" value={relatedPlaybook} />}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col rounded-lg border border-white/5 bg-[#0e0e10]/70 px-3 py-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#4f46e5]">
        {label}
      </span>
      <span className="text-xs text-zinc-200">{value}</span>
    </div>
  );
}




