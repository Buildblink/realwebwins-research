
#!/usr/bin/env node
import "dotenv/config";
import chalk from "chalk";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(chalk.red("[verifyDeliverablesUI] Missing Supabase credentials."));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function main() {
  console.log(chalk.cyan("🔍 Verifying deliverables data pipeline…"));

  const { data: mvp, error: mvpError } = await supabase
    .from("mvp_outputs")
    .select("id, title")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (mvpError || !mvp) {
    throw new Error(mvpError?.message ?? "No MVP outputs found to verify.");
  }

  const { data: artifacts, error: artifactsError } = await supabase
    .from("mvp_artifacts")
    .select("id, title, tier, preview_html, validation_status")
    .eq("mvp_id", mvp.id)
    .order("created_at", { ascending: true });

  if (artifactsError) {
    throw new Error(`Failed to fetch artifacts: ${artifactsError.message}`);
  }

  const { data: exports, error: exportsError } = await supabase
    .from("mvp_exports")
    .select("id, export_type, tier, viewed_at")
    .eq("mvp_id", mvp.id)
    .order("created_at", { ascending: true });

  if (exportsError) {
    throw new Error(`Failed to fetch exports: ${exportsError.message}`);
  }

  console.log(
    chalk.green(`✅ MVP "${mvp.title ?? mvp.id}" has ${artifacts.length} artifact(s) and ${exports.length} export(s).`)
  );

  const premiumArtifacts = artifacts.filter((item) => (item.tier ?? "free") !== "free");
  const viewedExports = exports.filter((item) => Boolean(item.viewed_at));

  console.log(
    chalk.blue(
      `ℹ️ Premium artifacts: ${premiumArtifacts.length}, Viewed exports: ${viewedExports.length}`
    )
  );

  if (artifacts.some((artifact) => !artifact.preview_html)) {
    console.warn(
      chalk.yellow("⚠️ Some artifacts missing preview_html. Consider regenerating previews.")
    );
  }
}

main().catch((error) => {
  console.error(chalk.red(`[verifyDeliverablesUI] ${error.message}`));
  process.exit(1);
});
