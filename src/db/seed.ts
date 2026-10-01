import { eq } from "drizzle-orm";
import { getDb } from "./index";
import {
  articles,
  categories,
  organizations,
  postingArticles,
  postingCategories,
  postingUpdates,
  postings,
} from "./schema";

// Idempotent seed — safe to re-run. Rows with a unique slug are inserted with
// onConflictDoNothing and then read back by slug (so we always get the id,
// whether the row was just inserted or already existed). The posting timeline
// has no natural unique key, so it is cleared per-posting and re-inserted.
const db = getDb();

async function upsertOrg(values: typeof organizations.$inferInsert) {
  await db
    .insert(organizations)
    .values(values)
    .onConflictDoNothing({ target: organizations.slug });
  const [row] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, values.slug));
  return row;
}

async function upsertCategory(values: typeof categories.$inferInsert) {
  await db
    .insert(categories)
    .values(values)
    .onConflictDoNothing({ target: categories.slug });
  const [row] = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, values.slug));
  return row;
}

async function upsertPosting(values: typeof postings.$inferInsert) {
  await db
    .insert(postings)
    .values(values)
    .onConflictDoNothing({ target: postings.slug });
  const [row] = await db
    .select()
    .from(postings)
    .where(eq(postings.slug, values.slug));
  return row;
}

async function upsertArticle(values: typeof articles.$inferInsert) {
  await db
    .insert(articles)
    .values(values)
    .onConflictDoNothing({ target: articles.slug });
  const [row] = await db
    .select()
    .from(articles)
    .where(eq(articles.slug, values.slug));
  return row;
}

async function main() {
  const ssc = await upsertOrg({
    slug: "ssc",
    name: "Staff Selection Commission",
    sector: "GOVERNMENT_CENTRAL",
    websiteUrl: "https://ssc.nic.in",
    description:
      "The Staff Selection Commission conducts recruitment exams for various posts in ministries and departments of the Government of India.",
  });

  const acme = await upsertOrg({
    slug: "acme-technologies",
    name: "Acme Technologies",
    sector: "PRIVATE",
    websiteUrl: "https://example.com",
    description: "A sample private-sector technology company.",
  });

  const bankingCat = await upsertCategory({
    slug: "banking-jobs",
    name: "Banking Jobs",
    description: "Recruitment in public and private sector banks.",
  });

  const sscCat = await upsertCategory({
    slug: "ssc-jobs",
    name: "SSC Jobs",
    description: "Staff Selection Commission recruitment exams.",
  });

  const cglPosting = await upsertPosting({
    slug: "ssc-cgl-2026-demo",
    title: "SSC CGL 2026",
    kind: "GOVERNMENT",
    organizationId: ssc.id,
    postNames: ["Assistant Section Officer", "Inspector", "Auditor"],
    description:
      "SSC Combined Graduate Level (CGL) 2026 recruitment for various Group B and Group C posts in central government ministries and departments.",
    eligibility:
      "Bachelor's degree in any discipline from a recognized university. Age 18–32 years (post-dependent), with age relaxation for reserved categories as per government norms.",
    totalVacancies: 4500,
    ageLimitMin: 18,
    ageLimitMax: 32,
    applicationFeeGeneral: 100,
    applicationFeeReserved: 0,
    salaryMin: 25500,
    salaryMax: 81100,
    salaryCurrency: "INR",
    salaryPeriod: "MONTH",
    locationCountry: "India",
    officialNotificationUrl: "https://ssc.nic.in/notice/cgl-2026.pdf",
    applyUrl: "https://ssc.nic.in/apply/cgl-2026",
    currentStage: "ADMIT_CARD_RELEASED",
    validThrough: new Date("2026-11-15"),
    examDate: new Date("2026-12-10"),
  });

  const privatePosting = await upsertPosting({
    slug: "acme-technologies-backend-engineer-blr-demo",
    title: "Backend Engineer",
    kind: "PRIVATE",
    organizationId: acme.id,
    description:
      "Acme Technologies is hiring a Backend Engineer to build and scale our core platform services.",
    employmentType: "FULL_TIME",
    workplaceType: "HYBRID",
    locationCity: "Bengaluru",
    locationRegion: "Karnataka",
    locationCountry: "India",
    salaryMin: 1800000,
    salaryMax: 3000000,
    salaryCurrency: "INR",
    salaryPeriod: "YEAR",
    seniorityLevel: "Mid-Senior",
    skills: ["Node.js", "PostgreSQL", "AWS"],
    applyUrl: "https://example.com/careers/backend-engineer",
    currentStage: "ACTIVE",
    validThrough: new Date("2026-12-31"),
  });

  // Timeline has no unique key — clear + re-insert so counts stay stable.
  await db
    .delete(postingUpdates)
    .where(eq(postingUpdates.postingId, cglPosting.id));
  await db.insert(postingUpdates).values([
    {
      postingId: cglPosting.id,
      stage: "NOTIFICATION_OUT",
      title: "SSC CGL 2026 notification released",
      eventDate: new Date("2026-09-01"),
      linkUrl: "https://ssc.nic.in/notice/cgl-2026.pdf",
    },
    {
      postingId: cglPosting.id,
      stage: "APPLICATION_OPEN",
      title: "Online applications opened",
      eventDate: new Date("2026-09-05"),
    },
    {
      postingId: cglPosting.id,
      stage: "ADMIT_CARD_RELEASED",
      title: "Admit card released for Tier-I exam",
      eventDate: new Date("2026-09-28"),
      linkUrl: "https://ssc.nic.in/admit-card/cgl-2026",
    },
  ]);

  await db
    .insert(postingCategories)
    .values({ postingId: cglPosting.id, categoryId: sscCat.id })
    .onConflictDoNothing();
  await db
    .insert(postingCategories)
    .values({ postingId: privatePosting.id, categoryId: bankingCat.id })
    .onConflictDoNothing();

  const syllabusArticle = await upsertArticle({
    slug: "ssc-cgl-2026-syllabus-exam-pattern",
    title: "SSC CGL 2026 Syllabus & Exam Pattern (Tier-I & Tier-II)",
    dek: "A complete breakdown of the SSC CGL 2026 syllabus, exam pattern, and marking scheme.",
    body: "SSC CGL 2026 is conducted in multiple tiers. Tier-I covers General Intelligence, General Awareness, Quantitative Aptitude, and English Comprehension...",
    type: "SYLLABUS",
    authorName: "JobOye Editorial",
    status: "PUBLISHED",
    publishedAt: new Date(),
  });

  await upsertArticle({
    slug: "acme-technologies-backend-engineer-interview-guide",
    title: "How to Ace the Acme Technologies Backend Engineer Interview",
    dek: "What to expect in the interview process and how to prepare.",
    body: "Acme Technologies' backend engineering interview covers system design, data structures, and a take-home assignment...",
    type: "INTERVIEW_PREP",
    authorName: "JobOye Editorial",
    status: "PUBLISHED",
    publishedAt: new Date(),
  });

  await db
    .insert(postingArticles)
    .values({
      postingId: cglPosting.id,
      articleId: syllabusArticle.id,
      relationType: "SYLLABUS",
    })
    .onConflictDoNothing();

  console.log("Seed complete (idempotent).");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
