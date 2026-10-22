/**
 * API endpoint to populate TISS Non-Teaching Positions 2026/02 data
 *
 * Usage: POST /api/admin/populate-tiss
 *
 * This endpoint:
 * 1. Creates/updates the TISS recruitment record
 * 2. Inserts all 11 posts with details
 * 3. Creates eligibility records
 * 4. Populates vacancy breakdown
 * 5. Adds age rules
 * 6. Sets application fees
 */

import { getDb } from "@/db";
import {
  recruitments,
  posts,
  eligibilities,
  postsVacancies,
  postAgeRules,
  recruitmentFees,
  organizations
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

interface PopulationResult {
  success: boolean;
  recruitmentId?: number;
  postsCreated?: number;
  eligibilitiesCreated?: number;
  vacanciesCreated?: number;
  ageRulesCreated?: number;
  error?: string;
}

const TISS_POSTS_DATA = [
  {
    name: "Deputy Registrar",
    positionId: 1,
    slug: "deputy-registrar-mumbai",
    campus: "Mumbai",
    numberOfPosts: 2,
    payLevel: { level: "12", title: "Level-12" },
    maxAge: 50,
    qualification: "Post Graduate Degree in any discipline with 8 years experience in academic/research/administrative institutions",
    experience: "8 years in academic/research/administrative institutions",
    vacancies: { UR: 2, OBC: 0, SC: 0, ST: 0, EWS: 0 },
  },
  {
    name: "Deputy Librarian",
    positionId: 2,
    slug: "deputy-librarian-hyderabad",
    campus: "Hyderabad",
    numberOfPosts: 1,
    payLevel: { level: "Academic-12", title: "Academic Level-12" },
    maxAge: 45,
    qualification: "Master's Degree in Library Science",
    experience: "5 years' experience in library science",
    vacancies: { UR: 1, OBC: 0, SC: 0, ST: 0, EWS: 0 },
  },
  {
    name: "Assistant Librarian",
    positionId: 3,
    slug: "assistant-librarian-hyderabad",
    campus: "Hyderabad",
    numberOfPosts: 1,
    payLevel: { level: "Academic-10", title: "Academic Level-10" },
    maxAge: 40,
    qualification: "Master's Degree in Library Science",
    experience: "3 years' experience in library science",
    vacancies: { UR: 1, OBC: 0, SC: 0, ST: 0, EWS: 0 },
  },
  {
    name: "Assistant Registrar",
    positionId: 4,
    slug: "assistant-registrar-multi-campus",
    campus: "Mumbai, Tuljapur, Gawahati",
    numberOfPosts: 3,
    payLevel: { level: "10", title: "Level-10" },
    maxAge: 40,
    qualification: "Bachelor's Degree from recognized University",
    experience: "5 years' experience in academic/administrative institutions",
    vacancies: { UR: 2, OBC: 1, SC: 0, ST: 0, EWS: 0 },
  },
  {
    name: "Assistant Manager (Publications)",
    positionId: 5,
    slug: "assistant-manager-publications-mumbai",
    campus: "Mumbai",
    numberOfPosts: 1,
    payLevel: { level: "10", title: "Level-10" },
    maxAge: 40,
    qualification: "Master's Degree in any subject",
    experience: "3 years' experience in publications/content management",
    vacancies: { UR: 1, OBC: 0, SC: 0, ST: 0, EWS: 0 },
  },
  {
    name: "System Analyst-cum-Programmer",
    positionId: 6,
    slug: "system-analyst-programmer-mumbai",
    campus: "Mumbai",
    numberOfPosts: 1,
    payLevel: { level: "10", title: "Level-10" },
    maxAge: 45,
    qualification: "M.E./M.Tech. (Computer Science) OR Master's in Computer Applications (MCA) OR M.Sc. (Computer Science/Information Technology)",
    experience: "2-3 years' relevant experience in IT",
    vacancies: { UR: 1, OBC: 0, SC: 0, ST: 0, EWS: 0 },
  },
  {
    name: "Health Officer",
    positionId: 7,
    slug: "health-officer-tuljapur",
    campus: "Tuljapur",
    numberOfPosts: 1,
    payLevel: { level: "10", title: "Level-10" },
    maxAge: 45,
    qualification: "MBBS recognised by Medical Council of India, registered with MCI/State Medical Council",
    experience: "3 years in hospital attached with Medical College/Corporate Hospital",
    vacancies: { UR: 1, OBC: 0, SC: 0, ST: 0, EWS: 0 },
  },
  {
    name: "Field Work Coordinator",
    positionId: 8,
    slug: "field-work-coordinator-mumbai",
    campus: "Mumbai",
    numberOfPosts: 1,
    payLevel: { level: "10", title: "Level-10" },
    maxAge: 45,
    qualification: "Master's Degree in Social Work with at least 55% marks or equivalent grade B",
    experience: "15 years' experience in field work",
    vacancies: { UR: 1, OBC: 0, SC: 0, ST: 0, EWS: 0 },
  },
  {
    name: "Counsellor",
    positionId: 9,
    slug: "counsellor-mumbai",
    campus: "Mumbai",
    numberOfPosts: 1,
    payLevel: { level: "10", title: "Level-10" },
    maxAge: 45,
    qualification: "Master's in Social Work/Counselling/Applied Psychology",
    experience: "10 years in counselling",
    vacancies: { UR: 1, OBC: 0, SC: 0, ST: 0, EWS: 0 },
  },
  {
    name: "Section Officer",
    positionId: 10,
    slug: "section-officer-mumbai",
    campus: "Mumbai",
    numberOfPosts: 3,
    payLevel: { level: "7", title: "Level-7" },
    maxAge: 40,
    qualification: "Bachelor's Degree in any stream from any recognised University",
    experience: "3 years in supervisory level in Administration/Establishment/Finance/Academic matters",
    vacancies: { UR: 2, OBC: 1, SC: 0, ST: 0, EWS: 0 },
  },
  {
    name: "Section Officer (Security)",
    positionId: 11,
    slug: "section-officer-security-mumbai",
    campus: "Mumbai",
    numberOfPosts: 1,
    payLevel: { level: "7", title: "Level-7" },
    maxAge: 40,
    qualification: "Bachelor's Degree OR Army service at JCO level with 10th standard pass",
    experience: "5 years as Security Supervisor OR Army service at JCO+ level",
    vacancies: { UR: 1, OBC: 0, SC: 0, ST: 0, EWS: 0 },
  },
];

export async function POST(request: NextRequest): Promise<NextResponse<PopulationResult>> {
  try {
    // Verify admin token (optional security check)
    const token = request.headers.get("x-admin-token");
    if (token && process.env.ADMIN_TOKEN && token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const db = getDb();

    // Step 1: Get or create TISS organization
    let tissOrg = await db.query.organizations.findFirst({
      where: (org) => eq(org.slug, "tata-institute-of-social-sciences"),
    });

    if (!tissOrg) {
      const [created] = await db
        .insert(organizations)
        .values({
          name: "Tata Institute of Social Sciences",
          slug: "tata-institute-of-social-sciences",
          website: "https://www.tiss.edu",
          sector: "GOVERNMENT_CENTRAL",
        })
        .returning();
      tissOrg = created;
    }

    // Step 2: Create or update recruitment record
    let recruitment = await db.query.recruitments.findFirst({
      where: (rec) =>
        and(
          eq(rec.organizationId, tissOrg!.id),
          eq(rec.advertisementNumber, "ADVT.REF NO./TISS/NON-TEACHING POSITIONS/2026/02")
        ),
    });

    if (!recruitment) {
      const [created] = await db
        .insert(recruitments)
        .values({
          organizationId: tissOrg!.id,
          title: "Tata Institute of Social Sciences Non-Teaching Positions 2026",
          description: "Recruitment for 11 Non-Teaching Positions",
          advertisementNumber: "ADVT.REF NO./TISS/NON-TEACHING POSITIONS/2026/02",
          notificationNumber: "2026/02",
          postedOn: new Date("2026-10-07"),
          applicationDeadline: new Date("2026-11-09"),
          totalVacancies: 16,
        })
        .returning();
      recruitment = created;
    }

    // Step 3: Insert application fees
    await db.delete(recruitmentFees).where(eq(recruitmentFees.recruitmentId, recruitment.id));

    await db.insert(recruitmentFees).values([
      { recruitmentId: recruitment.id, category: "UR", amount: 2000 },
      { recruitmentId: recruitment.id, category: "OBC", amount: 1500 },
      { recruitmentId: recruitment.id, category: "EWS", amount: 1500 },
      { recruitmentId: recruitment.id, category: "SC/ST", amount: 1000 },
      { recruitmentId: recruitment.id, category: "PwBD", amount: 500 },
    ]);

    // Step 4: Insert posts and related data
    let postsCreated = 0;
    let eligibilitiesCreated = 0;
    let vacanciesCreated = 0;
    let ageRulesCreated = 0;

    for (const postData of TISS_POSTS_DATA) {
      // Insert post
      const [postRecord] = await db
        .insert(posts)
        .values({
          recruitmentId: recruitment.id,
          positionId: postData.positionId,
          name: postData.name,
          slug: postData.slug,
          description: `${postData.name} - ${postData.campus}`,
          vacancyTotal: postData.numberOfPosts,
          payLevel: postData.payLevel as any,
          vacancyDetails: {
            ur: postData.vacancies.UR,
            ews: postData.vacancies.EWS,
            obc: postData.vacancies.OBC,
            sc: postData.vacancies.SC,
            st: postData.vacancies.ST,
            total: postData.numberOfPosts,
          },
        })
        .returning();

      postsCreated++;

      // Insert eligibility
      const [eligRecord] = await db
        .insert(eligibilities)
        .values({
          postId: postRecord.id,
          ageMax: postData.maxAge,
          qualificationText: postData.qualification,
          experienceText: postData.experience,
          status: "VERIFIED",
        })
        .returning();

      eligibilitiesCreated++;

      // Insert age rules for all categories
      const categories = ["UR", "OBC", "SC/ST", "EWS", "PwBD"];
      for (const category of categories) {
        await db
          .insert(postAgeRules)
          .values({
            postId: postRecord.id,
            category,
            maxAge: postData.maxAge,
            ruleType: "ARITHMETIC",
            conditionText: "As per Government of India rules",
          })
          .catch(() => {}); // Ignore duplicates
      }
      ageRulesCreated += categories.length;

      // Insert vacancy records
      for (const [category, count] of Object.entries(postData.vacancies)) {
        if (count > 0) {
          await db
            .insert(postsVacancies)
            .values({
              postId: postRecord.id,
              category,
              categoryCount: count,
              totalVacancies: postData.numberOfPosts,
              location: postData.campus,
            })
            .catch(() => {}); // Ignore duplicates
          vacanciesCreated++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      recruitmentId: recruitment.id,
      postsCreated,
      eligibilitiesCreated,
      vacanciesCreated,
      ageRulesCreated,
    });
  } catch (error) {
    console.error("Error populating TISS data:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
