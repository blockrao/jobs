import { getDb } from "./index";
import { postings } from "./schema";
import { eq } from "drizzle-orm";

const db = getDb();

async function auditPositions() {
  const approvedPostings = await db
    .select({ title: postings.title, description: postings.description })
    .from(postings)
    .where(eq(postings.reviewStatus, "APPROVED"))
    .limit(200);

  console.log(`Found ${approvedPostings.length} approved postings\n`);
  
  // Extract unique titles and categorize
  const positions = new Set<string>();
  const categories: Record<string, string[]> = {
    POLICE: [],
    ADMINISTRATIVE: [],
    BANKING: [],
    TEACHING: [],
    ENGINEERING: [],
    DEFENCE: [],
    RAILWAY: [],
    OTHER: [],
  };

  for (const p of approvedPostings) {
    const title = p.title?.toLowerCase() || "";
    positions.add(p.title || "Unknown");

    // Simple categorization
    if (title.includes("police") || title.includes("constable") || title.includes("sub-inspector")) {
      categories.POLICE.push(p.title || "");
    } else if (title.includes("officer") || title.includes("auditor") || title.includes("inspector")) {
      categories.ADMINISTRATIVE.push(p.title || "");
    } else if (title.includes("bank") || title.includes("clerk") || title.includes("po")) {
      categories.BANKING.push(p.title || "");
    } else if (title.includes("teacher") || title.includes("lecturer")) {
      categories.TEACHING.push(p.title || "");
    } else if (title.includes("engineer")) {
      categories.ENGINEERING.push(p.title || "");
    } else if (title.includes("defence") || title.includes("army") || title.includes("soldier")) {
      categories.DEFENCE.push(p.title || "");
    } else if (title.includes("railway") || title.includes("rrb")) {
      categories.RAILWAY.push(p.title || "");
    } else {
      categories.OTHER.push(p.title || "");
    }
  }

  console.log("=== Unique Positions ===\n");
  Array.from(positions)
    .sort()
    .forEach((pos) => console.log(`• ${pos}`));

  console.log("\n=== By Category ===\n");
  Object.entries(categories).forEach(([cat, titles]) => {
    if (titles.length > 0) {
      console.log(`${cat}: ${titles.length} positions`);
      [...new Set(titles)].slice(0, 3).forEach((t) => console.log(`  - ${t}`));
    }
  });
}

auditPositions()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
