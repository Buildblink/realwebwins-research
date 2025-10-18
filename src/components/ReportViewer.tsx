import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ReportViewerProps {
  markdown: string;
  className?: string;
}

export function ReportViewer({ markdown, className }: ReportViewerProps) {
  return (
    <motion.article
      className={cn(
        "prose prose-slate max-w-none rounded-2xl border border-foreground/10 bg-white/90 p-6 shadow-sm dark:prose-invert",
        className
      )}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </motion.article>
  );
}
