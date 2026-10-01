/**
 * Test script for Hindi search implementation
 * Tests:
 * 1. Language detection for English, Hindi, Hinglish queries
 * 2. Filter extraction from Hindi queries
 * 3. Filter-based search for Hindi queries
 */

import { detectLanguage } from "@/lib/query-engine/language-detector";
import { extractFilters } from "@/lib/query-engine/filter-extractor";

const testQueries = [
  // English queries
  { text: "SSC jobs in Delhi", expected: "english" },
  { text: "Which exams are best for civil service", expected: "english" },

  // Hindi queries
  { text: "एसएससी परीक्षा दिल्ली में", expected: "hindi" },
  { text: "यूपीएससी नौकरियां", expected: "hindi" },
  { text: "10वीं पास के लिए सरकारी नौकरी", expected: "hindi" },

  // Hinglish queries
  { text: "SSC exam kaunse state me available hain", expected: "hinglish" },
  { text: "railway jobs ke liye kya qualification chahiye", expected: "hinglish" },
  { text: "bank exam ki tayyari kaise kare", expected: "hinglish" },
];

console.log("\n🧪 HINDI SEARCH IMPLEMENTATION TEST\n");
console.log("═══════════════════════════════════════════════════\n");

// Test 1: Language Detection
console.log("📍 TEST 1: Language Detection\n");
for (const query of testQueries) {
  const detected = detectLanguage(query.text);
  const status =
    detected.detected === query.expected ? "✅" : "❌";
  console.log(
    `${status} Query: "${query.text.substring(0, 40)}..."`
  );
  console.log(
    `   Language: ${detected.detected} (confidence: ${detected.confidence.toFixed(2)})`
  );
  if (detected.detected !== query.expected) {
    console.log(`   Expected: ${query.expected}`);
  }
  console.log();
}

// Test 2: Filter Extraction from Hindi Queries
console.log("\n📍 TEST 2: Filter Extraction from Hindi Queries\n");

const hindiQueries = [
  "एसएससी परीक्षा दिल्ली में",
  "यूपीएससी नौकरियां उत्तर प्रदेश",
  "10वीं पास के लिए बैंक परीक्षा",
  "राज्य पीएससी महाराष्ट्र",
];

for (const query of hindiQueries) {
  console.log(`📌 Query: "${query}"`);
  const extracted = extractFilters(query);

  if (extracted.exams.length > 0) {
    console.log(`   🎯 Exams:`);
    extracted.exams.forEach((e) => {
      console.log(`      - ${e.name} (confidence: ${e.confidence.toFixed(2)})`);
    });
  }

  if (extracted.states.length > 0) {
    console.log(`   📍 States:`);
    extracted.states.forEach((s) => {
      console.log(`      - ${s.name} (confidence: ${s.confidence.toFixed(2)})`);
    });
  }

  if (extracted.qualifications.length > 0) {
    console.log(`   🎓 Qualifications:`);
    extracted.qualifications.forEach((q) => {
      console.log(`      - ${q.name} (confidence: ${q.confidence.toFixed(2)})`);
    });
  }

  if (extracted.keywords.length > 0) {
    console.log(`   🔑 Keywords: ${extracted.keywords.join(", ")}`);
  }

  console.log(`   Confidence: ${extracted.totalConfidence.toFixed(2)}\n`);
}

// Test 3: Hinglish Normalization
console.log("\n📍 TEST 3: Hinglish Normalization\n");

import { normalizeHinglishPhonetics } from "@/lib/query-engine/language-detector";

const hinglishTests = [
  "ssc exam ho raha hai",
  "railway bharti kya ho gayi",
  "bank job ke liye karo preparation",
];

for (const query of hinglishTests) {
  const normalized = normalizeHinglishPhonetics(query);
  console.log(`📌 Original:  "${query}"`);
  console.log(`   Normalized: "${normalized}"\n`);
}

console.log("\n═══════════════════════════════════════════════════");
console.log("✅ HINDI SEARCH IMPLEMENTATION TEST COMPLETE\n");
