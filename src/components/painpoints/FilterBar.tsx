"use client";

interface FilterBarProps {
  categories: string[];
  niches: string[];
  sources: string[];
  audiences: string[];
  selectedCategory: string;
  selectedNiche: string;
  selectedSource: string;
  selectedAudience: string;
  hasPlaybook: boolean;
  onCategoryChange: (category: string) => void;
  onNicheChange: (niche: string) => void;
  onSourceChange: (source: string) => void;
  onAudienceChange: (audience: string) => void;
  onHasPlaybookChange: (hasPlaybook: boolean) => void;
}

export function FilterBar({
  categories,
  niches,
  sources,
  audiences,
  selectedCategory,
  selectedNiche,
  selectedSource,
  selectedAudience,
  hasPlaybook,
  onCategoryChange,
  onNicheChange,
  onSourceChange,
  onAudienceChange,
  onHasPlaybookChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="audience-filter" className="text-xs font-medium text-slate-600">
          Audience
        </label>
        <select
          id="audience-filter"
          value={selectedAudience}
          onChange={(e) => onAudienceChange(e.target.value)}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All Audiences</option>
          {audiences.map((audience) => (
            <option key={audience} value={audience}>
              {audience === "creator" ? "Creators" : "Consumers"}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="category-filter" className="text-xs font-medium text-slate-600">
          Category
        </label>
        <select
          id="category-filter"
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="niche-filter" className="text-xs font-medium text-slate-600">
          Niche
        </label>
        <select
          id="niche-filter"
          value={selectedNiche}
          onChange={(e) => onNicheChange(e.target.value)}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All Niches</option>
          {niches.map((niche) => (
            <option key={niche} value={niche}>
              {niche}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="source-filter" className="text-xs font-medium text-slate-600">
          Source
        </label>
        <select
          id="source-filter"
          value={selectedSource}
          onChange={(e) => onSourceChange(e.target.value)}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All Sources</option>
          {sources.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5 justify-end">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={hasPlaybook}
            onChange={(e) => onHasPlaybookChange(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-secondary focus:ring-2 focus:ring-secondary/20 cursor-pointer"
          />
          <span className="text-sm font-medium text-slate-700">
            Has Playbook
          </span>
        </label>
      </div>
    </div>
  );
}
