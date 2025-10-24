#!/usr/bin/env node
/**
 * Run a SQL migration file against Supabase using pg client
 * Usage: node --env-file=.env.local scripts/runMigration.mjs <path-to-sql-file>
 */

import { readFileSync } from "fs";
import pkg from "pg";
const { Client } = pkg;

const sqlFilePath = process.argv[2];

if (!sqlFilePath) {
  console.error("❌ Usage: node --env-file=.env.local scripts/runMigration.mjs <path-to-sql-file>");
  process.exit(1);
}

// Extract project ref from Supabase URL
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL not found in environment");
  process.exit(1);
}

const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
  console.error("❌ Could not extract project ref from Supabase URL");
  process.exit(1);
}

// Construct database connection string
// Note: This requires the database password, which should be set as SUPABASE_DB_PASSWORD
const dbPassword = process.env.SUPABASE_DB_PASSWORD;
if (!dbPassword) {
  console.error("❌ SUPABASE_DB_PASSWORD not found in environment");
  console.error("ℹ️  You can find your database password in your Supabase project settings:");
  console.error("   https://supabase.com/dashboard/project/" + projectRef + "/settings/database");
  console.error("\n📝 Please run this SQL manually in the Supabase SQL Editor instead:\n");
  const sql = readFileSync(sqlFilePath, "utf-8");
  console.log("─".repeat(80));
  console.log(sql);
  console.log("─".repeat(80));
  process.exit(1);
}

const connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

try {
  console.log(`\n🔄 Running migration: ${sqlFilePath}\n`);

  const sql = readFileSync(sqlFilePath, "utf-8");
  const client = new Client({ connectionString });

  await client.connect();
  console.log("✅ Connected to database");

  await client.query(sql);
  console.log("✅ Migration executed successfully");

  await client.end();
  console.log("✅ Migration completed\n");

} catch (err) {
  console.error("❌ Error running migration:", err.message);
  console.log("\n📝 Please run this SQL manually in the Supabase SQL Editor:\n");
  const sql = readFileSync(sqlFilePath, "utf-8");
  console.log("─".repeat(80));
  console.log(sql);
  console.log("─".repeat(80));
  process.exit(1);
}
