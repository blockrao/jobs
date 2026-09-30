import { getDb } from "./index";
import { articles, categories, organizations, postingArticles, postingCategories, postingUpdates, postings } from "./schema";

async function main() {
  const db = getDb();

  const [ssc] = await db
    .insert(organizations)
    .values({
      slug: "ssc",
      name: "Staff Selection Commission",
      sector: "GOVERNMENT_CENTRAL",
      websiteUrl: "https://ssc.nic.in",
      description:
        "The Staff Selection Commission conducts recruitment exams for various posts in ministries and departments of the Government of India.",
    })
    .returning();

  const [acme] = await db
    .insert(organizations)
    .values({
      slug: "acme-technologies",
      name: "Acme Technologies",
      sector: "PRIVATE",
      websiteUrl: "https://example.com",
      description: "A sample private-sector technology company.",
    })
    .returning();

  const [bankingCat] = await db
    .insert(categories)
    .values({
      slug: "banking-jobs",
      name: "Banking Jobs",
      description: "Recruitment in public and private sector banks.",
    })
    .returning();

  const [sscCat] = await db
    .insert(categories)
    .values({
      slug: "ssc-jobs",
      name: "SSC Jobs",
      description: "Staff Selection Commission recruitment exams.",
    })
    .returning();

  const [cglPosting] = await db
    .insert(postings)
    .values({
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
    })
    .returning();

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

  await db.insert(postingCategories).values([
    { postingId: cglPosting.id, categoryId: sscCat.id },
  ]);

  const [privatePosting] = await db
    .insert(postings)
    .values({
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
    })
    .returning();

  await db.insert(postingCategories).values([
    { postingId: privatePosting.id, categoryId: bankingCat.id },
  ]);

  const [article] = await db
    .insert(articles)
    .values({
      slug: "ssc-cgl-2026-syllabus-exam-pattern",
      title: "SSC CGL 2026 Syllabus & Exam Pattern (Tier-I & Tier-II)",
      dek: "A complete breakdown of the SSC CGL 2026 syllabus, exam pattern, and marking scheme.",
      body: "SSC CGL 2026 is conducted in multiple tiers. Tier-I covers General Intelligence, General Awareness, Quantitative Aptitude, and English Comprehension...",
      type: "SYLLABUS",
      authorName: "RojgarSetu Editorial",
      status: "PUBLISHED",
      publishedAt: new Date(),
    })
    .returning();

  await db.insert(postingArticles).values([
    { postingId: cglPosting.id, articleId: article.id, relationType: "SYLLABUS" },
  ]);

  await db.insert(articles).values({
    slug: "acme-technologies-backend-engineer-interview-guide",
    title: "How to Ace the Acme Technologies Backend Engineer Interview",
    dek: "What to expect in the interview process and how to prepare.",
    body: "Acme Technologies' backend engineering interview covers system design, data structures, and a take-home assignment...",
    type: "INTERVIEW_PREP",
    authorName: "RojgarSetu Editorial",
    status: "PUBLISHED",
    publishedAt: new Date(),
  });

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
