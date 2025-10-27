#!/usr/bin/env node
import "dotenv/config";
import chalk from "chalk";
import fetch from "node-fetch";


const baseUrl = process.env.API_BASE_URL ?? "http://localhost:3000";
const mvpId = process.argv[2];

if (!mvpId) {
  console.error(chalk.red("Usage: node verifyDeployFlow.mjs <mvpId>"));
  process.exit(1);
}

async function main() {
  const response = await fetch(${baseUrl}/api/deploy/status?deploy_id=invalid);
  if (response.status !== 400 && response.status !== 404) {
    throw new Error("Expected status endpoint to guard missing deploy id");
  }
  console.log(chalk.green("? Deploy status endpoint reachable"));
}

main().catch((error) => {
  console.error(chalk.red([verifyDeployFlow] ));
  process.exit(1);
});
