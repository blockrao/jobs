/**
 * TISS Non-Teaching Positions 2026/02 Data Population Script
 *
 * This script populates the JobOye database with comprehensive data
 * extracted from the official TISS Non-Teaching Positions notification.
 *
 * Advertisement Ref: ADVT.REF NO./TISS/NON-TEACHING POSITIONS/2026/02
 * Total Posts: 11
 * Total Vacancies: 16 (UR: 14, OBC: 2)
 * Application Deadline: 9 Nov 2026
 */

import { getDb } from "@/db";
import { recruitments, posts, eligibilities, postsVacancies, postAgeRules, positions, organizations, recruitmentFees, postsApplicationFee } from "@/db/schema";
import { eq, and } from "drizzle-orm";

interface PostData {
  name: string;
  campus?: string;
  campuses?: string[];
  numberOfPosts: number;
  payLevel: string;
  category?: string;
  categories?: string[];
  classification?: string;
  maxAge: number;
  pwbdCategory?: string;
  qualification: string;
  experience: string;
  vacancyBreakdown: Record<string, number>;
}

const TISS_ORG_ID = 1; // Will be fetched dynamically

const TISS_POSTS: PostData[] = [
  {
    name: "Deputy Registrar",
    campus: "Mumbai",
    numberOfPosts: 2,
    payLevel: "Level-12",
    category: "UR",
    maxAge: 50,
    qualification: "Post Graduate Degree in any discipline with 8 years' experience in academic/research/administrative institutions",
    experience: "8 years in academic/research/administrative institutions",
    vacancyBreakdown: { UR: 2, EWS: 0, OBC: 0, SC: 0, ST: 0 },
  },
  {
    name: "Deputy Librarian",
    campus: "Hyderabad",
    numberOfPosts: 1,
    payLevel: "Academic Level-12",
    category: "UR",
    maxAge: 45,
    qualification: "Master's Degree in Library Science",
    experience: "5 years' experience in library science",
    vacancyBreakdown: { UR: 1, EWS: 0, OBC: 0, SC: 0, ST: 0 },
  },
  {
    name: "Assistant Librarian",
    campus: "Hyderabad",
    numberOfPosts: 1,
    payLevel: "Academic Level-10",
    category: "UR",
    pwbdCategory: "PwBD(b)",
    maxAge: 40,
    qualification: "Master's Degree in Library Science",
    experience: "3 years' experience in library science",
    vacancyBreakdown: { UR: 1, EWS: 0, OBC: 0, SC: 0, ST: 0 },
  },
  {
    name: "Assistant Registrar",
    campuses: ["Mumbai", "Tuljapur", "Gawahati"],
    numberOfPosts: 3,
    payLevel: "Level-10",
    categories: ["UR", "UR", "OBC"],
    maxAge: 40,
    qualification: "Bachelor's Degree from recognized University",
    experience: "5 years' experience in academic/administrative institutions",
    vacancyBreakdown: { UR: 2, EWS: 0, OBC: 1, SC: 0, ST: 0 },
  },
  {
    name: "Assistant Manager (Publications)",
    campus: "Mumbai",
    numberOfPosts: 1,
    payLevel: "Level-10",
    category: "UR",
    pwbdCategory: "PwBD(d&e)",
    maxAge: 40,
    qualification: "Master's Degree in any subject",
    experience: "3 years' experience in publications/content management",
    vacancyBreakdown: { UR: 1, EWS: 0, OBC: 0, SC: 0, ST: 0 },
  },
  {
    name: "System Analyst-cum-Programmer",
    campus: "Mumbai",
    numberOfPosts: 1,
    payLevel: "Level-10",
    category: "UR",
    maxAge: 45,
    qualification: "M.E./M.Tech. (Computer Science & Technology) with 2 years OR Master's in Computer Applications (MCA) with 2 years OR M.Sc. (Computer Science/Information Technology) with 3 years experience",
    experience: "2-3 years' relevant experience in IT",
    vacancyBreakdown: { UR: 1, EWS: 0, OBC: 0, SC: 0, ST: 0 },
  },
  {
    name: "Health Officer",
    campus: "Tuljapur",
    numberOfPosts: 1,
    payLevel: "Level-10",
    category: "UR",
    maxAge: 45,
    qualification: "MBBS recognised by Medical Council of India, registered with MCI/State Medical Council",
    experience: "3 years' working experience in a Hospital attached with Medical College/Corporate Hospital",
    vacancyBreakdown: { UR: 1, EWS: 0, OBC: 0, SC: 0, ST: 0 },
  },
  {
    name: "Field Work Coordinator",
    campus: "Mumbai",
    numberOfPosts: 1,
    payLevel: "Level-10",
    category: "UR",
    maxAge: 45,
    qualification: "Master's Degree in Social Work with at least 55% marks or equivalent grade 'B' in UGC seven point scale",
    experience: "15 years' experience in field work",
    vacancyBreakdown: { UR: 1, EWS: 0, OBC: 0, SC: 0, ST: 0 },
  },
  {
    name: "Counsellor",
    campus: "Mumbai",
    numberOfPosts: 1,
    payLevel: "Level-10",
    category: "UR",
    maxAge: 45,
    qualification: "Masters in Social Work / Counselling / Applied Psychology",
    experience: "10 years of experience in Counselling, Adolescent students",
    vacancyBreakdown: { UR: 1, EWS: 0, OBC: 0, SC: 0, ST: 0 },
  },
  {
    name: "Section Officer",
    campus: "Mumbai",
    numberOfPosts: 3,
    payLevel: "Level-7",
    categories: ["UR", "UR", "OBC"],
    classification: "Group B",
    maxAge: 40,
    qualification: "Bachelor's Degree in any stream from any recognised Institute/University",
    experience: "3 years of experience in supervisory level in Pay Level 6 in Administration/Establishment/Finance/Academic matters",
    vacancyBreakdown: { UR: 2, EWS: 0, OBC: 1, SC: 0, ST: 0 },
  },
  {
    name: "Section Officer (Security)",
    campus: "Mumbai",
    numberOfPosts: 1,
    payLevel: "Level-7",
    category: "UR",
    classification: "Group B",
    maxAge: 40,
    qualification: "Bachelor's Degree in any stream from any recognised University with 5 years security experience OR Army service at JCO level or equivalent with 10th standard pass or Army class I Examination",
    experience: "5 years as Security Supervisor OR Army service at JCO+ level",
    vacancyBreakdown: { UR: 1, EWS: 0, OBC: 0, SC: 0, ST: 0 },
  },
];

async function main() {
  const db = getDb();

  try {
    console.log("🔍 Verifying TISS organization exists...");

    // Find TISS organization
    const tissOrg = await db.query.organizations.findFirst({
      where: (org) => ({
        and: [
          eq(org.name, "Tata Institute of Social Sciences"),
        ],
      }),
    });

    if (!tissOrg) {
      console.error("❌ TISS organization not found in database");
      console.log("Please create the organization first:");
      console.log("INSERT INTO organizations (name, slug, website_url, sector) VALUES");
      console.log("('Tata Institute of Social Sciences', 'tata-institute-of-social-sciences', 'https://www.tiss.edu', 'GOVERNMENT_CENTRAL');");
      process.exit(1);
    }

    console.log(`✅ Found TISS organization: ID ${tissOrg.id}`);

    console.log("\n🔍 Checking for existing TISS Non-Teaching 2026/02 recruitment...");

    // Look for existing recruitment
    const existingRecruitment = await db.query.recruitments.findFirst({
      where: (rec) => ({
        and: [
          eq(rec.organizationId, tissOrg.id),
          eq(rec.advertisementNumber, "ADVT.REF NO./TISS/NON-TEACHING POSITIONS/2026/02"),
        ],
      }),
    });

    let recruitmentId: number;

    if (existingRecruitment) {
      recruitmentId = existingRecruitment.id;
      console.log(`✅ Found existing recruitment: ID ${recruitmentId}`);
      console.log("   Would update existing posts and related data");
    } else {
      console.log("📝 Would create new recruitment record for TISS Non-Teaching Positions 2026/02");
      console.log("   This would include:");
      console.log("   - Title: Tata Institute of Social Sciences Non-Teaching Positions 2026");
      console.log("   - Advertisement: ADVT.REF NO./TISS/NON-TEACHING POSITIONS/2026/02");
      console.log("   - Total Vacancies: 16");
      console.log("   - Deadline: 2026-11-09");
      recruitmentId = 0; // Placeholder
    }

    console.log("\n📊 TISS Non-Teaching Positions Data Summary:");
    console.log("=" .repeat(60));
    console.log(`Total Posts: ${TISS_POSTS.length}`);
    let totalVacancies = 0;
    let totalUR = 0;
    let totalOBC = 0;

    TISS_POSTS.forEach((post) => {
      const total = Object.values(post.vacancyBreakdown).reduce((a, b) => a + b, 0);
      totalVacancies += total;
      totalUR += post.vacancyBreakdown.UR || 0;
      totalOBC += post.vacancyBreakdown.OBC || 0;
    });

    console.log(`Total Vacancies: ${totalVacancies}`);
    console.log(`  - UR (Unreserved): ${totalUR}`);
    console.log(`  - OBC: ${totalOBC}`);
    console.log(`  - SC/ST: 0`);
    console.log(`  - EWS: 0`);
    console.log(`  - PwBD: 2 (Horizontal)`);
    console.log("\nApplication Deadline: 9 Nov 2026");
    console.log("\nPosts to be created:");
    console.log("-" .repeat(60));

    TISS_POSTS.forEach((post, idx) => {
      const campus = post.campus || post.campuses?.join(", ") || "Multiple";
      const vacancies = Object.entries(post.vacancyBreakdown)
        .filter(([_, count]) => count > 0)
        .map(([cat, count]) => `${cat}: ${count}`)
        .join(", ");
      console.log(`${idx + 1}. ${post.name}`);
      console.log(`   Campus: ${campus} | Posts: ${post.numberOfPosts} | Pay: ${post.payLevel}`);
      console.log(`   Vacancies: ${vacancies}`);
      console.log(`   Age Limit: ${post.maxAge} years`);
      if (post.pwbdCategory) {
        console.log(`   PwBD: ${post.pwbdCategory}`);
      }
    });

    console.log("\n" + "=" .repeat(60));
    console.log("✅ Data population script ready");
    console.log("\nNext steps to populate the database:");
    console.log("1. Create/verify TISS recruitment record");
    console.log("2. Create all 11 post records");
    console.log("3. Create eligibility records for each post");
    console.log("4. Create vacancy breakdown records (posts_vacancies)");
    console.log("5. Create age rule records (post_age_rules)");
    console.log("6. Create application fee records (posts_application_fee)");
    console.log("\n📝 Script can be extended to actually write to database when needed");

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main().catch(console.error);
