"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FileDescriptor {
  path: string;
  mime: string;
  tier?: string | null;
  size: number;
  preview?: string | null;
}

interface PreviewFileTreeProps {
  files: Record<string, FileDescriptor>;
  activePath: string | null;
  onSelect: (path: string) => void;
}

export function PreviewFileTree({
  files,
  activePath,
  onSelect,
}: PreviewFileTreeProps) {
  const nodes = useMemo(() => buildTree(files), [files]);

  return (
    <div className="flex h-full flex-col overflow-auto rounded-lg border border-slate-800 bg-slate-950/60 p-3">
      <ul className="space-y-1 text-sm text-slate-300">
        {nodes.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            activePath={activePath}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </div>
  );
}

interface TreeNodeData {
  name: string;
  path: string;
  children: TreeNodeData[];
  isDir: boolean;
}

function TreeNode({
  node,
  activePath,
  onSelect,
  depth = 0,
}: {
  node: TreeNodeData;
  activePath: string | null;
  onSelect: (path: string) => void;
  depth?: number;
}) {
  const indent = depth * 12;
  const isActive = node.path === activePath;

  return (
    <li>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "w-full justify-start gap-2 rounded-md px-2 py-1.5 text-left font-normal text-slate-200 hover:bg-slate-800/60",
          isActive && "bg-slate-800 text-slate-50"
        )}
        style={{ paddingLeft: indent + 12 }}
        onClick={() => {
          if (!node.isDir) onSelect(node.path);
        }}
        disabled={node.isDir}
      >
        {node.isDir ? "📁" : "📄"} {node.name}
      </Button>
      {node.children.length > 0 ? (
        <ul className="mt-1 space-y-1">
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              activePath={activePath}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function buildTree(files: Record<string, FileDescriptor>) {
  const root: Record<string, TreeNodeData> = {};

  Object.keys(files).forEach((path) => {
    const parts = path.split("/");
    let current = root;
    let currentPath = "";
    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (!current[part]) {
        current[part] = {
          name: part,
          path: currentPath,
          children: [],
          isDir: index < parts.length - 1,
        };
      }
      if (index < parts.length - 1) {
        const next = current[part];
        if (!next.children) {
          next.children = [];
        }
        current = mapChildren(next.children);
      }
    });
  });

  return Object.values(root).map(sortNode);
}

function mapChildren(children: TreeNodeData[]) {
  return Object.fromEntries(children.map((child) => [child.name, child]));
}

function sortNode(node: TreeNodeData): TreeNodeData {
  if (node.children.length > 0) {
    node.children = node.children.map(sortNode).sort(compareNodes);
  }
  return node;
}

function compareNodes(a: TreeNodeData, b: TreeNodeData) {
  if (a.isDir && !b.isDir) return -1;
  if (!a.isDir && b.isDir) return 1;
  return a.name.localeCompare(b.name);
}
