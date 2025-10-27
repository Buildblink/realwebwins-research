#!/usr/bin/env node
import "dotenv/config";
import chalk from "chalk";
import fetch from "node-fetch";


const baseUrl = process.env.API_BASE_URL ?? "http://localhost:3000";
const mvpId = process.argv[2];

if (!mvpId) {
  console.error(chalk.red("Usage: node verifyProjectPreview.mjs <mvpId>"));
  process.exit(1);
}

async function main() {
  console.log(chalk.cyan(Checking project preview for ...));
  const res = await fetch(${baseUrl}/api/mvp//project);
  if (!res.ok) {
    throw new Error(Request failed:  );
  }
  const json = await res.json();
  if (!json?.success) {
    throw new Error(Preview API returned error: );
  }
  const files = Object.keys(json.files ?? {});
  console.log(chalk.green(? Retrieved  file entries for preview.));
}

main().catch((error) => {
  console.error(chalk.red([verifyProjectPreview] ));
  process.exit(1);
});
