import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "@/db";
import { articles } from "@/db/schema";
import { isNull, eq } from "drizzle-orm";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ArticleTranslation {
  id: number;
  title_hi: string;
  body_hi: string | null;
  dek_hi: string | null;
}

const SYSTEM_PROMPT = `You are a professional translator specializing in content about Indian government jobs and exams.
Your task is to translate article fields from English to Hindi (Devanagari script).

IMPORTANT:
- Maintain technical accuracy and official terminology
- Use clear, accessible Hindi suitable for a general audience
- Preserve numbers, dates, acronyms, and links
- If a field is empty or null, return null
- Return valid JSON only, no additional text
- Keep formatting and structure of longer content

Format your response as a JSON array with these exact keys per object:
[
  {
    "id": number,
    "title_hi": "Hindi translation of title",
    "body_hi": "Hindi translation of full article body or null",
    "dek_hi": "Hindi translation of short description/summary or null"
  }
]`;

interface ArticleRecord {
  id: number;
  title: string;
  body: string | null;
  dek: string | null;
  [key: string]: any;
}

async function translateArticleBatch(
  articlesList: ArticleRecord[]
): Promise<ArticleTranslation[]> {
  const articlesJson = JSON.stringify(
    articlesList.map((article) => ({
      id: article.id,
      title: article.title,
      body: article.body?.substring(0, 1000), // Limit to first 1000 chars per article
      dek: article.dek,
    })),
    null,
    2
  );

  const response = await client.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Please translate these ${articlesList.length} articles to Hindi:\n\n${articlesJson}`,
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

  const translations = JSON.parse(jsonMatch[0]) as ArticleTranslation[];
  return translations;
}

async function translateAndUpdate() {
  console.log("Starting Hindi translation for articles...");
  const db = getDb();

  const articlesToTranslate = await db
    .select()
    .from(articles)
    .where(isNull(articles.titleHi))
    .limit(100);

  console.log(
    `Found ${articlesToTranslate.length} articles to translate (batch size: 100)`
  );

  if (articlesToTranslate.length === 0) {
    console.log("All articles already have Hindi translations!");
    return;
  }

  const batchSize = 10;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < articlesToTranslate.length; i += batchSize) {
    const batch = articlesToTranslate.slice(i, i + batchSize);
    console.log(
      `\nProcessing batch ${Math.floor(i / batchSize) + 1} (${batch.length} articles)...`
    );

    try {
      const translations = await translateArticleBatch(batch);

      for (const translation of translations) {
        await db
          .update(articles)
          .set({
            titleHi: translation.title_hi,
            bodyHi: translation.body_hi,
            dekHi: translation.dek_hi,
          })
          .where(eq(articles.id, translation.id));

        successCount++;
      }

      console.log(`✓ Successfully translated and updated ${batch.length} articles`);
    } catch (error) {
      errorCount += batch.length;
      console.error(`✗ Error processing batch:`, error);
    }

    if (i + batchSize < articlesToTranslate.length) {
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
