#!/usr/bin/env node
/**
 * Fix playbook links in pain_points table
 * - Converts title references to slug references
 * - Nulls out references to non-existent playbooks
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixPlaybookLinks() {
  console.log("🔍 Fetching all pain points with playbook references...\n");

  // Get all pain points with related_playbook
  const { data: painPoints, error: fetchError } = await supabase
    .from("pain_points")
    .select("id, text, related_playbook")
    .not("related_playbook", "is", null);

  if (fetchError) {
    console.error("❌ Error fetching pain points:", fetchError);
    return;
  }

  console.log(`Found ${painPoints.length} pain points with playbook references\n`);

  // Get all playbooks for matching
  const { data: playbooks, error: playbooksError } = await supabase
    .from("playbooks")
    .select("id, slug, title");

  if (playbooksError) {
    console.error("❌ Error fetching playbooks:", playbooksError);
    return;
  }

  console.log(`Found ${playbooks.length} playbooks in database\n`);
  console.log("---\n");

  let fixed = 0;
  let nulled = 0;
  let alreadyCorrect = 0;

  for (const painPoint of painPoints) {
    const currentRef = painPoint.related_playbook;

    // Check if it's already a valid slug
    const isValidSlug = playbooks.some((p) => p.slug === currentRef);

    if (isValidSlug) {
      console.log(`✅ Already correct: "${currentRef}"`);
      alreadyCorrect++;
      continue;
    }

    // Try to find matching playbook by title
    const matchingPlaybook = playbooks.find((p) =>
      p.title.toLowerCase().includes(currentRef.toLowerCase().replace(" playbook", ""))
    );

    if (matchingPlaybook) {
      // Update to correct slug
      const { error: updateError } = await supabase
        .from("pain_points")
        .update({ related_playbook: matchingPlaybook.slug })
        .eq("id", painPoint.id);

      if (updateError) {
        console.error(`❌ Error updating ${painPoint.id}:`, updateError);
      } else {
        console.log(`🔧 Fixed: "${currentRef}" → "${matchingPlaybook.slug}"`);
        fixed++;
      }
    } else {
      // No matching playbook found - null it out
      const { error: updateError } = await supabase
        .from("pain_points")
        .update({ related_playbook: null })
        .eq("id", painPoint.id);

      if (updateError) {
        console.error(`❌ Error nulling ${painPoint.id}:`, updateError);
      } else {
        console.log(`🗑️  Nulled (no playbook exists): "${currentRef}"`);
        nulled++;
      }
    }
  }

  console.log("\n---");
  console.log("📊 Summary:");
  console.log(`  ✅ Already correct: ${alreadyCorrect}`);
  console.log(`  🔧 Fixed (title → slug): ${fixed}`);
  console.log(`  🗑️  Nulled (playbook doesn't exist): ${nulled}`);
  console.log(`  📝 Total processed: ${painPoints.length}`);
}

fixPlaybookLinks().catch(console.error);
