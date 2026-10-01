import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "@/db";
import { postings } from "@/db/schema";
import { isNull } from "drizzle-orm";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface JobTranslation {
  id: number;
  title_hi: string;
  description_hi: string | null;
  eligibility_hi: string | null;
  responsibilities_hi: string | null;
  requirements_hi: string | null;
  age_relaxation_notes_hi: string | null;
  location_city_hi: string | null;
}

// System prompt for translation (cached for efficiency)
const SYSTEM_PROMPT = `You are a professional translator specializing in government job announcements in India.
Your task is to translate job posting fields from English to Hindi (Devanagari script).

IMPORTANT:
- Maintain technical accuracy and official terminology
- Use formal, professional Hindi
- Preserve numbers, dates, and abbreviations
- If a field is empty or null, return null
- Return valid JSON only, no additional text
- For location names, use official Hindi names (e.g., Delhi = दिल्ली, Mumbai = मुंबई)

Format your response as a JSON object with these exact keys:
{
  "title_hi": "Hindi translation of title",
  "description_hi": "Hindi translation or null",
  "eligibility_hi": "Hindi translation or null",
  "responsibilities_hi": "Hindi translation or null",
  "requirements_hi": "Hindi translation or null",
  "age_relaxation_notes_hi": "Hindi translation or null",
  "location_city_hi": "Hindi translation of location or null"
}`;

async function translateJobBatch(
  jobs: typeof jobs[]
): Promise<JobTranslation[]> {
  const jobsJson = JSON.stringify(
    jobs.map((job) => ({
      id: job.id,
      title: job.title,
      description: job.description,
      eligibility: job.eligibility,
      responsibilities: job.responsibilities,
      requirements: job.requirements,
      age_relaxation_notes: job.ageRelaxationNotes,
      location_city: job.locationCity,
    })),
    null,
    2
  );

  const response = await client.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Please translate these ${jobs.length} job postings to Hindi:\n\n${jobsJson}`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  // Parse the response - it should contain a JSON array
  const jsonMatch = content.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error(`Could not find JSON array in response: ${content.text}`);
  }

  const translations = JSON.parse(jsonMatch[0]) as JobTranslation[];
  return translations;
}

async function translateAndUpdate() {
  console.log("Starting Hindi translation pipeline...");
  const db = getDb();

  // Fetch all postings without Hindi translations
  const postsToTranslate = await db
    .select()
    .from(postings)
    .where(isNull(postings.titleHi))
    .limit(100); // Process in batches of 100

  console.log(
    `Found ${postsToTranslate.length} postings to translate (batch size: 100)`
  );

  if (postsToTranslate.length === 0) {
    console.log("All postings already have Hindi translations!");
    return;
  }

  // Process in smaller batches (10 at a time) for the Claude API
  const batchSize = 10;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < postsToTranslate.length; i += batchSize) {
    const batch = postsToTranslate.slice(i, i + batchSize);
    console.log(
      `\nProcessing batch ${Math.floor(i / batchSize) + 1} (${batch.length} jobs)...`
    );

    try {
      const translations = await translateJobBatch(batch);

      // Update database with translations
      for (const translation of translations) {
        await db
          .update(postings)
          .set({
            titleHi: translation.title_hi,
            descriptionHi: translation.description_hi,
            eligibilityHi: translation.eligibility_hi,
            responsibilitiesHi: translation.responsibilities_hi,
            requirementsHi: translation.requirements_hi,
            ageRelaxationNotesHi: translation.age_relaxation_notes_hi,
            locationCityHi: translation.location_city_hi,
          })
          .where(postings.id.equals(translation.id));

        successCount++;
      }

      console.log(`✓ Successfully translated and updated ${batch.length} jobs`);
    } catch (error) {
      errorCount += batch.length;
      console.error(`✗ Error processing batch:`, error);
      // Continue with next batch instead of stopping
    }

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < postsToTranslate.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log(
    `\n📊 Translation complete: ${successCount} succeeded, ${errorCount} failed`
  );

  // Check final counts
  const finalCounts = await db.execute(
    "SELECT COUNT(*) as total, COUNT(CASE WHEN title_hi IS NOT NULL THEN 1 END) as translated FROM postings;"
  );
  console.log("Final status:", finalCounts);
}

// Run the translation
translateAndUpdate().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
