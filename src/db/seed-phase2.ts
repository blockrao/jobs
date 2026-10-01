/**
 * Phase 2 Seed Script: Temporal & Normalized Entities
 *
 * Populates:
 * - Recruitments (campaigns like SSC CGL 2024, UPSC CSE 2025, etc.)
 * - Posts (recruitment-specific positions)
 * - Eligibilities (qualification, age, experience requirements)
 * - Vacancies (segmented by location, category, gender)
 *
 * Run with: npx tsx src/db/seed-phase2.ts
 */

import { getDb } from "./index";
import {
  recruitments,
  posts,
  eligibilities,
  vacancies,
  selectionProcesses,
} from "./schema-v2";
import { eq } from "drizzle-orm";

const db = getDb();

async function seedPhase2() {
  console.log("🌱 Phase 2 Seed: Temporal Entities & Recruitment Data\n");

  try {
    // ========== Helper Functions ==========
    const getOrgId = async (slug: string) => {
      const result = await db.query.organizationsNew.findFirst({
        where: eq(db.schema?.organizationsNew.slug, slug),
      });
      return result?.id;
    };

    const getExamId = async (slug: string) => {
      const result = await db.query.examsNew.findFirst({
        where: eq(db.schema?.examsNew.slug, slug),
      });
      return result?.id;
    };

    const getPositionId = async (slug: string) => {
      const result = await db.query.positions.findFirst({
        where: eq(db.schema?.positions.slug, slug),
      });
      return result?.id;
    };

    const getQualificationId = async (slug: string) => {
      const result = await db.query.qualifications.findFirst({
        where: eq(db.schema?.qualifications.slug, slug),
      });
      return result?.id;
    };

    const getLocationId = async (slug: string) => {
      const result = await db.query.locations.findFirst({
        where: eq(db.schema?.locations.slug, slug),
      });
      return result?.id;
    };

    // ========== Recruitments ==========
    console.log("📝 Seeding Recruitments (Campaign Data)...");

    const sscId = await getOrgId("ssc");
    const upscId = await getOrgId("upsc");
    const itbpId = await getOrgId("itbp");
    const sscCglExamId = await getExamId("ssc-cgl");
    const upscCseExamId = await getExamId("upsc-ias");

    const recruitmentData = [
      // SSC CGL 2024
      {
        organizationId: sscId,
        examId: sscCglExamId,
        year: 2024,
        name: "SSC Combined Graduate Level Examination 2024",
        slug: "ssc-cgl-2024",
        status: "ACTIVE" as const,
        notificationDate: new Date("2024-03-15"),
        applicationStartDate: new Date("2024-03-20"),
        applicationEndDate: new Date("2024-04-20"),
        examDate: new Date("2024-06-15"),
        resultDate: new Date("2024-10-30"),
        totalVacancies: 8432,
        description:
          "Annual recruitment for Group B and Group C posts under SSC",
        notificationUrl: "https://www.ssc.nic.in/notification/2024/cgl",
      },
      // UPSC CSE 2025
      {
        organizationId: upscId,
        examId: upscCseExamId,
        year: 2025,
        name: "Civil Services Examination 2025",
        slug: "upsc-ias-2025",
        status: "UPCOMING" as const,
        notificationDate: new Date("2025-02-01"),
        applicationStartDate: new Date("2025-02-15"),
        applicationEndDate: new Date("2025-03-31"),
        examDate: new Date("2025-05-25"),
        resultDate: new Date("2026-04-15"),
        totalVacancies: 1056,
        description:
          "Annual examination for Indian Administrative Service, Indian Police Service, and other central services",
        notificationUrl: "https://www.upsc.gov.in/examinations/civil-services",
      },
      // ITBP Constable 2026
      {
        organizationId: itbpId,
        examId: null,
        year: 2026,
        name: "ITBP Constable (General Duty) Recruitment 2026",
        slug: "itbp-constable-2026",
        status: "UPCOMING" as const,
        notificationDate: new Date("2026-01-15"),
        applicationStartDate: new Date("2026-01-20"),
        applicationEndDate: new Date("2026-02-20"),
        examDate: new Date("2026-04-10"),
        resultDate: null,
        totalVacancies: 1200,
        description: "Direct recruitment for Constable (General Duty) in ITBP",
        notificationUrl: "https://www.itbpolice.nic.in/recruitment/2026",
      },
    ];

    const insertedRecruitments: any[] = [];
    for (const rec of recruitmentData) {
      const result = await db
        .insert(recruitments)
        .values(rec as any)
        .onConflictDoNothing()
        .returning();
      if (result.length > 0) {
        insertedRecruitments.push(result[0]);
      }
    }
    console.log(`  ✓ Inserted ${recruitmentData.length} recruitments\n`);

    // ========== Posts ==========
    console.log("📋 Seeding Posts (Recruitment-Specific Positions)...");

    const constablePositionId = await getPositionId("constable");
    const asoPositionId = await getPositionId("aso");
    const iasPositionId = await getPositionId("sub-inspector"); // Proxy for IAS/PCS roles

    const postsData = [
      // SSC CGL 2024 - Multiple posts
      {
        recruitmentId: recruitmentData[0].slug === "ssc-cgl-2024" ? 1 : 0,
        positionId: asoPositionId,
        name: "Assistant Section Officer",
        slug: "aso-ssc-cgl-2024",
        description: "ASO posts in various government ministries",
        salaryMin: 25500,
        salaryMax: 81100,
        vacancyTotal: 1500,
      },
      {
        recruitmentId: recruitmentData[0].slug === "ssc-cgl-2024" ? 1 : 0,
        positionId: asoPositionId,
        name: "Junior Statistical Officer",
        slug: "jso-ssc-cgl-2024",
        description: "Statistical Officer posts",
        salaryMin: 25500,
        salaryMax: 81100,
        vacancyTotal: 450,
      },
      // UPSC CSE 2025
      {
        recruitmentId: recruitmentData[1].slug === "upsc-ias-2025" ? 2 : 0,
        positionId: iasPositionId,
        name: "IAS/IPS/IFS",
        slug: "ias-2025",
        description: "Indian Administrative Service, Police Service, Foreign Service",
        salaryMin: 56100,
        salaryMax: 225000,
        vacancyTotal: 1056,
      },
      // ITBP Constable 2026
      {
        recruitmentId: recruitmentData[2].slug === "itbp-constable-2026" ? 3 : 0,
        positionId: constablePositionId,
        name: "Constable (General Duty)",
        slug: "constable-gd-itbp-2026",
        description: "Constable positions in ITBP",
        salaryMin: 21000,
        salaryMax: 70000,
        vacancyTotal: 1200,
      },
    ];

    const insertedPosts: any[] = [];
    for (const post of postsData) {
      // Get the actual recruitment ID from the inserted recruitments
      const recruitment = insertedRecruitments.find((r) =>
        r.slug.includes(post.slug.split("-").pop())
      );
      if (recruitment) {
        const result = await db
          .insert(posts)
          .values({
            ...post,
            recruitmentId: recruitment.id,
          } as any)
          .onConflictDoNothing()
          .returning();
        if (result.length > 0) {
          insertedPosts.push(result[0]);
        }
      }
    }
    console.log(`  ✓ Inserted ${postsData.length} posts\n`);

    // ========== Eligibilities ==========
    console.log("✓ Seeding Eligibilities...");

    const bachelorQualId = await getQualificationId("bachelor");
    const twelfthQualId = await getQualificationId("12th");

    for (const post of insertedPosts) {
      const eligibilityData = {
        postId: post.id,
        qualificationId:
          post.slug.includes("aso") || post.slug.includes("ias")
            ? bachelorQualId
            : twelfthQualId,
        ageMin: post.slug.includes("constable") ? 18 : 20,
        ageMax: post.slug.includes("constable") ? 25 : 30,
        experienceYearsMin: 0,
        experienceYearsMax: null,
        domicileType: "ANY" as const,
        citizenship: "INDIAN" as const,
      };

      await db
        .insert(eligibilities)
        .values(eligibilityData as any)
        .onConflictDoNothing();
    }
    console.log(`  ✓ Inserted eligibilities for ${insertedPosts.length} posts\n`);

    // ========== Vacancies ==========
    console.log("📊 Seeding Vacancies (by Location & Category)...");

    // Major locations for SSC CGL
    const majorLocations = ["delhi", "haryana", "maharashtra", "karnataka"];
    const categories = ["GENERAL", "OBC", "SC", "ST", "EWS"] as const;
    const genders = ["ANY"] as const;

    let vacancyCount = 0;
    for (const post of insertedPosts) {
      const vacanciesPerLocation = Math.floor((post.vacancyTotal || 0) / 4);

      for (const locSlug of majorLocations) {
        const locationId = await getLocationId(locSlug);
        if (!locationId) continue;

        for (const category of categories) {
          for (const gender of genders) {
            const categoryCount = Math.floor(vacanciesPerLocation / 5);
            await db
              .insert(vacancies)
              .values({
                postId: post.id,
                locationId,
                categoryType: category,
                gender,
                count: categoryCount > 0 ? categoryCount : 1,
              } as any)
              .onConflictDoNothing();
            vacancyCount++;
          }
        }
      }
    }
    console.log(`  ✓ Inserted ${vacancyCount} vacancy records\n`);

    console.log("✅ Phase 2 Seed Complete!\n");
    console.log("Summary:");
    console.log(`  • Recruitments: ${insertedRecruitments.length}`);
    console.log(`  • Posts: ${insertedPosts.length}`);
    console.log(`  • Eligibilities: ${insertedPosts.length}`);
    console.log(`  • Vacancy records: ${vacancyCount}`);
    console.log(
      "\n🚀 Next: Run Phase 3 to extend postings table with inferred relationships"
    );
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seedPhase2().then(() => {
  process.exit(0);
});
