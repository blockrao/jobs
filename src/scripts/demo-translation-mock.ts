/**
 * Mock Demo: Hindi Translation Output
 *
 * This shows what the actual translation output looks like without requiring API keys.
 * The real translation pipeline (src/scripts/translate-jobs-to-hindi.ts) produces this format.
 */

// Sample English postings (from database)
const ENGLISH_JOBS = [
  {
    id: 1,
    title: "Senior Software Engineer",
    description:
      "Join our team as a Senior Software Engineer. Responsibilities include designing and implementing scalable systems, mentoring junior engineers, and collaborating with product teams.",
    eligibility: "Bachelor's degree in Computer Science or related field",
    responsibilities: "Design and develop software systems, mentor team members",
    requirements: "5+ years of software development experience, proficiency in Python/Java",
    age_relaxation_notes: "Age relaxation of 5 years for SC/ST candidates",
    location_city: "Bangalore",
  },
  {
    id: 2,
    title: "Statistical Officer",
    description:
      "The Statistical Officer will be responsible for data collection, analysis, and reporting for government statistical programs.",
    eligibility:
      "Bachelor's degree in Statistics, Mathematics, or Economics from a recognized university",
    responsibilities: "Collect, analyze and interpret statistical data",
    requirements: "Knowledge of statistical software like R or Python",
    age_relaxation_notes: null,
    location_city: "Delhi",
  },
  {
    id: 3,
    title: "Accountant Grade II",
    description: "Manage financial records and prepare financial statements",
    eligibility: "Bachelor's degree in Commerce or Accountancy",
    responsibilities: "Maintain financial records, prepare accounts, audit reports",
    requirements:
      "CA/CMA or equivalent accounting qualification, 3+ years experience",
    age_relaxation_notes: "3 years for OBC, 5 years for SC/ST",
    location_city: "Mumbai",
  },
];

// Mock Hindi translations (what Claude produces)
const HINDI_TRANSLATIONS = [
  {
    title_hi: "वरिष्ठ सॉफ्टवेयर इंजीनियर",
    description_hi:
      "हमारी टीम में वरिष्ठ सॉफ्टवेयर इंजीनियर के रूप में शामिल हों। जिम्मेदारियों में स्केलेबल सिस्टम डिजाइन और कार्यान्वयन, जूनियर इंजीनियरों का मार्गदर्शन, और उत्पाद टीमों के साथ सहयोग शामिल है।",
    eligibility_hi: "कंप्यूटर विज्ञान या संबंधित क्षेत्र में स्नातक डिग्री",
    responsibilities_hi: "सॉफ्टवेयर सिस्टम डिजाइन और विकास करें, टीम के सदस्यों का मार्गदर्शन करें",
    requirements_hi:
      "5+ वर्षों का सॉफ्टवेयर विकास अनुभव, Python/Java में दक्षता",
    age_relaxation_notes_hi:
      "SC/ST उम्मीदवारों के लिए 5 वर्ष की आयु छूट",
    location_city_hi: "बेंगलुरु",
  },
  {
    title_hi: "सांख्यिकी अधिकारी",
    description_hi:
      "सांख्यिकी अधिकारी सरकारी सांख्यिकीय कार्यक्रमों के लिए डेटा संग्रह, विश्लेषण और रिपोर्टिंग के लिए जिम्मेदार होंगे।",
    eligibility_hi:
      "किसी मान्यता प्राप्त विश्वविद्यालय से सांख्यिकी, गणित या अर्थशास्त्र में स्नातक डिग्री",
    responsibilities_hi: "सांख्यिकीय डेटा संग्रह, विश्लेषण और व्याख्या करें",
    requirements_hi: "R या Python जैसे सांख्यिकीय सॉफ्टवेयर का ज्ञान",
    age_relaxation_notes_hi: null,
    location_city_hi: "दिल्ली",
  },
  {
    title_hi: "लेखाकार ग्रेड II",
    description_hi: "वित्तीय अभिलेखों का प्रबंधन करें और वित्तीय विवरण तैयार करें",
    eligibility_hi: "वाणिज्य या लेखांकन में स्नातक डिग्री",
    responsibilities_hi:
      "वित्तीय अभिलेख बनाए रखें, खाते तैयार करें, ऑडिट रिपोर्ट",
    requirements_hi:
      "CA/CMA या समकक्ष लेखांकन योग्यता, 3+ वर्षों का अनुभव",
    age_relaxation_notes_hi: "OBC के लिए 3 वर्ष, SC/ST के लिए 5 वर्ष",
    location_city_hi: "मुंबई",
  },
];

function demonstrateMockTranslation() {
  console.log("🎯 Hindi Translation Mock Demo");
  console.log("===============================\n");

  console.log(`📊 Translation Results for ${ENGLISH_JOBS.length} Sample Jobs\n`);

  for (let i = 0; i < ENGLISH_JOBS.length; i++) {
    const english = ENGLISH_JOBS[i];
    const hindi = HINDI_TRANSLATIONS[i];

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Job #${i + 1}: ${english.title}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    console.log("📍 TITLE");
    console.log(`  EN: ${english.title}`);
    console.log(`  HI: ${hindi.title_hi}\n`);

    console.log("📝 DESCRIPTION (truncated)");
    console.log(`  EN: ${english.description.substring(0, 80)}...`);
    console.log(
      `  HI: ${hindi.description_hi.substring(0, 80)}...\n`
    );

    console.log("✓ ELIGIBILITY");
    console.log(`  EN: ${english.eligibility}`);
    console.log(`  HI: ${hindi.eligibility_hi}\n`);

    console.log("💼 LOCATION");
    console.log(`  EN: ${english.location_city}`);
    console.log(`  HI: ${hindi.location_city_hi}\n`);

    if (english.age_relaxation_notes) {
      console.log("📋 AGE RELAXATION");
      console.log(`  EN: ${english.age_relaxation_notes}`);
      console.log(`  HI: ${hindi.age_relaxation_notes_hi}\n`);
    }

    console.log("");
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("📈 Translation Statistics\n");
  console.log(
    `  • Total postings: ${ENGLISH_JOBS.length} sample (212 in database)`
  );
  console.log(`  • Fields translated per job: 7`);
  console.log(`  •   ✓ title_hi`);
  console.log(`  •   ✓ description_hi`);
  console.log(`  •   ✓ eligibility_hi`);
  console.log(`  •   ✓ responsibilities_hi`);
  console.log(`  •   ✓ requirements_hi`);
  console.log(`  •   ✓ age_relaxation_notes_hi (null if empty)`);
  console.log(`  •   ✓ location_city_hi`);
  console.log(`  • Script handling: Devanagari (हिंदी)`);
  console.log(`  • Terminology: Professional/Formal\n`);

  console.log("✨ Key Observations:\n");
  console.log("  1. Titles translated accurately maintaining technical terms");
  console.log("  2. Location names use official Hindi spellings (Bangalore = बेंगलुरु)");
  console.log("  3. Null fields preserved (age_relaxation_notes when not applicable)");
  console.log("  4. Formal, professional Hindi throughout");
  console.log("  5. Numbers and acronyms preserved (5+, CA/CMA, SC/ST)\n");

  console.log("🚀 Next Steps:\n");
  console.log("  1. Set ANTHROPIC_API_KEY in .env.local");
  console.log("  2. Run: npm run i18n:translate-hindi");
  console.log("  3. Monitor progress for ~212 postings");
  console.log("  4. Verify in database: SELECT COUNT(*) FROM postings WHERE title_hi IS NOT NULL;");
  console.log("  5. Deploy to production\n");

  console.log("📚 Documentation:");
  console.log("  • TRANSLATION_GUIDE.md - Full translation pipeline guide");
  console.log("  • I18N_IMPLEMENTATION.md - Overall i18n architecture");
  console.log("  • src/scripts/translate-jobs-to-hindi.ts - Actual translation script\n");
}

demonstrateMockTranslation();
