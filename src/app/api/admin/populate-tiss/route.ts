/**
 * API endpoint to populate TISS Non-Teaching Positions 2026/02 data
 *
 * Usage: POST /api/admin/populate-tiss
 */

import { getDb } from "@/db";
import { recruitments, posts, eligibilities, postsVacancies, postAgeRules, organizations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

interface PopulationResult {
  success: boolean;
  recruitmentId?: number;
  postsCreated?: number;
  eligibilitiesCreated?: number;
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
    qualification: "Post Graduate Degree in any discipline with 8 years experience",
    experience: "8 years in academic/research/administrative institutions",
    vacancies: { UR: 2 },
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
    experience: "5 years in library science",
    vacancies: { UR: 1 },
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
    experience: "3 years in library science",
    vacancies: { UR: 1 },
  },
  {
    name: "Assistant Registrar",
    positionId: 4,
    slug: "assistant-registrar-multi",
    campus: "Mumbai, Tuljapur, Gawahati",
    numberOfPosts: 3,
    payLevel: { level: "10", title: "Level-10" },
    maxAge: 40,
    qualification: "Bachelor's Degree from recognized University",
    experience: "5 years in academic/administrative institutions",
    vacancies: { UR: 2, OBC: 1 },
  },
  {
    name: "Assistant Manager (Publications)",
    positionId: 5,
    slug: "asst-manager-publications",
    campus: "Mumbai",
    numberOfPosts: 1,
    payLevel: { level: "10", title: "Level-10" },
    maxAge: 40,
    qualification: "Master's Degree",
    experience: "3 years in publications/content management",
    vacancies: { UR: 1 },
  },
  {
    name: "System Analyst-cum-Programmer",
    positionId: 6,
    slug: "system-analyst-programmer",
    campus: "Mumbai",
    numberOfPosts: 1,
    payLevel: { level: "10", title: "Level-10" },
    maxAge: 45,
    qualification: "M.E./M.Tech./MCA/M.Sc. in Computer Science",
    experience: "2-3 years in IT",
    vacancies: { UR: 1 },
  },
  {
    name: "Health Officer",
    positionId: 7,
    slug: "health-officer",
    campus: "Tuljapur",
    numberOfPosts: 1,
    payLevel: { level: "10", title: "Level-10" },
    maxAge: 45,
    qualification: "MBBS recognised by MCI",
    experience: "3 years in hospital",
    vacancies: { UR: 1 },
  },
  {
    name: "Field Work Coordinator",
    positionId: 8,
    slug: "field-work-coordinator",
    campus: "Mumbai",
    numberOfPosts: 1,
    payLevel: { level: "10", title: "Level-10" },
    maxAge: 45,
    qualification: "Master's in Social Work",
    experience: "15 years in field work",
    vacancies: { UR: 1 },
  },
  {
    name: "Counsellor",
    positionId: 9,
    slug: "counsellor",
    campus: "Mumbai",
    numberOfPosts: 1,
    payLevel: { level: "10", title: "Level-10" },
    maxAge: 45,
    qualification: "Master's in Social Work/Counselling/Applied Psychology",
    experience: "10 years in counselling",
    vacancies: { UR: 1 },
  },
  {
    name: "Section Officer",
    positionId: 10,
    slug: "section-officer",
    campus: "Mumbai",
    numberOfPosts: 3,
    payLevel: { level: "7", title: "Level-7" },
    maxAge: 40,
    qualification: "Bachelor's Degree",
    experience: "3 years in supervisory/administrative role",
    vacancies: { UR: 2, OBC: 1 },
  },
  {
    name: "Section Officer (Security)",
    positionId: 11,
    slug: "section-officer-security",
    campus: "Mumbai",
    numberOfPosts: 1,
    payLevel: { level: "7", title: "Level-7" },
    maxAge: 40,
    qualification: "Bachelor's Degree or Army service",
    experience: "5 years security experience",
    vacancies: { UR: 1 },
  },
];

export async function POST(request: NextRequest): Promise<NextResponse<PopulationResult>> {
  try {
    const db = getDb();

    // Get TISS organization
    let tissOrg = await db.query.organizations.findFirst({
      where: eq(organizations.slug, "tata-institute-of-social-sciences"),
    });

    if (!tissOrg) {
      // Create if doesn't exist
      const [created] = await db
        .insert(organizations)
        .values({
          name: "Tata Institute of Social Sciences",
          slug: "tata-institute-of-social-sciences",
          websiteUrl: "https://www.tiss.edu",
          sector: "GOVERNMENT_CENTRAL",
        })
        .returning();
      tissOrg = created;
    }

    // Get or create recruitment
    let recruitment = await db.query.recruitments.findFirst({
      where: and(
        eq(recruitments.organizationId, tissOrg.id),
        eq(recruitments.officialNotificationNumber, "ADVT.REF NO./TISS/NON-TEACHING POSITIONS/2026/02")
      ),
    });

    if (!recruitment) {
      const [created] = await db
        .insert(recruitments)
        .values({
          organizationId: tissOrg.id,
          year: 2026,
          name: "Tata Institute of Social Sciences Non-Teaching Positions 2026",
          slug: "tata-institute-of-social-sciences-nontaching-2026-02",
          description: "Recruitment for 11 Non-Teaching Positions (Deputy Registrar, Librarian, Assistant Registrar, System Analyst, etc.)",
          officialNotificationNumber: "ADVT.REF NO./TISS/NON-TEACHING POSITIONS/2026/02",
          notificationDate: new Date("2026-10-07"),
          applicationEndDate: new Date("2026-11-09"),
          totalVacancies: 16,
        })
        .returning();
      recruitment = created;
    }

    // Insert posts
    let postsCreated = 0;
    let eligibilitiesCreated = 0;

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
            ur: postData.vacancies.UR || 0,
            ews: 0,
            obc: postData.vacancies.OBC || 0,
            sc: 0,
            st: 0,
            total: postData.numberOfPosts,
          },
        })
        .returning();

      postsCreated++;

      // Insert eligibility
      await db
        .insert(eligibilities)
        .values({
          postId: postRecord.id,
          ageMax: postData.maxAge,
          qualificationText: postData.qualification,
          experienceText: postData.experience,
          status: "VERIFIED",
        })
        .catch(() => {}); // Ignore if already exists

      eligibilitiesCreated++;

      // Insert vacancies
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
            .catch(() => {});
        }
      }

      // Insert age rules
      for (const category of ["UR", "OBC", "SC/ST", "EWS", "PwBD"]) {
        await db
          .insert(postAgeRules)
          .values({
            postId: postRecord.id,
            category,
            maxAge: postData.maxAge,
            ruleType: "ARITHMETIC",
            conditionText: "As per Government of India rules",
          })
          .catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      recruitmentId: recruitment.id,
      postsCreated,
      eligibilitiesCreated,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
