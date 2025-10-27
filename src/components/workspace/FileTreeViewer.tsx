'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: FileNode[]
  size?: string
  tier?: 'free' | 'pro' | 'premium'
  locked?: boolean
}

interface FileTreeViewerProps {
  files: FileNode[]
  selectedFile?: string
  onSelectFile?: (path: string) => void
  searchQuery?: string
  onSearch?: (query: string) => void
}

export function FileTreeViewer({
  files,
  selectedFile,
  onSelectFile,
  searchQuery = '',
  onSearch,
}: FileTreeViewerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set([]))

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  // Filter files based on search
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files

    const filterNodes = (nodes: FileNode[]): FileNode[] => {
      return nodes.reduce((acc: FileNode[], node) => {
        if (node.type === 'file') {
          if (node.name.toLowerCase().includes(searchQuery.toLowerCase())) {
            acc.push(node)
          }
        } else if (node.children) {
          const filteredChildren = filterNodes(node.children)
          if (filteredChildren.length > 0) {
            acc.push({ ...node, children: filteredChildren })
          }
        }
        return acc
      }, [])
    }

    return filterNodes(files)
  }, [files, searchQuery])

  // Count stats
  const stats = useMemo(() => {
    const countFiles = (nodes: FileNode[]): number => {
      return nodes.reduce((total, node) => {
        if (node.type === 'file') return total + 1
        return total + (node.children ? countFiles(node.children) : 0)
      }, 0)
    }
    return {
      totalFiles: countFiles(files),
      filteredFiles: countFiles(filteredFiles),
    }
  }, [files, filteredFiles])

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-4 border-b border-white/10">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearch?.(e.target.value)}
          placeholder="🔍 Search files..."
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#00e5ff]/50"
        />
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredFiles.length > 0 ? (
          <div className="space-y-1">
            {filteredFiles.map((node) => (
              <FileTreeNode
                key={node.path}
                node={node}
                level={0}
                expandedFolders={expandedFolders}
                selectedFile={selectedFile}
                onToggleFolder={toggleFolder}
                onSelectFile={onSelectFile}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-zinc-500 text-sm">
            {searchQuery ? 'No files match your search' : 'No files to display'}
          </div>
        )}
      </div>

      {/* Stats Footer */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>{stats.filteredFiles} files</span>
          {searchQuery && stats.filteredFiles !== stats.totalFiles && (
            <span>of {stats.totalFiles} total</span>
          )}
        </div>
      </div>
    </div>
  )
}

// File Tree Node Component
function FileTreeNode({
  node,
  level,
  expandedFolders,
  selectedFile,
  onToggleFolder,
  onSelectFile,
}: {
  node: FileNode
  level: number
  expandedFolders: Set<string>
  selectedFile?: string
  onToggleFolder: (path: string) => void
  onSelectFile?: (path: string) => void
}) {
  const isExpanded = expandedFolders.has(node.path)
  const isSelected = selectedFile === node.path
  const isFolder = node.type === 'folder'

  const fileIcons: Record<string, string> = {
    tsx: '⚛️',
    ts: '📘',
    js: '📜',
    jsx: '⚛️',
    json: '📋',
    md: '📝',
    css: '🎨',
    html: '🌐',
    svg: '🖼️',
    png: '🖼️',
    jpg: '🖼️',
    gif: '🖼️',
    sql: '🗄️',
    yml: '⚙️',
    yaml: '⚙️',
    env: '🔐',
  }

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    return fileIcons[ext || ''] || '📄'
  }

  return (
    <div>
      <motion.div
        className={`
          flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all
          ${isSelected ? 'bg-[#00e5ff]/20 border-l-2 border-[#00e5ff]' : 'hover:bg-white/5'}
          ${node.locked ? 'opacity-50' : ''}
        `}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => {
          if (isFolder) {
            onToggleFolder(node.path)
          } else if (!node.locked) {
            onSelectFile?.(node.path)
          }
        }}
        whileHover={{ scale: 1.01 }}
      >
        {/* Expand/Collapse Icon */}
        {isFolder && (
          <motion.span
            className="text-zinc-400 text-xs"
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            ▶
          </motion.span>
        )}

        {/* Folder/File Icon */}
        <span className="text-sm">
          {isFolder ? (isExpanded ? '📂' : '📁') : getFileIcon(node.name)}
        </span>

        {/* File/Folder Name */}
        <span className="flex-1 text-sm text-zinc-200 truncate">{node.name}</span>

        {/* Locked Indicator */}
        {node.locked && <span className="text-xs">🔒</span>}

        {/* Tier Badge */}
        {node.tier && node.tier !== 'free' && (
          <span
            className={`
              px-1.5 py-0.5 rounded text-[9px] font-bold uppercase
              ${node.tier === 'pro' ? 'text-[#00e5ff] bg-[#00e5ff]/20' : 'text-[#b24bf3] bg-[#b24bf3]/20'}
            `}
          >
            {node.tier}
          </span>
        )}

        {/* File Size */}
        {!isFolder && node.size && (
          <span className="text-xs text-zinc-500">{node.size}</span>
        )}
      </motion.div>

      {/* Children (for folders) */}
      <AnimatePresence>
        {isFolder && isExpanded && node.children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {node.children.map((child) => (
              <FileTreeNode
                key={child.path}
                node={child}
                level={level + 1}
                expandedFolders={expandedFolders}
                selectedFile={selectedFile}
                onToggleFolder={onToggleFolder}
                onSelectFile={onSelectFile}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
