import { AppShell } from "@/components/layout/AppShell";
import { StudioTestClient } from "@/app/studio/test/StudioTestClient";

export const dynamic = "force-dynamic";

export default function StudioTestPage() {
  const adminEnabled = process.env.ADMIN_MODE === "true";
  return (
    <AppShell>
      <StudioTestClient adminEnabled={adminEnabled} />
    </AppShell>
  );
}
