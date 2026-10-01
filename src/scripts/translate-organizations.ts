import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "@/db";
import { organizations } from "@/db/schema";
import { isNull, eq } from "drizzle-orm";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface OrganizationTranslation {
  id: number;
  name_hi: string;
  description_hi: string | null;
}

const SYSTEM_PROMPT = `You are a professional translator specializing in Indian government and public sector organizations.
Your task is to translate organization fields from English to Hindi (Devanagari script).

IMPORTANT:
- Maintain official organization names accurately
- Use formal, professional Hindi
- Preserve numbers, dates, and abbreviations
- If a field is empty or null, return null
- Return valid JSON only, no additional text
- For location names, use official Hindi names (e.g., Delhi = दिल्ली, Mumbai = मुंबई)

Format your response as a JSON array with these exact keys per object:
[
  {
    "id": number,
    "name_hi": "Hindi translation of organization name",
    "description_hi": "Hindi translation or null"
  }
]`;

interface OrganizationRecord {
  id: number;
  name: string;
  description: string | null;
  [key: string]: any;
}

async function translateOrganizationBatch(
  orgsList: OrganizationRecord[]
): Promise<OrganizationTranslation[]> {
  const orgsJson = JSON.stringify(
    orgsList.map((org) => ({
      id: org.id,
      name: org.name,
      description: org.description,
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
        content: `Please translate these ${orgsList.length} organizations to Hindi:\n\n${orgsJson}`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  const jsonMatch = content.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error(`Could not find JSON array in response: ${content.text}`);
  }

  const translations = JSON.parse(jsonMatch[0]) as OrganizationTranslation[];
  return translations;
}

async function translateAndUpdate() {
  console.log("Starting Hindi translation for organizations...");
  const db = getDb();

  const orgsToTranslate = await db
    .select()
    .from(organizations)
    .where(isNull(organizations.nameHi))
    .limit(100);

  console.log(
    `Found ${orgsToTranslate.length} organizations to translate (batch size: 100)`
  );

  if (orgsToTranslate.length === 0) {
    console.log("All organizations already have Hindi translations!");
    return;
  }

  const batchSize = 10;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < orgsToTranslate.length; i += batchSize) {
    const batch = orgsToTranslate.slice(i, i + batchSize);
    console.log(
      `\nProcessing batch ${Math.floor(i / batchSize) + 1} (${batch.length} organizations)...`
    );

    try {
      const translations = await translateOrganizationBatch(batch);

      for (const translation of translations) {
        await db
          .update(organizations)
          .set({
            nameHi: translation.name_hi,
            descriptionHi: translation.description_hi,
          })
          .where(eq(organizations.id, translation.id));

        successCount++;
      }

      console.log(`✓ Successfully translated and updated ${batch.length} organizations`);
    } catch (error) {
      errorCount += batch.length;
      console.error(`✗ Error processing batch:`, error);
    }

    if (i + batchSize < orgsToTranslate.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log(
    `\n📊 Translation complete: ${successCount} succeeded, ${errorCount} failed`
  );
}

translateAndUpdate().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
