import postgres from "postgres";

// Direct SQL connection for reliability
const client = postgres(process.env.DATABASE_URL!, { prepare: false });

/**
 * PHASE 4b: Comprehensive V1→V2 Backfill
 *
 * Strategy:
 * 1. Create missing position families (22 → 28+ positions)
 * 2. Map all 213 v1 postings to canonical v2 positions
 * 3. Create recruitment campaigns for posting families
 * 4. Populate eligibilities and selection processes
 * 5. Link v1 postings to v2 posts via inferredPostId
 */

// Position definitions for all families identified in the 213 v1 postings
const COMPREHENSIVE_POSITIONS = [
  // BANKING & FINANCE
  {
    name: "Bank Specialist Officer",
    slug: "bank-specialist-officer",
    category: "BANKING",
    description: "Specialist Officer in various departments (IT, HR, Law, Marketing) across public and private sector banks",
    typicalAgeMin: 20,
    typicalAgeMax: 30,
    typicalSalaryMin: 600000,
    typicalSalaryMax: 1400000,
  },
  {
    name: "Bank Apprentice",
    slug: "bank-apprentice",
    category: "BANKING",
    description: "Apprenticeship programs in public and private sector banks",
    typicalAgeMin: 18,
    typicalAgeMax: 28,
    typicalSalaryMin: 100000,
    typicalSalaryMax: 300000,
  },
  {
    name: "IBPS RRB Officer Scale",
    slug: "ibps-rrb-officer-scale",
    category: "BANKING",
    description: "Officer Scale positions in Regional Rural Banks (IBPS RRB)",
    typicalAgeMin: 21,
    typicalAgeMax: 30,
    typicalSalaryMin: 500000,
    typicalSalaryMax: 1100000,
  },
  {
    name: "IBPS RRB Office Assistant",
    slug: "ibps-rrb-office-assistant",
    category: "BANKING",
    description: "Office Assistant positions in Regional Rural Banks (IBPS RRB)",
    typicalAgeMin: 18,
    typicalAgeMax: 28,
    typicalSalaryMin: 200000,
    typicalSalaryMax: 500000,
  },

  // RAILWAY
  {
    name: "Railway Junior Engineer",
    slug: "railway-junior-engineer",
    category: "RAILWAY",
    description: "Junior Engineer in Indian Railways (Civil, Mechanical, Electrical, etc.)",
    typicalAgeMin: 21,
    typicalAgeMax: 32,
    typicalSalaryMin: 400000,
    typicalSalaryMax: 900000,
  },
  {
    name: "Railway Technician",
    slug: "railway-technician",
    category: "RAILWAY",
    description: "Technician positions in Indian Railways technical departments",
    typicalAgeMin: 18,
    typicalAgeMax: 28,
    typicalSalaryMin: 250000,
    typicalSalaryMax: 600000,
  },
  {
    name: "Railway NTPC Graduate",
    slug: "railway-ntpc-graduate",
    category: "RAILWAY",
    description: "Non-Technical Popular Categories (NTPC) for graduate positions in Indian Railways",
    typicalAgeMin: 18,
    typicalAgeMax: 33,
    typicalSalaryMin: 250000,
    typicalSalaryMax: 700000,
  },
  {
    name: "Railway Paramedical Staff",
    slug: "railway-paramedical-staff",
    category: "RAILWAY",
    description: "Paramedical staff including nurses, health workers, and medical assistants",
    typicalAgeMin: 18,
    typicalAgeMax: 35,
    typicalSalaryMin: 200000,
    typicalSalaryMax: 500000,
  },

  // SSC (Staff Selection Commission)
  {
    name: "SSC Combined Graduate Level (CGL)",
    slug: "ssc-combined-graduate-level",
    category: "ADMINISTRATIVE",
    description: "SSC CGL - Recruitment for Group B and Group C posts across central government departments",
    typicalAgeMin: 20,
    typicalAgeMax: 32,
    typicalSalaryMin: 300000,
    typicalSalaryMax: 900000,
  },
  {
    name: "SSC Combined Higher Secondary Level (CHSL)",
    slug: "ssc-combined-higher-secondary-level",
    category: "ADMINISTRATIVE",
    description: "SSC CHSL - Recruitment for postal and clerical staff in government",
    typicalAgeMin: 18,
    typicalAgeMax: 27,
    typicalSalaryMin: 200000,
    typicalSalaryMax: 500000,
  },
  {
    name: "SSC Stenographer",
    slug: "ssc-stenographer",
    category: "ADMINISTRATIVE",
    description: "SSC Stenographer recruitment for various government departments",
    typicalAgeMin: 18,
    typicalAgeMax: 32,
    typicalSalaryMin: 250000,
    typicalSalaryMax: 700000,
  },

  // POLICE
  {
    name: "UP Police Constable",
    slug: "up-police-constable",
    category: "POLICE",
    description: "Uttar Pradesh Police Constable recruitment",
    typicalAgeMin: 18,
    typicalAgeMax: 28,
    typicalSalaryMin: 200000,
    typicalSalaryMax: 600000,
  },
  {
    name: "Delhi Police Constable",
    slug: "delhi-police-constable",
    category: "POLICE",
    description: "Delhi Police Constable recruitment",
    typicalAgeMin: 18,
    typicalAgeMax: 27,
    typicalSalaryMin: 200000,
    typicalSalaryMax: 600000,
  },
  {
    name: "State Police - Sub Inspector",
    slug: "state-police-sub-inspector",
    category: "POLICE",
    description: "Sub-Inspector positions in state police departments across India",
    typicalAgeMin: 21,
    typicalAgeMax: 32,
    typicalSalaryMin: 400000,
    typicalSalaryMax: 900000,
  },

  // TEACHING
  {
    name: "Bihar School Teacher (TRE)",
    slug: "bihar-school-teacher",
    category: "TEACHING",
    description: "Bihar Teacher Recruitment Examination (TRE) for primary and secondary teachers",
    typicalAgeMin: 21,
    typicalAgeMax: 45,
    typicalSalaryMin: 300000,
    typicalSalaryMax: 900000,
  },
  {
    name: "University Faculty",
    slug: "university-faculty",
    category: "TEACHING",
    description: "Faculty positions in central universities and higher education institutions",
    typicalAgeMin: 25,
    typicalAgeMax: 50,
    typicalSalaryMin: 600000,
    typicalSalaryMax: 1800000,
  },
  {
    name: "Teacher Eligibility Test (State Level)",
    slug: "teacher-eligibility-test-state",
    category: "TEACHING",
    description: "State-level Teacher Eligibility Tests (TET) for school teachers",
    typicalAgeMin: 20,
    typicalAgeMax: 40,
    typicalSalaryMin: 300000,
    typicalSalaryMax: 800000,
  },

  // ENGINEERING
  {
    name: "Junior Engineer (Civil/Mech/Electrical)",
    slug: "junior-engineer-technical",
    category: "ENGINEERING",
    description: "Junior Engineer positions in government departments, PSUs, and railways",
    typicalAgeMin: 21,
    typicalAgeMax: 30,
    typicalSalaryMin: 400000,
    typicalSalaryMax: 900000,
  },
  {
    name: "PSU Engineering Apprentice",
    slug: "psu-engineering-apprentice",
    category: "ENGINEERING",
    description: "Apprenticeship programs in PSUs for ITI and diploma holders",
    typicalAgeMin: 18,
    typicalAgeMax: 28,
    typicalSalaryMin: 80000,
    typicalSalaryMax: 250000,
  },

  // DEFENCE & PARAMILITARY
  {
    name: "Armed Forces Recruitment",
    slug: "armed-forces-recruitment",
    category: "DEFENCE",
    description: "Recruitment for Indian Army, Navy, Air Force, and paramilitary forces",
    typicalAgeMin: 17,
    typicalAgeMax: 28,
    typicalSalaryMin: 250000,
    typicalSalaryMax: 700000,
  },
  {
    name: "CRPF Constable",
    slug: "crpf-constable",
    category: "DEFENCE",
    description: "Central Reserve Police Force (CRPF) constable recruitment",
    typicalAgeMin: 18,
    typicalAgeMax: 25,
    typicalSalaryMin: 250000,
    typicalSalaryMax: 650000,
  },
  {
    name: "BSF / ITBP Recruitment",
    slug: "bsf-itbp-recruitment",
    category: "DEFENCE",
    description: "Border Security Force and Indo-Tibetan Border Police recruitment",
    typicalAgeMin: 18,
    typicalAgeMax: 25,
    typicalSalaryMin: 250000,
    typicalSalaryMax: 650000,
  },

  // MEDICAL
  {
    name: "Nursing Officer",
    slug: "nursing-officer",
    category: "TEACHING",
    description: "Nursing and paramedical staff recruitment in government hospitals",
    typicalAgeMin: 18,
    typicalAgeMax: 35,
    typicalSalaryMin: 250000,
    typicalSalaryMax: 600000,
  },
  {
    name: "Medical Officer",
    slug: "medical-officer",
    category: "TEACHING",
    description: "Doctor and medical officer positions in government hospitals and health departments",
    typicalAgeMin: 21,
    typicalAgeMax: 45,
    typicalSalaryMin: 800000,
    typicalSalaryMax: 2000000,
  },

  // PSU GENERAL
  {
    name: "PSU General Recruitment",
    slug: "psu-general-recruitment",
    category: "ENGINEERING",
    description: "General recruitment across Public Sector Undertakings (NTPC, SAIL, Power, etc.)",
    typicalAgeMin: 18,
    typicalAgeMax: 28,
    typicalSalaryMin: 250000,
    typicalSalaryMax: 700000,
  },
];

// Eligibility rules for each position family
const ELIGIBILITY_RULES: Record<string, string> = {
  "ssc-combined-graduate-level": "Bachelor's Degree from recognized university. Indian Citizen, age 20-32 years.",
  "ssc-combined-higher-secondary-level": "12th Pass from recognized board. Indian Citizen, age 18-27 years.",
  "bank-specialist-officer": "Bachelor's Degree in relevant field. Age 20-30 years. Bank experience preferred.",
  "bank-apprentice": "10th or 12th pass. Age 18-28 years. Residential facility not provided.",
  "railway-junior-engineer": "Diploma or B.Tech in relevant engineering discipline. Age 21-32 years.",
  "railway-ntpc-graduate": "Any Bachelor's Degree. Age 18-33 years. No upper age limit for reserved categories.",
  "up-police-constable": "10+2 Pass. Age 18-28 years. Height 168cm (165cm for women), chest 83cm.",
  "bihar-school-teacher": "Bachelor's Degree with B.Ed. Age 21-45 years. Domain expertise in subject.",
  "university-faculty": "M.Tech/M.Sc with PhD preferred. Age 25-50 years. Research publications required.",
  "junior-engineer-technical": "Diploma or B.Tech in Civil/Mechanical/Electrical. Age 21-30 years.",
  "armed-forces-recruitment": "12th Pass for soldiers. Age 17-23 years. Good health and physical fitness required.",
  "nursing-officer": "BSc Nursing or Diploma in Nursing. Age 18-35 years. Registered with nursing council.",
  "medical-officer": "MBBS Degree. Age 21-45 years. Medical license required.",
};

// Selection process stages for position families
const SELECTION_PROCESSES: Record<string, string[]> = {
  "ssc-combined-graduate-level": ["Tier I (CBT)", "Tier II (CBT)", "Tier III (Descriptive)", "Tier IV (Document Verification)"],
  "ssc-combined-higher-secondary-level": ["Tier I (CBT)", "Tier II (Descriptive)", "Tier III (Typing Test)", "Document Verification"],
  "bank-specialist-officer": ["Preliminary Exam (CBT)", "Main Exam (CBT)", "Group Discussion", "Personal Interview", "Document Verification"],
  "railway-junior-engineer": ["CBT", "Document Verification", "Medical Test"],
  "railway-ntpc-graduate": ["CBT (General Awareness, Math, English)", "Medical Test", "Document Verification"],
  "up-police-constable": ["Physical Test", "Written Exam (CBT)", "Document Verification", "Medical Test"],
  "bihar-school-teacher": ["Written Test", "Document Verification", "Certificate Verification"],
  "university-faculty": ["Application", "Interview", "Presentation", "Research Evaluation"],
};

async function seedComprehensiveBackfill() {
  try {
    console.log("🚀 PHASE 4b: Comprehensive V1→V2 Backfill\n");
    console.log("═".repeat(60));

    // Step 1: Create missing positions
    console.log("\n📍 STEP 1: Creating Position Families\n");
    const createdPositions: Record<string, number> = {};

    for (const pos of COMPREHENSIVE_POSITIONS) {
      try {
        // Check if position already exists
        const existing = await client`
          SELECT id FROM positions WHERE slug = ${pos.slug} LIMIT 1
        `;

        if (existing.length === 0) {
          const result = await client`
            INSERT INTO positions (name, slug, category, description, typical_age_min, typical_age_max, typical_salary_min, typical_salary_max)
            VALUES (${pos.name}, ${pos.slug}, ${pos.category}, ${pos.description}, ${pos.typicalAgeMin}, ${pos.typicalAgeMax}, ${pos.typicalSalaryMin}, ${pos.typicalSalaryMax})
            RETURNING id
          `;

          if (result.length > 0) {
            createdPositions[pos.slug] = result[0].id as number;
            console.log(`  ✓ ${pos.name} (ID: ${result[0].id})`);
          }
        } else {
          createdPositions[pos.slug] = existing[0].id as number;
          console.log(`  ↻ ${pos.name} (Already exists, ID: ${existing[0].id})`);
        }
      } catch (err) {
        console.error(`  ✗ ${pos.name}: ${(err as Error).message}`);
      }
    }

    console.log(`\n✅ Position families: ${Object.keys(createdPositions).length} total\n`);

    // Step 2: Create eligibilities for each position
    console.log("📋 STEP 2: Creating Eligibility Rules\n");
    let eligibilityCount = 0;

    for (const [slug, eligibilityText] of Object.entries(ELIGIBILITY_RULES)) {
      try {
        const posId = createdPositions[slug];
        if (!posId) continue;

        const existing = await client`
          SELECT id FROM eligibilities WHERE position_id = ${posId} LIMIT 1
        `;

        if (existing.length === 0) {
          const result = await client`
            INSERT INTO eligibilities (position_id, education, age_min, age_max, experience, other_requirements, domicile, citizenship)
            VALUES (${posId}, ${eligibilityText.split(". ")[0] || ""}, 18, 45, 0, ${eligibilityText}, 'Any', 'Indian')
            RETURNING id
          `;

          if (result.length > 0) {
            console.log(`  ✓ ${slug}`);
            eligibilityCount++;
          }
        }
      } catch (err) {
        console.error(`  ✗ ${slug}: ${(err as Error).message}`);
      }
    }

    console.log(`\n✅ Eligibility rules created: ${eligibilityCount}\n`);

    // Step 3: Create selection processes for each position
    console.log("🎯 STEP 3: Creating Selection Processes\n");
    let processCount = 0;

    for (const [slug, stages] of Object.entries(SELECTION_PROCESSES)) {
      try {
        const posId = createdPositions[slug];
        if (!posId) continue;

        // Check if selection process already exists
        const existing = await client`
          SELECT id FROM selection_processes WHERE position_id = ${posId} LIMIT 1
        `;

        if (existing.length === 0) {
          for (let stageNum = 0; stageNum < stages.length; stageNum++) {
            await client`
              INSERT INTO selection_processes (position_id, stage, name, description)
              VALUES (${posId}, ${stageNum + 1}, ${stages[stageNum]}, ${'Stage ' + (stageNum + 1) + ': ' + stages[stageNum]})
            `;
          }

          console.log(`  ✓ ${slug} (${stages.length} stages)`);
          processCount++;
        }
      } catch (err) {
        console.error(`  ✗ ${slug}: ${(err as Error).message}`);
      }
    }

    console.log(`\n✅ Selection processes created: ${processCount} position families\n`);

    // Step 4: Map v1 postings to v2 positions (sample of top position families)
    console.log("🔗 STEP 4: Mapping V1 Postings to V2 Positions\n");
    console.log("(This phase requires detailed position-specific mapping logic)\n");
    console.log("Position Family Mapping Strategy:");
    console.log("  • SSC CGL (5 postings) → ssc-combined-graduate-level");
    console.log("  • SSC CHSL (2 postings) → ssc-combined-higher-secondary-level");
    console.log("  • Banking (9 postings) → bank-specialist-officer, bank-apprentice, IBPS variants");
    console.log("  • Railway/RRB (9 postings) → railway-junior-engineer, railway-ntpc-graduate, etc.");
    console.log("  • UP Police (3 postings) → up-police-constable");
    console.log("  • NEET (4 postings) → medical-officer position");
    console.log("  • Bihar Teacher (2 postings) → bihar-school-teacher");
    console.log("  • Other (174 postings) → distributed across PSU, University, Defence, and State positions\n");

    console.log("═".repeat(60));
    console.log("\n✨ Phase 4b Foundation Complete!\n");
    console.log("Next Steps:");
    console.log("  1. Execute detailed title-matching algorithm for 213 v1 postings");
    console.log("  2. Create recruitment campaigns for posting families");
    console.log("  3. Populate posts table linking v1 postings to v2 positions");
    console.log("  4. Update postings table with inferredPostId/inferredRecruitmentId");
    console.log("  5. Run data quality validation\n");

    await client.end();
  } catch (err) {
    console.error("❌ Error during backfill:", err);
    throw err;
  } finally {
    process.exit(0);
  }
}

seedComprehensiveBackfill().catch((err) => {
  console.error(err);
  process.exit(1);
});
