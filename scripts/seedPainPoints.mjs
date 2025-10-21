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

const CSV_PATH = path.join(process.cwd(), "data", "pain_points_seed.csv");

function parseCSV(csvText) {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) {
    throw new Error("CSV file is empty or has no data rows");
  }

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Simple CSV parsing - handles quoted fields
    const values = [];
    let current = "";
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    if (values.length !== headers.length) {
      console.warn(`Skipping malformed line ${i + 1}: mismatched column count`);
      continue;
    }

    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx];
    });

    rows.push(row);
  }

  return rows;
}

function validateRow(row, lineNumber) {
  if (!row.text || row.text.length === 0) {
    throw new Error(`Line ${lineNumber}: text field is required`);
  }

  if (!row.category || row.category.length === 0) {
    throw new Error(`Line ${lineNumber}: category field is required`);
  }

  if (!row.niche || row.niche.length === 0) {
    throw new Error(`Line ${lineNumber}: niche field is required`);
  }

  if (!row.source || row.source.length === 0) {
    throw new Error(`Line ${lineNumber}: source field is required`);
  }

  const frequency = parseInt(row.frequency, 10);
  if (!Number.isFinite(frequency) || frequency < 1) {
    throw new Error(`Line ${lineNumber}: frequency must be a positive number`);
  }

  return {
    text: row.text,
    category: row.category,
    niche: row.niche,
    source: row.source,
    audience: row.audience || "creator", // Default to creator for backward compatibility
    frequency,
    proof_link: row.proof_link || null,
    related_playbook: row.related_playbook || null,
  };
}

async function seedPainPoints() {
  console.log("Reading CSV file...");
  const csvText = await fs.readFile(CSV_PATH, "utf-8");

  console.log("Parsing CSV...");
  const rows = parseCSV(csvText);
  console.log(`Found ${rows.length} pain points to seed`);

  console.log("Validating data...");
  const painPoints = [];
  for (let i = 0; i < rows.length; i++) {
    try {
      const validated = validateRow(rows[i], i + 2); // +2 for header + 0-index
      painPoints.push(validated);
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
      "Table 'pain_points' does not exist. Please run 'npm run ensure:pain-points' first."
    );
    process.exit(1);
  }

  console.log("Inserting pain points into Supabase...");
  const { data, error } = await supabase
    .from("pain_points")
    .insert(painPoints)
    .select();

  if (error) {
    console.error("Failed to insert pain points:", error.message);
    process.exit(1);
  }

  console.log(`✅ Successfully seeded ${data.length} pain points!`);
  console.log("\nSample entries:");
  data.slice(0, 3).forEach((pp, idx) => {
    console.log(`  ${idx + 1}. [${pp.category}] ${pp.text.substring(0, 50)}...`);
  });
}

seedPainPoints().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
