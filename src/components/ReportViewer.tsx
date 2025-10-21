'use client';

import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";

interface ReportViewerProps {
  markdown?: string | null;
}

export default function ReportViewer({ markdown }: ReportViewerProps) {
  if (!markdown || markdown.trim().length < 10) {
    console.warn("ReportViewer: Missing or invalid markdown", markdown);
    return (
      <div className="p-6 text-center text-slate-500 bg-white/80 rounded-xl shadow-inner">
        No report available yet.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="prose prose-slate max-w-none p-6 bg-white/90 rounded-2xl shadow"
    >
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </motion.div>
  );
}
