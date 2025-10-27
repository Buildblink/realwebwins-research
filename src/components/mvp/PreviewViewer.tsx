"use client";

import { useMemo, useState } from "react";
import { PreviewFileTree, type FileDescriptor } from "@/components/mvp/PreviewFileTree";
import { PreviewPane } from "@/components/mvp/PreviewPane";

interface PreviewViewerProps {
  files: Record<string, FileDescriptor>;
  userTier?: string | null;
}

export function PreviewViewer({ files, userTier }: PreviewViewerProps) {
  const firstPath = useMemo(
    () => Object.keys(files).sort()[0] ?? null,
    [files]
  );
  const [activePath, setActivePath] = useState<string | null>(firstPath);

  return (
    <div className="mx-auto flex min-h-[720px] max-w-7xl gap-6">
      <div className="w-64">
        <PreviewFileTree
          files={files}
          activePath={activePath}
          onSelect={(path) => setActivePath(path)}
        />
      </div>
      <div className="flex min-w-0 flex-1">
        <PreviewPane
          filePath={activePath}
          file={activePath ? files[activePath] : undefined}
          userTier={userTier}
        />
      </div>
    </div>
  );
}
