import { createClient } from "@supabase/supabase-js";
import { promises as fs } from "fs";
import path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable.");
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const JSON_PATH = path.join(process.cwd(), "data", "playbooks_seed.json");

function validatePlaybook(playbook, index) {
  if (!playbook.title || playbook.title.length === 0) {
    throw new Error(`Playbook ${index}: title field is required`);
  }

  if (!playbook.slug || playbook.slug.length === 0) {
    throw new Error(`Playbook ${index}: slug field is required`);
  }

  if (!playbook.category || playbook.category.length === 0) {
    throw new Error(`Playbook ${index}: category field is required`);
  }

  if (!playbook.niche || playbook.niche.length === 0) {
    throw new Error(`Playbook ${index}: niche field is required`);
  }

  // Validate tools array
  if (playbook.tools && !Array.isArray(playbook.tools)) {
    throw new Error(`Playbook ${index}: tools must be an array`);
  }

  // Validate affiliate_links array
  if (playbook.affiliate_links && !Array.isArray(playbook.affiliate_links)) {
    throw new Error(`Playbook ${index}: affiliate_links must be an array`);
  }

  return {
    title: playbook.title,
    slug: playbook.slug,
    description: playbook.description || null,
    content: playbook.content || null,
    category: playbook.category,
    niche: playbook.niche,
    tools: playbook.tools || [],
    affiliate_links: playbook.affiliate_links || [],
    related_pain_id: playbook.related_pain_id || null,
    related_case_id: playbook.related_case_id || null,
  };
}

async function seedPlaybooks() {
  console.log("Reading JSON file...");
  const jsonText = await fs.readFile(JSON_PATH, "utf-8");

  console.log("Parsing JSON...");
  const playbooks = JSON.parse(jsonText);

  if (!Array.isArray(playbooks)) {
    throw new Error("JSON file must contain an array of playbooks");
  }

  console.log(`Found ${playbooks.length} playbooks to seed`);

  console.log("Validating data...");
  const validatedPlaybooks = [];
  for (let i = 0; i < playbooks.length; i++) {
    try {
      const validated = validatePlaybook(playbooks[i], i + 1);
      validatedPlaybooks.push(validated);
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  }

  console.log("Checking if playbooks table exists...");
  const { error: checkError } = await supabase
    .from("playbooks")
    .select("id")
    .limit(1);

  if (checkError && checkError.code === "PGRST205") {
    console.error(
      "Table 'playbooks' does not exist. Please run 'npm run ensure:playbooks-v2' first or run the SQL manually."
    );
    process.exit(1);
  }

  console.log("Inserting playbooks into Supabase...");
  const { data, error } = await supabase
    .from("playbooks")
    .insert(validatedPlaybooks)
    .select();

  if (error) {
    console.error("Failed to insert playbooks:", error.message);
    process.exit(1);
  }

  console.log(`\n✅ Successfully seeded ${data.length} playbooks!`);
  console.log("\nPlaybooks created:");
  data.forEach((pb, idx) => {
    console.log(`  ${idx + 1}. [${pb.category}] ${pb.title}`);
    console.log(`     → /playbook/${pb.slug}`);
  });
  console.log("\n🎉 Playbooks are ready to use!");
}

seedPlaybooks().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
