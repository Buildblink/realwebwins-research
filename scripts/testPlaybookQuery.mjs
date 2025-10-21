import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testPlaybookQuery() {
  console.log("=== Testing Playbook Database ===\n");

  // Test 1: Check if table exists and count rows
  console.log("Test 1: Checking playbooks table...");
  const { data: countData, error: countError } = await supabase
    .from("playbooks")
    .select("*", { count: "exact", head: false });

  if (countError) {
    console.error("❌ Error querying playbooks table:", countError.message);
    return;
  }

  console.log(`✅ Found ${countData?.length || 0} playbooks in database\n`);

  if (countData && countData.length > 0) {
    console.log("Playbook slugs:");
    countData.forEach((pb, idx) => {
      console.log(`  ${idx + 1}. ${pb.slug} (${pb.title})`);
    });
    console.log("");
  }

  // Test 2: Try to fetch a specific playbook by slug
  const testSlug = "youtube-growth-0-to-1k";
  console.log(`Test 2: Fetching playbook by slug "${testSlug}"...`);

  const { data: playbookData, error: playbookError } = await supabase
    .from("playbooks")
    .select("*")
    .eq("slug", testSlug)
    .maybeSingle();

  if (playbookError) {
    console.error("❌ Error fetching playbook:", playbookError.message);
    return;
  }

  if (!playbookData) {
    console.log(`❌ No playbook found with slug "${testSlug}"`);
    console.log("This is why you're getting a 404!\n");
    return;
  }

  console.log("✅ Playbook found:");
  console.log(`   Title: ${playbookData.title}`);
  console.log(`   Category: ${playbookData.category}`);
  console.log(`   Niche: ${playbookData.niche}`);
  console.log(`   Content length: ${playbookData.content?.length || 0} characters`);
  console.log(`   Tools: ${playbookData.tools?.length || 0} items`);
  console.log("");

  console.log("=== Diagnosis Complete ===");
  console.log("\nIf you see playbooks listed above, the data is good.");
  console.log("If no playbooks found, run: npm run seed:playbooks");
}

testPlaybookQuery().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
