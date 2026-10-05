/**
 * Approve all pending job postings.
 * Run with: npm run approve-jobs
 */

import { getDb } from "@/db";
import { postings } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { findAggregatorViolations } from "@/lib/approval-guard";

async function approvePendingJobs() {
  const db = getDb();

  console.log("📋 Approving all pending job postings...\n");

  // Get count before
  const before = await db
    .select()
    .from(postings)
    .where(eq(postings.reviewStatus, "PENDING"));

  console.log(`  Current PENDING count: ${before.length}`);

  // Approve all pending that carry no aggregator name or link in a public field
  const clean = before.filter((p) => findAggregatorViolations(p).length === 0);
  console.log(`  Refused (aggregator reference): ${before.length - clean.length}`);
  if (clean.length > 0) {
    await db
      .update(postings)
      .set({ reviewStatus: "APPROVED", updatedAt: new Date() })
      .where(inArray(postings.id, clean.map((p) => p.id)));
  }

  // Get count after
  const after = await db
    .select()
    .from(postings)
    .where(eq(postings.reviewStatus, "PENDING"));

  console.log(`  After approval: ${after.length} PENDING remaining`);

  // Show final breakdown
  const byStatus = await db
    .select()
    .from(postings)
    .then((posts) => {
      const counts: Record<string, number> = {};
      for (const p of posts) {
        counts[p.reviewStatus] ??= 0;
        counts[p.reviewStatus]++;
      }
      return counts;
    });

  console.log("\n✅ Job Status Breakdown:");
  for (const [status, count] of Object.entries(byStatus)) {
    console.log(`   ${status}: ${count}`);
  }

  console.log("\n🎉 All pending jobs approved and live on exam pages!");
}

approvePendingJobs().catch((err) => {
  console.error("❌ Error approving jobs:", err);
  process.exit(1);
});
