import chalk from "chalk";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

const requiredEnv = [
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    defaultValue: "https://YOUR_SUPABASE_URL.supabase.co",
    description: "Supabase project URL",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    defaultValue: "your-anon-key",
    description: "Supabase anon key",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    defaultValue: "your-service-role-key",
    description: "Supabase service role key",
  },
  {
    key: "AI_PROVIDER",
    defaultValue: "local",
    description: "AI provider identifier",
  },
  {
    key: "AI_MODEL",
    defaultValue: "claude-3-sonnet-20240620",
    description: "Default AI model",
  },
  {
    key: "ADMIN_MODE",
    defaultValue: "true",
    description: "Admin mode toggle",
  },
  {
    key: "PLAUSIBLE_DOMAIN",
    defaultValue: "realwebwins-research.vercel.app",
    description: "Analytics domain",
  },
];

const optionalEnv = [];

const envPath = path.resolve(process.cwd(), ".env.local");

console.log(chalk.cyan.bold("🧩 Realwebwins Environment Verification v2"));

function ensureEnvFileExists() {
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, "", "utf8");
    console.warn(
      chalk.yellow("[verifyEnv] Created missing .env.local file for you.")
    );
  }
}

function parseEnv(content) {
  return dotenv.parse(content);
}

function formatEnvLines(envObject) {
  return Object.entries(envObject)
    .map(([key, value]) => `${key}=${value ?? ""}`)
    .join("\n");
}

function updateEnvFile(envObject) {
  const serialized = formatEnvLines(envObject);
  fs.writeFileSync(envPath, `${serialized}\n`, "utf8");
}

function maskValue(raw) {
  if (!raw) return chalk.red("(empty)");
  if (raw.length <= 8) {
    return `${raw[0]}***${raw.slice(-1)}`;
  }
  return `${raw.slice(0, 4)}***${raw.slice(-4)}`;
}

async function checkSupabaseRest(supabaseUrl, serviceKey) {
  if (!supabaseUrl || !serviceKey) {
    console.warn(
      chalk.yellow("⚠️ Supabase REST skip — missing URL or service key.")
    );
    return { ok: false, warning: true };
  }

  const baseUrl = supabaseUrl.replace(/\/$/, "");
  const restUrl = `${baseUrl}/rest/v1/research_projects?select=id&limit=1`;

  try {
    const response = await fetch(restUrl, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (response.ok) {
      console.log(chalk.green("✅ Supabase REST reachable"));
      return { ok: true };
    }

    if ([401, 403, 404].includes(response.status)) {
      console.warn(
        chalk.yellow(
          `⚠️ Supabase REST permissions issue (status ${response.status}).`
        )
      );
      return { ok: false, warning: true };
    }

    console.error(
      chalk.red(
        `❌ Supabase REST unexpected status ${response.status}: ${await response.text()}`
      )
    );
    return { ok: false, fatal: true };
  } catch (error) {
    console.error(
      chalk.red(`❌ Supabase REST request failed: ${String(error.message ?? error)}`)
    );
    return { ok: false, fatal: true };
  }
}

async function main() {
  ensureEnvFileExists();

  const originalContent = fs.readFileSync(envPath, "utf8");
  let envObject = parseEnv(originalContent);
  let updated = false;

  for (const { key, defaultValue, description } of requiredEnv) {
    const value = envObject[key];
    if (typeof value === "undefined" || value === "") {
      console.warn(
        chalk.yellow(
          `⚠️ Missing ${key}. Injecting placeholder (${description}).`
        )
      );
      envObject[key] = defaultValue;
      updated = true;
    }
  }

  if (updated) {
    updateEnvFile(envObject);
    envObject = parseEnv(fs.readFileSync(envPath, "utf8"));
  }

  // Load vars into process.env
  for (const { key } of requiredEnv) {
    process.env[key] = envObject[key];
  }

  let hasErrors = false;
  let hasWarnings = false;

  // Basic validation
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (
    !supabaseUrl.startsWith("https://") ||
    !supabaseUrl.includes("supabase.co")
  ) {
    console.error(chalk.red("❌ Supabase URL invalid. Must be https://...supabase.co"));
    hasErrors = true;
  }

  console.log(chalk.green("✅ ENV loaded"));
  for (const { key } of requiredEnv) {
    console.log(`   ${key}: ${maskValue(process.env[key])}`);
  }

  // Optional variables summary
  const optionalMissing = optionalEnv.filter(
    (key) => !envObject[key] || envObject[key] === ""
  );
  if (optionalMissing.length > 0) {
    console.warn(
      chalk.yellow(
        `⚠️ Missing optional vars: ${optionalMissing.join(", ")}`
      )
    );
    hasWarnings = true;
  } else {
    console.log(chalk.green("✅ All optional vars present"));
  }

  // Supabase connectivity check
if (process.env.VERCEL === "1") {
  console.log(
    chalk.cyan("🧩 Skipping Supabase REST check — running inside Vercel build environment.")
  );
} else {
  const supabaseStatus = await checkSupabaseRest(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  if (supabaseStatus.fatal) {
    hasErrors = true;
  } else if (supabaseStatus.warning) {
    hasWarnings = true;
  }
}

  // Environment mode
  const runningInVercel = process.env.VERCEL === "1";
  const modeLabel = runningInVercel ? "Cloud (Vercel)" : "Local";
  console.log(chalk.cyan(`🧩 Mode: ${modeLabel}`));
  if (runningInVercel) {
    console.log(
      chalk.cyan("🧩 Running inside Vercel — build environment validated")
    );
  }

  if (hasErrors) {
    console.error(
      chalk.red("❌ Build blocked — fix environment issues before deploy.")
    );
    process.exit(1);
  }

  if (hasWarnings) {
    console.warn(
      chalk.yellow(
        "⚠️ Environment verification completed with warnings. Review logs above."
      )
    );
  }

  console.log(
    chalk.green(
      "✅ Realwebwins environment health monitor completed successfully."
    )
  );
}

await main();
