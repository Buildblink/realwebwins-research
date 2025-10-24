import { execSync } from "node:child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("╔═══════════════════════════════════════════╗");
console.log("║   Hybrid AI Refresh: Claude + OpenAI     ║");
console.log("╚═══════════════════════════════════════════╝\n");

const startTime = Date.now();

const steps = [
  {
    name: "Claude Pain Point Discovery",
    command: "node --env-file=.env.local scripts/auto/autoDiscoverPainPointsClaude.mjs",
    critical: false, // Non-critical: continue if fails
  },
  {
    name: "OpenAI Playbook Generation",
    command: "node --env-file=.env.local scripts/auto/generatePlaybooksFromPainPoints.mjs",
    critical: false,
  },
  {
    name: "Export Feed",
    command: "npm run export:feed",
    critical: false,
  },
];

let successCount = 0;
let failCount = 0;

for (const step of steps) {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`▶ Running: ${step.name}`);
  console.log(`${"=".repeat(50)}\n`);

  try {
    const output = execSync(step.command, {
      stdio: "inherit", // Show output in real-time
      cwd: path.resolve(__dirname, "../.."), // Run from project root
    });

    console.log(`\n✅ ${step.name} completed successfully`);
    successCount++;
  } catch (error) {
    console.error(`\n❌ ${step.name} failed`);

    if (error.stderr) {
      console.error("Error output:", error.stderr.toString());
    }

    failCount++;

    if (step.critical) {
      console.error("\n🛑 Critical step failed. Stopping refresh.");
      process.exit(1);
    } else {
      console.log("⚠️  Non-critical step failed. Continuing...");
    }
  }
}

const duration = ((Date.now() - startTime) / 1000).toFixed(1);

console.log("\n" + "=".repeat(50));
console.log("🏁 Hybrid Refresh Complete");
console.log("=".repeat(50));
console.log(`✅ Successful steps: ${successCount}`);
console.log(`❌ Failed steps: ${failCount}`);
console.log(`⏱️  Total duration: ${duration}s`);
console.log("=".repeat(50) + "\n");

if (failCount > 0) {
  console.log("⚠️  Some steps failed. Check logs above for details.");
  process.exit(1);
}

process.exit(0);
