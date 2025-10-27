import { AppShell } from "@/components/layout/AppShell";
import StudioClient from "@/app/studio/studio-client";

export default function StudioPage() {
  return (
    <AppShell>
      <StudioClient />
    </AppShell>
  );
}
