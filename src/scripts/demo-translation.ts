/**
 * Demo: Hindi Translation API
 *
 * This demo shows how the translation system works WITHOUT requiring database access.
 * Useful for testing the Claude API integration and validating translations.
 *
 * Usage: npx tsx src/scripts/demo-translation.ts
 */

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// System prompt for translation (would be cached in production)
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

// Demo job postings (sample of what's in the database)
const DEMO_JOBS = [
  {
    id: 1,
    title: "Senior Software Engineer",
    description:
      "Join our team as a Senior Software Engineer. Responsibilities include designing and implementing scalable systems, mentoring junior engineers, and collaborating with product teams.",
    eligibility: "Bachelor's degree in Computer Science or related field",
    responsibilities: "Design and develop software systems, mentor team members",
    requirements: "5+ years of software development experience, proficiency in Python/Java",
    age_relaxation_notes: "Age relaxation of 5 years for SC/ST candidates",
    location_city: "Bangalore",
  },
  {
    id: 2,
    title: "Statistical Officer",
    description:
      "The Statistical Officer will be responsible for data collection, analysis, and reporting for government statistical programs.",
    eligibility:
      "Bachelor's degree in Statistics, Mathematics, or Economics from a recognized university",
    responsibilities: "Collect, analyze and interpret statistical data",
    requirements: "Knowledge of statistical software like R or Python",
    age_relaxation_notes: null,
    location_city: "Delhi",
  },
  {
    id: 3,
    title: "Accountant Grade II",
    description: "Manage financial records and prepare financial statements",
    eligibility: "Bachelor's degree in Commerce or Accountancy",
    responsibilities: "Maintain financial records, prepare accounts, audit reports",
    requirements:
      "CA/CMA or equivalent accounting qualification, 3+ years experience",
    age_relaxation_notes: "3 years for OBC, 5 years for SC/ST",
    location_city: "Mumbai",
  },
];

async function demonstrateTranslation() {
  console.log("🎯 Hindi Translation Demo");
  console.log("========================\n");

  console.log(
    `📝 Demonstrating translation of ${DEMO_JOBS.length} sample job postings...\n`
  );

  const jobsJson = JSON.stringify(DEMO_JOBS, null, 2);
  console.log("Input Jobs (English):");
  console.log(jobsJson);
  console.log("\n---\n");

  console.log("🔄 Translating to Hindi using Claude Opus...\n");

  try {
    const response = await client.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Please translate these ${DEMO_JOBS.length} job postings to Hindi:\n\n${jobsJson}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    // Parse the response
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("Response text:", content.text);
      throw new Error(`Could not find JSON array in response`);
    }

    const translations = JSON.parse(jsonMatch[0]);

    console.log("✅ Translations Complete!\n");
    console.log("Translated Jobs (Hindi):");
    console.log(JSON.stringify(translations, null, 2));

    // Show comparison
    console.log("\n---\n");
    console.log("📊 Translation Comparison:\n");

    for (let i = 0; i < DEMO_JOBS.length; i++) {
      const original = DEMO_JOBS[i];
      const translated = translations[i];

      console.log(`Job ${i + 1}: ${original.title}`);
      console.log(`  Title (EN): ${original.title}`);
      console.log(`  Title (HI): ${translated.title_hi}\n`);
    }

    // Show metadata
    console.log("📈 API Usage:");
    console.log(`  Model: ${response.model}`);
    console.log(`  Input tokens: ${response.usage.input_tokens}`);
    console.log(`  Output tokens: ${response.usage.output_tokens}`);
    console.log(
      `  Total tokens: ${response.usage.input_tokens + response.usage.output_tokens}`
    );
    console.log(`\n✨ Translation successful!\n`);

    console.log("🚀 Next steps:");
    console.log(
      "  1. Run: npm run i18n:translate-hindi (to translate all 212 postings)"
    );
    console.log("  2. Verify Hindi rendering on /hi routes");
    console.log("  3. Test voice search with Hindi queries");
    console.log("  4. Monitor analytics by language\n");
  } catch (error) {
    console.error("❌ Translation failed:");
    if (error instanceof Error) {
      console.error(`  ${error.message}`);
      if (error.message.includes("401")) {
        console.error("  → Check ANTHROPIC_API_KEY in .env.local");
      }
      if (error.message.includes("404")) {
        console.error(
          "  → Model may not be available. Try 'claude-opus-5-5' or 'claude-sonnet-5-5'"
        );
      }
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

demonstrateTranslation();
