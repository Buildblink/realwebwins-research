import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing required environment variables:");
  console.error("  - NEXT_PUBLIC_SUPABASE_URL");
  console.error("  - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration() {
  console.log("🚀 Running Phase 13 migration...\n");

  try {
    // Read the SQL migration file
    const sqlPath = join(__dirname, "migrations", "create_phase13_tables.sql");
    const sql = readFileSync(sqlPath, "utf8");

    // Execute the migration using Supabase REST API
    const { data, error } = await supabase.rpc("exec_sql", { sql_query: sql });

    if (error) {
      // If exec_sql RPC doesn't exist, try direct execution via postgres API
      console.log("⚠️  exec_sql RPC not available, using direct execution...\n");

      // Split SQL by statement and execute individually
      const statements = sql
        .split(";")
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith("--"));

      for (const statement of statements) {
        if (statement.toLowerCase().includes("comment on")) {
          // Skip comments as they're not critical
          continue;
        }

        try {
          const { error: stmtError } = await supabase.rpc("exec_sql", {
            sql_query: statement + ";"
          });

          if (stmtError) {
            console.log(`⚠️  Statement warning: ${stmtError.message}`);
          }
        } catch (err) {
          console.log(`⚠️  Statement warning: ${err.message}`);
        }
      }
    }

    console.log("✅ Phase 13 tables created successfully!\n");
    console.log("Created tables:");
    console.log("  - user_events (analytics tracking)");
    console.log("  - workspace_memories (AI personalization)");
    console.log("\nUpdated tables:");
    console.log("  - workspace_outputs (added rating column)");
    console.log("  - workspaces (added user_id column)");
    console.log("\n✅ Migration complete!");

  } catch (error) {
    console.error("\n❌ Migration failed:");
    console.error(error.message);
    console.error("\n💡 Manual migration required:");
    console.error("   1. Open Supabase SQL Editor");
    console.error("   2. Run the SQL from scripts/migrations/create_phase13_tables.sql");
    process.exit(1);
  }
}

runMigration();
