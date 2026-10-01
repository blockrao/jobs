import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "@/db";
import { exams } from "@/db/schema";
import { isNull, eq } from "drizzle-orm";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ExamTranslation {
  id: number;
  name_hi: string;
  description_hi: string | null;
}

const SYSTEM_PROMPT = `You are a professional translator specializing in Indian government exams and competitive examinations.
Your task is to translate exam fields from English to Hindi (Devanagari script).

IMPORTANT:
- Maintain official exam names and acronyms accurately
- Use formal, professional Hindi
- Preserve numbers, dates, and abbreviations
- If a field is empty or null, return null
- Return valid JSON only, no additional text
- Common exams: SSC = कर्मचारी चयन आयोग, UPSC = संघ लोक सेवा आयोग, Bank = बैंक परीक्षा

Format your response as a JSON array with these exact keys per object:
[
  {
    "id": number,
    "name_hi": "Hindi translation of exam name",
    "description_hi": "Hindi translation of description or null"
  }
]`;

interface ExamRecord {
  id: number;
  label: string;
  description: string | null;
  [key: string]: any;
}

async function translateExamBatch(
  examsList: ExamRecord[]
): Promise<ExamTranslation[]> {
  const examsJson = JSON.stringify(
    examsList.map((exam) => ({
      id: exam.id,
      name: exam.label,
      description: exam.description,
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
        content: `Please translate these ${examsList.length} exams to Hindi:\n\n${examsJson}`,
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

  const translations = JSON.parse(jsonMatch[0]) as ExamTranslation[];
  return translations;
}

async function translateAndUpdate() {
  console.log("Starting Hindi translation for exams...");
  const db = getDb();

  const examsToTranslate = await db
    .select()
    .from(exams)
    .where(isNull(exams.labelHi))
    .limit(100);

  console.log(
    `Found ${examsToTranslate.length} exams to translate (batch size: 100)`
  );

  if (examsToTranslate.length === 0) {
    console.log("All exams already have Hindi translations!");
    return;
  }

  const batchSize = 10;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < examsToTranslate.length; i += batchSize) {
    const batch = examsToTranslate.slice(i, i + batchSize);
    console.log(
      `\nProcessing batch ${Math.floor(i / batchSize) + 1} (${batch.length} exams)...`
    );

    try {
      const translations = await translateExamBatch(batch);

      for (const translation of translations) {
        await db
          .update(exams)
          .set({
            labelHi: translation.name_hi,
            descriptionHi: translation.description_hi,
          })
          .where(eq(exams.id, translation.id));

        successCount++;
      }

      console.log(`✓ Successfully translated and updated ${batch.length} exams`);
    } catch (error) {
      errorCount += batch.length;
      console.error(`✗ Error processing batch:`, error);
    }

    if (i + batchSize < examsToTranslate.length) {
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
