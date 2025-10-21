import { ResearchForm } from "@/components/ResearchForm";

export default function ResearchPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div className="space-y-2 text-center">
        <h1 className="font-heading text-3xl font-semibold text-slate-900">
          Run New Research
        </h1>
        <p className="text-sm text-slate-500">
          Capture your idea, run the Claude pipeline, and store results in the vault.
        </p>
      </div>
      <div className="rounded-2xl border border-foreground/10 bg-white/70 p-6 shadow-inner">
        <ResearchForm />
      </div>
    </main>
  );
}
