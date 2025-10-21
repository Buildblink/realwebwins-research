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

const JSON_PATH = path.join(process.cwd(), "data", "consumer_pain_points_seed.json");

function validatePainPoint(painPoint, index) {
  if (!painPoint.text || painPoint.text.length === 0) {
    throw new Error(`Pain point ${index}: text field is required`);
  }

  if (!painPoint.category || painPoint.category.length === 0) {
    throw new Error(`Pain point ${index}: category field is required`);
  }

  if (!painPoint.niche || painPoint.niche.length === 0) {
    throw new Error(`Pain point ${index}: niche field is required`);
  }

  if (!painPoint.source || painPoint.source.length === 0) {
    throw new Error(`Pain point ${index}: source field is required`);
  }

  if (!painPoint.audience || painPoint.audience.length === 0) {
    throw new Error(`Pain point ${index}: audience field is required`);
  }

  const frequency = parseInt(painPoint.frequency, 10);
  if (!Number.isFinite(frequency) || frequency < 1) {
    throw new Error(`Pain point ${index}: frequency must be a positive number`);
  }

  return {
    text: painPoint.text,
    category: painPoint.category,
    niche: painPoint.niche,
    source: painPoint.source,
    audience: painPoint.audience,
    frequency,
    proof_link: painPoint.proof_link || null,
    related_playbook: painPoint.related_playbook || null,
  };
}

async function seedConsumerPainPoints() {
  console.log("Reading JSON file...");
  const jsonText = await fs.readFile(JSON_PATH, "utf-8");

  console.log("Parsing JSON...");
  const painPoints = JSON.parse(jsonText);
  console.log(`Found ${painPoints.length} consumer pain points to seed`);

  console.log("Validating data...");
  const validatedPainPoints = [];
  for (let i = 0; i < painPoints.length; i++) {
    try {
      const validated = validatePainPoint(painPoints[i], i + 1);
      validatedPainPoints.push(validated);
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  }

  console.log("Checking if pain_points table exists...");
  const { error: checkError } = await supabase
    .from("pain_points")
    .select("id")
    .limit(1);

  if (checkError && checkError.code === "PGRST205") {
    console.error(
      "Table 'pain_points' does not exist. Please run the migration first."
    );
    process.exit(1);
  }

  console.log("Inserting consumer pain points into Supabase...");
  const { data, error } = await supabase
    .from("pain_points")
    .insert(validatedPainPoints)
    .select();

  if (error) {
    console.error("Failed to insert consumer pain points:", error.message);
    process.exit(1);
  }

  console.log(`\n✅ Successfully seeded ${data.length} consumer pain points!`);
  console.log("\nSample consumer problems:");
  data.slice(0, 5).forEach((pp, idx) => {
    console.log(`  ${idx + 1}. [${pp.category} - ${pp.niche}] ${pp.text.substring(0, 60)}...`);
  });

  console.log("\n🎉 Consumer pain points are ready!");
  console.log("View them at: http://localhost:3002/pain-points?audience=consumer");
}

seedConsumerPainPoints().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
