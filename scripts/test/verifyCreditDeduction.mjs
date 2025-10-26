#!/usr/bin/env node
import "dotenv/config";
import chalk from "chalk";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error(
    chalk.red(
      "✖ SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL missing. Cannot verify credit deduction."
    )
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

async function main() {
  console.log(chalk.cyan("\n🚀  Phase 32 Credit Deduction Verification"));

  const userId = randomUUID();
  const email = `credit-test-${userId.slice(0, 8)}@example.com`;

  try {
    const { error: profileError } = await supabase.from("user_profiles").insert([
      {
        id: userId,
        email,
      },
    ]);

    if (profileError) {
      throw new Error(`Failed to insert profile: ${profileError.message}`);
    }

    console.log(chalk.green(`✓ Created test user profile ${email}`));

    const { error: creditError } = await supabase.from("user_credits").insert([
      {
        user_id: userId,
        balance: 100,
      },
    ]);

    if (creditError) {
      throw new Error(`Failed to seed credits: ${creditError.message}`);
    }

    console.log(chalk.green("✓ Seeded initial balance of 100 credits"));

    const { error: updateError } = await supabase
      .from("user_credits")
      .update({ balance: 90 })
      .eq("user_id", userId);

    if (updateError) {
      throw new Error(`Failed to deduct credits: ${updateError.message}`);
    }

    console.log(chalk.green("✓ Deducted 10 credits"));

    const { data: creditRow, error: fetchError } = await supabase
      .from("user_credits")
      .select("balance, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Failed to fetch updated balance: ${fetchError.message}`);
    }

    const balance = creditRow?.balance ?? null;
    console.log(
      chalk.cyan("ℹ︎  Current balance:"),
      balance,
      "updated_at:",
      creditRow?.updated_at
    );

    if (balance !== 90) {
      throw new Error(`Balance expected to be 90, got ${balance}`);
    }

    console.log(chalk.green("\n✅ Credit deduction verification completed successfully."));
  } catch (error) {
    console.error(
      chalk.red(
        `✖ Credit deduction verification failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    );
    process.exitCode = 1;
  } finally {
    try {
      await supabase.from("user_credits").delete().eq("user_id", userId);
      await supabase.from("user_profiles").delete().eq("id", userId);
      console.log(chalk.gray("🧹 Cleaned up temporary test user."));
    } catch (cleanupError) {
      console.warn(
        chalk.yellow(
          `⚠️  Cleanup encountered an issue: ${
            cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
          }`
        )
      );
    }
  }
}

main();
