import { getDbV2 } from "./index";
import { positions, qualifications } from "./schema";

const db = getDbV2();

async function seedPositionsV2() {
  console.log("🌱 Seeding Evergreen Positions (v2)...\n");

  // Extract and normalize position data from common government/bank job titles
  const positionData = [
    // ADMINISTRATIVE
    {
      name: "Assistant Section Officer",
      slug: "assistant-section-officer",
      category: "ADMINISTRATIVE" as const,
      description: "Group B position in government departments",
      typicalAgeMin: 18,
      typicalAgeMax: 32,
      typicalSalaryMin: 450000,
      typicalSalaryMax: 900000,
    },
    {
      name: "Inspector",
      slug: "inspector",
      category: "ADMINISTRATIVE" as const,
      description: "Group A/B inspection and enforcement role",
      typicalAgeMin: 21,
      typicalAgeMax: 35,
      typicalSalaryMin: 550000,
      typicalSalaryMax: 1100000,
    },
    {
      name: "Auditor",
      slug: "auditor",
      category: "ADMINISTRATIVE" as const,
      description: "Financial audit and compliance role in government",
      typicalAgeMin: 18,
      typicalAgeMax: 32,
      typicalSalaryMin: 450000,
      typicalSalaryMax: 900000,
    },

    // BANKING
    {
      name: "Specialist Officer",
      slug: "specialist-officer",
      category: "BANKING" as const,
      description: "Bank SO role (IT, HR, Law, etc.)",
      typicalAgeMin: 20,
      typicalAgeMax: 30,
      typicalSalaryMin: 600000,
      typicalSalaryMax: 1400000,
    },
    {
      name: "Probationary Officer",
      slug: "probationary-officer",
      category: "BANKING" as const,
      description: "Entry-level bank management trainee",
      typicalAgeMin: 21,
      typicalAgeMax: 30,
      typicalSalaryMin: 500000,
      typicalSalaryMax: 1200000,
    },
    {
      name: "Bank Clerk",
      slug: "bank-clerk",
      category: "BANKING" as const,
      description: "Clerical/junior associate in banks",
      typicalAgeMin: 18,
      typicalAgeMax: 28,
      typicalSalaryMin: 200000,
      typicalSalaryMax: 500000,
    },
    {
      name: "Office Assistant",
      slug: "office-assistant",
      category: "BANKING" as const,
      description: "Multi-purpose assistant in banks and offices",
      typicalAgeMin: 18,
      typicalAgeMax: 27,
      typicalSalaryMin: 150000,
      typicalSalaryMax: 400000,
    },

    // POLICE
    {
      name: "Constable",
      slug: "constable",
      category: "POLICE" as const,
      description: "Entry-level law enforcement officer",
      typicalAgeMin: 18,
      typicalAgeMax: 27,
      typicalSalaryMin: 200000,
      typicalSalaryMax: 600000,
    },
    {
      name: "Sub-Inspector",
      slug: "sub-inspector",
      category: "POLICE" as const,
      description: "Junior police officer (Group B)",
      typicalAgeMin: 21,
      typicalAgeMax: 32,
      typicalSalaryMin: 400000,
      typicalSalaryMax: 900000,
    },

    // DEFENCE
    {
      name: "Soldier",
      slug: "soldier",
      category: "DEFENCE" as const,
      description: "Armed forces personnel",
      typicalAgeMin: 17,
      typicalAgeMax: 23,
      typicalSalaryMin: 250000,
      typicalSalaryMax: 700000,
    },

    // RAILWAY
    {
      name: "Railway Technician",
      slug: "railway-technician",
      category: "RAILWAY" as const,
      description: "Technical staff in Indian Railways",
      typicalAgeMin: 18,
      typicalAgeMax: 28,
      typicalSalaryMin: 250000,
      typicalSalaryMax: 600000,
    },

    // TEACHING
    {
      name: "Teacher",
      slug: "teacher",
      category: "TEACHING" as const,
      description: "School or higher education instructor",
      typicalAgeMin: 20,
      typicalAgeMax: 35,
      typicalSalaryMin: 300000,
      typicalSalaryMax: 900000,
    },
    {
      name: "Research Associate",
      slug: "research-associate",
      category: "TEACHING" as const,
      description: "Research and academic support role",
      typicalAgeMin: 21,
      typicalAgeMax: 35,
      typicalSalaryMin: 300000,
      typicalSalaryMax: 800000,
    },

    // ENGINEERING
    {
      name: "Junior Engineer",
      slug: "junior-engineer",
      category: "ENGINEERING" as const,
      description: "Entry-level engineering position",
      typicalAgeMin: 21,
      typicalAgeMax: 30,
      typicalSalaryMin: 400000,
      typicalSalaryMax: 900000,
    },
    {
      name: "Senior Engineer",
      slug: "senior-engineer",
      category: "ENGINEERING" as const,
      description: "Senior technical role in PSU/government",
      typicalAgeMin: 25,
      typicalAgeMax: 40,
      typicalSalaryMin: 700000,
      typicalSalaryMax: 1400000,
    },

    // OTHER
    {
      name: "Backend Engineer",
      slug: "backend-engineer",
      category: "ENGINEERING" as const,
      description: "Private sector software engineering role",
      typicalAgeMin: 21,
      typicalAgeMax: 40,
      typicalSalaryMin: 600000,
      typicalSalaryMax: 3000000,
    },
  ];

  console.log(`📝 Inserting ${positionData.length} evergreen positions...\n`);

  for (const pos of positionData) {
    try {
      const result = await db
        .insert(positions)
        .values(pos)
        .onConflictDoNothing()
        .returning();

      if (result.length > 0) {
        console.log(`  ✓ ${pos.name}`);
      }
    } catch (err) {
      console.error(`  ✗ ${pos.name}: ${(err as Error).message}`);
    }
  }

  console.log(`\n✨ Seeded ${positionData.length} positions successfully`);
  process.exit(0);
}

seedPositionsV2().catch((err) => {
  console.error(err);
  process.exit(1);
});
