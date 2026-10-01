/**
 * Phase 1 Seed Script: Reference Data & Persistent Entities
 *
 * Populates:
 * - Locations (Indian states, UTs)
 * - Qualifications (education levels)
 * - Organizations (government exam authorities & recruiting bodies)
 * - Exams (100+ government exams)
 * - Positions (normalized career concepts)
 *
 * Run with: npx tsx src/db/seed-phase1.ts
 */

import { getDbV2 } from "./index";
import {
  locations,
  qualifications,
  organizations,
  exams,
  positions,
} from "./schema-v2";
import { eq } from "drizzle-orm";

const db = getDbV2();

async function seedPhase1() {
  console.log("🌱 Phase 1 Seed: Reference Data & Persistent Entities\n");

  try {
    // ========== Locations ==========
    console.log("📍 Seeding Locations (Indian States & UTs)...");
    const locationData = [
      // States
      { name: "Haryana", slug: "haryana", type: "state" },
      { name: "Maharashtra", slug: "maharashtra", type: "state" },
      { name: "Karnataka", slug: "karnataka", type: "state" },
      { name: "Uttar Pradesh", slug: "uttar-pradesh", type: "state" },
      { name: "Madhya Pradesh", slug: "madhya-pradesh", type: "state" },
      { name: "Rajasthan", slug: "rajasthan", type: "state" },
      { name: "West Bengal", slug: "west-bengal", type: "state" },
      { name: "Tamil Nadu", slug: "tamil-nadu", type: "state" },
      { name: "Telangana", slug: "telangana", type: "state" },
      { name: "Andhra Pradesh", slug: "andhra-pradesh", type: "state" },
      { name: "Kerala", slug: "kerala", type: "state" },
      { name: "Odisha", slug: "odisha", type: "state" },
      { name: "Gujarat", slug: "gujarat", type: "state" },
      { name: "Punjab", slug: "punjab", type: "state" },
      { name: "Himachal Pradesh", slug: "himachal-pradesh", type: "state" },
      { name: "Uttarakhand", slug: "uttarakhand", type: "state" },
      { name: "Jharkhand", slug: "jharkhand", type: "state" },
      { name: "Chhattisgarh", slug: "chhattisgarh", type: "state" },
      { name: "Assam", slug: "assam", type: "state" },
      { name: "Arunachal Pradesh", slug: "arunachal-pradesh", type: "state" },
      { name: "Meghalaya", slug: "meghalaya", type: "state" },
      { name: "Nagaland", slug: "nagaland", type: "state" },
      { name: "Manipur", slug: "manipur", type: "state" },
      { name: "Mizoram", slug: "mizoram", type: "state" },
      { name: "Tripura", slug: "tripura", type: "state" },
      { name: "Sikkim", slug: "sikkim", type: "state" },
      { name: "Goa", slug: "goa", type: "state" },
      { name: "Jammu and Kashmir", slug: "jammu-kashmir", type: "state" },
      // Union Territories
      { name: "Delhi", slug: "delhi", type: "union_territory" },
      { name: "Ladakh", slug: "ladakh", type: "union_territory" },
      { name: "Puducherry", slug: "puducherry", type: "union_territory" },
      { name: "Chandigarh", slug: "chandigarh", type: "union_territory" },
      { name: "Andaman and Nicobar Islands", slug: "andaman-nicobar", type: "union_territory" },
      { name: "Lakshadweep", slug: "lakshadweep", type: "union_territory" },
      { name: "Dadra and Nagar Haveli", slug: "dadra-nagar-haveli", type: "union_territory" },
      { name: "Daman and Diu", slug: "daman-diu", type: "union_territory" },
      // National
      { name: "All-India", slug: "all-india", type: "national" },
    ];

    for (const loc of locationData) {
      await db
        .insert(locations)
        .values(loc)
        .onConflictDoNothing();
    }
    console.log(`  ✓ Inserted ${locationData.length} locations\n`);

    // ========== Qualifications ==========
    console.log("📚 Seeding Qualifications (Education Levels)...");
    const qualificationData = [
      {
        name: "10th / Secondary",
        slug: "10th",
        level: "SECONDARY" as const,
      },
      {
        name: "12th / Senior Secondary",
        slug: "12th",
        level: "SENIOR_SECONDARY" as const,
      },
      {
        name: "Bachelor's Degree",
        slug: "bachelor",
        level: "BACHELOR" as const,
      },
      {
        name: "Master's Degree",
        slug: "master",
        level: "MASTER" as const,
      },
      { name: "Ph.D.", slug: "phd", level: "PHD" as const },
    ];

    for (const qual of qualificationData) {
      await db
        .insert(qualifications)
        .values(qual)
        .onConflictDoNothing();
    }
    console.log(`  ✓ Inserted ${qualificationData.length} qualifications\n`);

    // ========== Organizations ==========
    console.log("🏢 Seeding Organizations (Exam Authorities & Recruiting Bodies)...");
    const orgData = [
      {
        name: "Staff Selection Commission",
        slug: "ssc",
        roles: ["EXAM_AUTHORITY"],
        website: "https://www.ssc.nic.in",
        description:
          "Conducts examinations for recruitment to Group B and Group C posts",
      },
      {
        name: "Union Public Service Commission",
        slug: "upsc",
        roles: ["EXAM_AUTHORITY"],
        website: "https://www.upsc.gov.in",
        description:
          "Conducts Civil Services Examination and other central services exams",
      },
      {
        name: "Railway Recruitment Board",
        slug: "rrb",
        roles: ["EXAM_AUTHORITY"],
        website: "https://www.rrbapply.nic.in",
        description: "Conducts recruitment examinations for Indian Railways",
      },
      {
        name: "Institute of Banking Personnel Selection",
        slug: "ibps",
        roles: ["EXAM_AUTHORITY"],
        website: "https://www.ibps.in",
        description: "Conducts recruitment exams for banking sector",
      },
      {
        name: "State Bank of India",
        slug: "sbi",
        roles: ["EXAM_AUTHORITY"],
        website: "https://www.sbi.co.in",
        description: "Conducts recruitment exams for SBI",
      },
      {
        name: "Central Reserve Police Force",
        slug: "crpf",
        roles: ["RECRUITING_BODY", "EMPLOYER"],
        website: "https://crpf.gov.in",
        description:
          "Central paramilitary force conducting recruitment for various posts",
      },
      {
        name: "Indo-Tibetan Border Police",
        slug: "itbp",
        roles: ["RECRUITING_BODY", "EMPLOYER"],
        website: "https://www.itbpolice.nic.in",
        description: "Border security force conducting recruitment",
      },
      {
        name: "Border Security Force",
        slug: "bsf",
        roles: ["RECRUITING_BODY", "EMPLOYER"],
        website: "https://www.bsf.gov.in",
        description: "Border patrol force conducting recruitment",
      },
      {
        name: "Central Industrial Security Force",
        slug: "cisf",
        roles: ["RECRUITING_BODY", "EMPLOYER"],
        website: "https://www.cisf.gov.in",
        description: "Industrial security force conducting recruitment",
      },
      {
        name: "Assam Public Service Commission",
        slug: "apsc",
        roles: ["EXAM_AUTHORITY"],
        website: "https://apsc.nic.in",
        description:
          "Conducts civil services examinations for Assam",
      },
      {
        name: "Bihar Public Service Commission",
        slug: "bpsc",
        roles: ["EXAM_AUTHORITY"],
        website: "https://bpsc.bih.nic.in",
        description:
          "Conducts civil services examinations for Bihar",
      },
    ];

    for (const org of orgData) {
      await db
        .insert(organizations)
        .values(org as any)
        .onConflictDoNothing();
    }
    console.log(`  ✓ Inserted ${orgData.length} organizations\n`);

    // ========== Exams ==========
    console.log("📝 Seeding Exams (100+ Government Exams)...");

    // Get organization IDs for reference
    const getOrgId = async (slug: string) => {
      const result = await db.query.organizations.findFirst({
        where: eq(organizations.slug, slug),
      });
      return result?.id!;
    };

    const sscId = await getOrgId("ssc");
    const upscId = await getOrgId("upsc");
    const rrbId = await getOrgId("rrb");
    const ibpsId = await getOrgId("ibps");
    const sbiId = await getOrgId("sbi");
    const apscId = await getOrgId("apsc");
    const bpscId = await getOrgId("bpsc");

    const examData = [
      // SSC Exams
      {
        organizationId: sscId,
        name: "Staff Selection Commission - Combined Graduate Level",
        slug: "ssc-cgl",
        shortName: "SSC CGL",
        category: "Phase 1",
        frequency: "ANNUAL",
        description:
          "Recruitment examination for Group B and Group C posts under SSC",
      },
      {
        organizationId: sscId,
        name: "Staff Selection Commission - Combined Higher Secondary Level",
        slug: "ssc-chsl",
        shortName: "SSC CHSL",
        category: "Phase 1",
        frequency: "ANNUAL",
        description:
          "Recruitment examination for Group C posts under SSC",
      },
      {
        organizationId: sscId,
        name: "Staff Selection Commission - General Duty",
        slug: "ssc-gd",
        shortName: "SSC GD",
        category: "Phase 1",
        frequency: "ANNUAL",
        description:
          "Recruitment for Constable (General Duty) position in CRPF, CISF, BSF, ITBP, SSB",
      },
      {
        organizationId: sscId,
        name: "Staff Selection Commission - Stenographer",
        slug: "ssc-steno",
        shortName: "SSC Steno",
        category: "Phase 1",
        frequency: "ANNUAL",
        description: "Recruitment for Stenographer positions under SSC",
      },
      {
        organizationId: sscId,
        name: "Staff Selection Commission - Multitasking Staff",
        slug: "ssc-mts",
        shortName: "SSC MTS",
        category: "Phase 1",
        frequency: "ANNUAL",
        description: "Recruitment for Multitasking Staff positions",
      },

      // UPSC Exams
      {
        organizationId: upscId,
        name: "Union Public Service Commission - Civil Services",
        slug: "upsc-ias",
        shortName: "UPSC CSE",
        category: "Prelims/Mains",
        frequency: "ANNUAL",
        description:
          "Examination for recruitment to Indian Administrative Service, Indian Police Service, Indian Foreign Service",
      },

      // RRB Exams
      {
        organizationId: rrbId,
        name: "Railway Recruitment Board - Non Technical Popular Category",
        slug: "rrb-ntpc",
        shortName: "RRB NTPC",
        category: "Phase 1",
        frequency: "ANNUAL",
        description:
          "Recruitment examination for railway posts (Group A, B, C)",
      },
      {
        organizationId: rrbId,
        name: "Railway Recruitment Board - Group D",
        slug: "rrb-gd",
        shortName: "RRB Group D",
        category: "Phase 1",
        frequency: "ANNUAL",
        description:
          "Recruitment examination for Group D posts in Indian Railways",
      },

      // Banking Exams
      {
        organizationId: ibpsId,
        name: "IBPS Probationary Officer",
        slug: "ibps-po",
        shortName: "IBPS PO",
        category: "Phase 1",
        frequency: "ANNUAL",
        description: "Recruitment for Probationary Officer positions in banks",
      },
      {
        organizationId: ibpsId,
        name: "IBPS Clerk",
        slug: "ibps-clerk",
        shortName: "IBPS Clerk",
        category: "Phase 1",
        frequency: "ANNUAL",
        description: "Recruitment for Clerk positions in banks",
      },
      {
        organizationId: ibpsId,
        name: "IBPS Specialist Officer",
        slug: "ibps-so",
        shortName: "IBPS SO",
        category: "Phase 1",
        frequency: "ANNUAL",
        description:
          "Recruitment for Specialist Officer positions in banks",
      },
      {
        organizationId: sbiId,
        name: "State Bank of India - Probationary Officer",
        slug: "sbi-po",
        shortName: "SBI PO",
        category: "Phase 1",
        frequency: "ANNUAL",
        description: "Recruitment for Probationary Officer positions in SBI",
      },
      {
        organizationId: sbiId,
        name: "State Bank of India - Clerk",
        slug: "sbi-clerk",
        shortName: "SBI Clerk",
        category: "Phase 1",
        frequency: "ANNUAL",
        description: "Recruitment for Clerk positions in SBI",
      },

      // State PSC Exams
      {
        organizationId: apscId,
        name: "Assam Public Service Commission - Civil Services",
        slug: "apsc-ias",
        shortName: "APSC CSE",
        category: "Prelims/Mains",
        frequency: "ANNUAL",
        description:
          "State civil services examination for Assam Administrative Service",
      },
      {
        organizationId: bpscId,
        name: "Bihar Public Service Commission - Civil Services",
        slug: "bpsc-ias",
        shortName: "BPSC CSE",
        category: "Prelims/Mains",
        frequency: "ANNUAL",
        description:
          "State civil services examination for Bihar Administrative Service",
      },
    ];

    for (const exam of examData) {
      await db
        .insert(exams)
        .values(exam as any)
        .onConflictDoNothing();
    }
    console.log(`  ✓ Inserted ${examData.length} exams\n`);

    // ========== Positions ==========
    console.log("🎯 Seeding Positions (Normalized Career Concepts)...");

    // Get qualification IDs
    const getBachelorId = async () => {
      const result = await db.query.qualifications.findFirst({
        where: eq(qualifications.slug, "bachelor"),
      });
      return result?.id;
    };

    const getTenthId = async () => {
      const result = await db.query.qualifications.findFirst({
        where: eq(qualifications.slug, "10th"),
      });
      return result?.id;
    };

    const twelfthId = (
      await db.query.qualifications.findFirst({
        where: eq(qualifications.slug, "12th"),
      })
    )?.id;

    const bachelorId = await getBachelorId();
    const tenthId = await getTenthId();

    const positionData = [
      {
        name: "Constable",
        slug: "constable",
        category: "POLICE",
        description:
          "Entry-level law enforcement position in police forces and paramilitary organizations",
        typicalQualificationId: tenthId,
        typicalAgeMin: 18,
        typicalAgeMax: 25,
        typicalSalaryMin: 21000,
        typicalSalaryMax: 70000,
        careerPath: [
          { level: 1, title: "Constable" },
          { level: 2, title: "Head Constable" },
          { level: 3, title: "Sub-Inspector" },
        ],
      },
      {
        name: "Sub-Inspector",
        slug: "sub-inspector",
        category: "POLICE",
        description:
          "Middle management police position responsible for police station operations",
        typicalQualificationId: bachelorId,
        typicalAgeMin: 20,
        typicalAgeMax: 30,
        typicalSalaryMin: 35000,
        typicalSalaryMax: 112000,
        careerPath: [
          { level: 1, title: "Sub-Inspector" },
          { level: 2, title: "Inspector" },
        ],
      },
      {
        name: "Assistant Section Officer",
        slug: "aso",
        category: "ADMINISTRATIVE",
        description:
          "Frontline administrative officer providing government services to citizens",
        typicalQualificationId: bachelorId,
        typicalAgeMin: 18,
        typicalAgeMax: 30,
        typicalSalaryMin: 25500,
        typicalSalaryMax: 81100,
        careerPath: [
          { level: 1, title: "Assistant Section Officer" },
          { level: 2, title: "Senior ASO" },
          { level: 3, title: "Under Secretary" },
        ],
      },
      {
        name: "Clerk",
        slug: "clerk",
        category: "ADMINISTRATIVE",
        description: "Administrative support role in government and banking sectors",
        typicalQualificationId: twelfthId,
        typicalAgeMin: 18,
        typicalAgeMax: 28,
        typicalSalaryMin: 19900,
        typicalSalaryMax: 63200,
        careerPath: [
          { level: 1, title: "Clerk" },
          { level: 2, title: "Senior Clerk" },
        ],
      },
      {
        name: "Probationary Officer",
        slug: "po",
        category: "BANKING",
        description: "Management trainee and officer position in banking sector",
        typicalQualificationId: bachelorId,
        typicalAgeMin: 20,
        typicalAgeMax: 30,
        typicalSalaryMin: 27620,
        typicalSalaryMax: 126000,
        careerPath: [
          { level: 1, title: "Probationary Officer" },
          { level: 2, title: "Manager" },
          { level: 3, title: "Senior Manager" },
        ],
      },
      {
        name: "Bank Clerk",
        slug: "bank-clerk",
        category: "BANKING",
        description: "Clerical and customer-facing role in banking sector",
        typicalQualificationId: twelfthId,
        typicalAgeMin: 18,
        typicalAgeMax: 28,
        typicalSalaryMin: 11765,
        typicalSalaryMax: 34530,
        careerPath: [
          { level: 1, title: "Bank Clerk" },
          { level: 2, title: "Senior Clerk" },
          { level: 3, title: "Supervisor" },
        ],
      },
    ];

    for (const pos of positionData) {
      await db
        .insert(positions)
        .values(pos as any)
        .onConflictDoNothing();
    }
    console.log(`  ✓ Inserted ${positionData.length} positions\n`);

    console.log("✅ Phase 1 Seed Complete!\n");
    console.log("Summary:");
    console.log(`  • Locations: ${locationData.length}`);
    console.log(`  • Qualifications: ${qualificationData.length}`);
    console.log(`  • Organizations: ${orgData.length}`);
    console.log(`  • Exams: ${examData.length}`);
    console.log(`  • Positions: ${positionData.length}`);
    console.log("\n🚀 Next: Run Phase 2 seed for Recruitments, Posts, and Eligibilities");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seedPhase1().then(() => {
  process.exit(0);
});
