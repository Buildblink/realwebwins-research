import { PropsWithChildren } from "react";
import { normalizeTier } from "@/middleware/tierGate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface UpgradeModalProps {
  open: boolean;
  currentTier?: string | null;
  requiredTier?: string | null;
  onClose: () => void;
  onUpgrade?: () => void;
  description?: string;
}

export function UpgradeModal({
  open,
  currentTier,
  requiredTier,
  onClose,
  onUpgrade,
  description,
  children,
}: PropsWithChildren<UpgradeModalProps>) {
  if (!open) return null;

  const current = normalizeTier(currentTier);
  const required = normalizeTier(requiredTier);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <Card className="w-[420px] bg-slate-900 border-slate-700 text-slate-100 shadow-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            Unlock {required.toUpperCase()} Deliverables
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <p>
            Your account is currently on the <strong>{current.toUpperCase()}</strong> tier.
            Upgrade to <strong>{required.toUpperCase()}</strong> to access this deliverable.
          </p>
          {description ? <p className="text-slate-300">{description}</p> : null}
          {children}
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Maybe later
          </Button>
          <Button onClick={onUpgrade}>
            Upgrade now
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
