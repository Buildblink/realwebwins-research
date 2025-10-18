'use client';
import Link from "next/link";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DatabaseProject } from "@/types/supabase";
import { verdictToVariant } from "@/lib/verdict";

interface ResearchCardProps {
  project: DatabaseProject;
  index?: number;
}

export function ResearchCard({ project, index = 0 }: ResearchCardProps) {
  const badgeVariant = verdictToVariant(project.verdict ?? "neutral");
  const verdictLabel = project.verdict
    ? project.verdict.replace("_", " ").toUpperCase()
    : "PENDING";
  const createdAtLabel = project.created_at
    ? formatDistanceToNow(new Date(project.created_at), { addSuffix: true })
    : "Unknown";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="group h-full">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge variant={badgeVariant}>Verdict: {verdictLabel}</Badge>
              <CardTitle className="mt-3 text-xl font-semibold text-slate-900">
                {project.title}
              </CardTitle>
            </div>
            <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {project.score?.toFixed(1) ?? "--"}/10
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="line-clamp-3 text-sm text-slate-600">
            {project.idea_description}
          </p>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{createdAtLabel}</span>
            <Link
              href={`/project/${project.id}`}
              className="font-semibold text-primary transition group-hover:text-secondary"
            >
              {"View project ->"}
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
