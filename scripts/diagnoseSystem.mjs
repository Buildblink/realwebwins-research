#!/usr/bin/env node
import "dotenv/config";
import chalk from "chalk";
import { evaluateDiagnostics } from "../diagnostics/offlineFallback.mjs";

async function main() {
  const diagnostics = await evaluateDiagnostics();
  const { status, reasons, timestamp } = diagnostics;

  if (status === "online") {
    console.log(chalk.green(`✅ System online (checked at ${timestamp}).`));
    process.exit(0);
  }

  const label =
    status === "partial"
      ? chalk.yellow("⚠️  System partially degraded")
      : chalk.red("❌ System offline");

  console.log(`${label} (checked at ${timestamp}).`);

  if (reasons.length > 0) {
    console.log(chalk.gray(`Reasons: ${reasons.join(", ")}`));
  }

  process.exit(status === "partial" ? 1 : 2);
}

main().catch((error) => {
  console.error(
    chalk.red(
      error instanceof Error ? error.stack ?? error.message : String(error)
    )
  );
  process.exit(2);
});
