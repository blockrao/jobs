/**
 * Phase 2 Backfill Script
 * Backfills parsed education/experience requirements for all posts
 *
 * Usage: npx tsx src/scripts/backfill-phase2-qualifications.ts
 */

import { createClient } from "@supabase/supabase-js";
import { parseQualification, educationToSchema, experienceToSchema } from "@/lib/parsers/qualification-parser";

const BATCH_SIZE = 100;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface PostRow {
  id: string;
  enrichment_id: string | null;
  eligibility_text: string | null;
  requirements_text: string | null;
}

interface EnrichmentUpdate {
  parsed_education_requirements: any;
  parsed_experience_requirements: any;
  parsed_skills: string[];
}

async function backfillPhase2Qualifications() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log("🚀 Starting Phase 2 qualification backfill...");

  // Step 1: Fetch all postings with eligibility/requirements text and inferred_post_id
  console.log("\n📋 Fetching postings with qualification text and linked posts...");
  const { data: postings, error: postingsError } = await supabase
    .from("postings")
    .select(`id, eligibility, requirements, inferred_post_id`)
    .not("inferred_post_id", "is", null)
    .not("eligibility", "is", null);

  if (postingsError) {
    console.error("❌ Error fetching postings:", postingsError);
    return;
  }

  console.log(`✅ Found ${postings?.length || 0} postings with qualification text`);

  // Step 2: Get unique post IDs from postings
  const uniquePostIds = new Set(
    postings?.filter((p) => p.inferred_post_id).map((p) => p.inferred_post_id) || []
  );
  console.log(`📌 Found ${uniquePostIds.size} unique linked posts`);

  // Step 3: Process postings in batches
  console.log("\n⚙️  Processing postings and parsing qualifications...");

  let processed = 0;
  let updated = 0;
  let errors = 0;
  const postingsList = postings || [];

  for (let i = 0; i < postingsList.length; i += BATCH_SIZE) {
    const batch = postingsList.slice(i, i + BATCH_SIZE);
    const updates: { post_id: number; data: EnrichmentUpdate }[] = [];

    for (const posting of batch) {
      if (!posting.inferred_post_id) {
        processed++;
        continue;
      }

      // Combine eligibility + requirements for comprehensive parsing
      const qualificationText = [posting.eligibility, posting.requirements]
        .filter(Boolean)
        .join(" ");

      if (!qualificationText.trim()) {
        // No qualification text to parse
        processed++;
        continue;
      }

      try {
        // Parse the qualification text
        const parsed = parseQualification(qualificationText);

        // Convert to schema.org format
        const educationRequirements = parsed.educations.length > 0
          ? parsed.educations.map(educationToSchema)
          : null;

        const experienceRequirements = parsed.experience
          ? experienceToSchema(parsed.experience)
          : null;

        // Prepare update
        updates.push({
          post_id: posting.inferred_post_id,
          data: {
            parsed_education_requirements: educationRequirements,
            parsed_experience_requirements: experienceRequirements,
            parsed_skills: parsed.skills,
          },
        });

        processed++;
      } catch (err) {
        console.error(`⚠️  Error parsing posting ${posting.id}:`, err);
        errors++;
        processed++;
      }
    }

    // Batch update to database
    if (updates.length > 0) {
      console.log(`  → Updating ${updates.length} posts in batch...`);

      for (const update of updates) {
        const { error: updateError } = await supabase
          .from("post_enrichments")
          .update(update.data)
          .eq("post_id", update.post_id);

        if (updateError) {
          console.error(`  ❌ Error updating post ${update.post_id}:`, updateError);
          errors++;
        } else {
          updated++;
        }
      }
    }

    // Progress indicator
    const progress = Math.round((processed / postingsList.length) * 100);
    console.log(`  ✓ Progress: ${processed}/${postingsList.length} (${progress}%)`);
  }

  // Step 5: Verify results
  console.log("\n✅ Backfill complete!");
  console.log(`\n📈 Results:`);
  console.log(`  Total posts processed: ${processed}`);
  console.log(`  Successfully updated: ${updated}`);
  console.log(`  Errors encountered: ${errors}`);

  // Step 6: Spot-check verification
  console.log("\n🔍 Spot-checking results...");
  const { data: samplePosts, error: sampleError } = await supabase
    .from("post_enrichments")
    .select("post_id, parsed_education_requirements, parsed_experience_requirements, parsed_skills")
    .not("parsed_education_requirements", "is", null)
    .limit(5);

  if (!sampleError && samplePosts) {
    console.log(`  ✓ Found ${samplePosts.length} posts with parsed education requirements`);
    samplePosts.forEach((post) => {
      const edu = post.parsed_education_requirements ? JSON.stringify(post.parsed_education_requirements).slice(0, 50) : "none";
      const exp = post.parsed_experience_requirements ? "present" : "none";
      const skills = Array.isArray(post.parsed_skills) ? post.parsed_skills.length : 0;
      console.log(`    - Post ${post.post_id}: ${edu}... exp=${exp} skills=${skills}`);
    });
  }

  console.log("\n✨ Phase 2 backfill finished!");
  process.exit(0);
}

// Run the backfill
backfillPhase2Qualifications().catch((err) => {
  console.error("❌ Backfill failed:", err);
  process.exit(1);
});
