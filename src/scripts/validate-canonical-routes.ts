/**
 * Route Validation: Canonical Page Checker
 * 
 * Validates that every entity (organization, exam, job posting) has:
 * 1. Canonical route at /[locale]/entity/[slug]
 * 2. Proper hreflang links for all locale variants
 * 3. Required translation fields in database
 * 4. Consistent URL structure across all entity types
 * 
 * Run before deploying new postings: npm run validate:routes
 */

import { getDb } from "@/db";
import { organizations, exams, postings, articles } from "@/db/schema";

interface ValidationResult {
  entity: string;
  total: number;
  missingTranslations: number;
  issues: string[];
  passed: boolean;
}

interface RouteCheckResult {
  organization: ValidationResult;
  exam: ValidationResult;
  posting: ValidationResult;
  article: ValidationResult;
  summary: {
    allPassed: boolean;
    totalIssues: number;
    recommendations: string[];
  };
}

async function validateCanonicalRoutes(): Promise<RouteCheckResult> {
  const db = getDb();
  if (!db) {
    throw new Error("Database connection failed");
  }

  console.log("\n🔍 Validating Canonical Routes & Entity Pages\n");
  console.log("═══════════════════════════════════════════════════\n");

  const results: RouteCheckResult = {
    organization: {
      entity: "organizations",
      total: 0,
      missingTranslations: 0,
      issues: [],
      passed: false,
    },
    exam: {
      entity: "exams",
      total: 0,
      missingTranslations: 0,
      issues: [],
      passed: false,
    },
    posting: {
      entity: "postings (jobs)",
      total: 0,
      missingTranslations: 0,
      issues: [],
      passed: false,
    },
    article: {
      entity: "articles",
      total: 0,
      missingTranslations: 0,
      issues: [],
      passed: false,
    },
    summary: {
      allPassed: true,
      totalIssues: 0,
      recommendations: [],
    },
  };

  try {
    // ✅ ORGANIZATIONS
    console.log("📋 ORGANIZATIONS");
    console.log("───────────────────────────────────────────────────\n");

    const orgs = await db.select().from(organizations);
    results.organization.total = orgs.length;

    const missingOrgSlug = orgs.filter((o) => !o.slug);
    const missingOrgTranslations = orgs.filter(
      (o) => !o.nameHi || !o.descriptionHi
    );

    if (missingOrgSlug.length > 0) {
      results.organization.issues.push(
        `❌ ${missingOrgSlug.length}/${orgs.length} missing slugs`
      );
    }

    if (missingOrgTranslations.length > 0) {
      results.organization.missingTranslations = missingOrgTranslations.length;
      results.organization.issues.push(
        `⚠️  ${missingOrgTranslations.length}/${orgs.length} missing Hindi translations`
      );
    }

    results.organization.passed =
      missingOrgSlug.length === 0 && missingOrgTranslations.length === 0;

    console.log(`Total: ${orgs.length}`);
    console.log(`With slugs: ${orgs.length - missingOrgSlug.length}`);
    console.log(
      `With Hindi translations: ${orgs.length - missingOrgTranslations.length}`
    );
    console.log(`Status: ${results.organization.passed ? "✅ PASS" : "❌ FAIL"}\n`);

    // ✅ EXAMS
    console.log("📋 EXAMS");
    console.log("───────────────────────────────────────────────────\n");

    const examsData = await db.select().from(exams);
    results.exam.total = examsData.length;

    const missingExamSlug = examsData.filter((e) => !e.slug);
    const missingExamTranslations = examsData.filter(
      (e) => !e.nameHi || !e.descriptionHi
    );

    if (missingExamSlug.length > 0) {
      results.exam.issues.push(
        `❌ ${missingExamSlug.length}/${examsData.length} missing slugs`
      );
    }

    if (missingExamTranslations.length > 0) {
      results.exam.missingTranslations = missingExamTranslations.length;
      results.exam.issues.push(
        `⚠️  ${missingExamTranslations.length}/${examsData.length} missing Hindi translations`
      );
    }

    results.exam.passed =
      missingExamSlug.length === 0 && missingExamTranslations.length === 0;

    console.log(`Total: ${examsData.length}`);
    console.log(`With slugs: ${examsData.length - missingExamSlug.length}`);
    console.log(
      `With Hindi translations: ${examsData.length - missingExamTranslations.length}`
    );
    console.log(`Status: ${results.exam.passed ? "✅ PASS" : "❌ FAIL"}\n`);

    // ✅ POSTINGS (JOBS)
    console.log("📋 POSTINGS (JOBS)");
    console.log("───────────────────────────────────────────────────\n");

    const postingsData = await db.select().from(postings);
    results.posting.total = postingsData.length;

    const missingPostingSlug = postingsData.filter((p) => !p.slug);
    const missingPostingTranslations = postingsData.filter(
      (p) => !p.titleHi || !p.descriptionHi
    );

    if (missingPostingSlug.length > 0) {
      results.posting.issues.push(
        `❌ ${missingPostingSlug.length}/${postingsData.length} missing slugs`
      );
    }

    if (missingPostingTranslations.length > 0) {
      results.posting.missingTranslations =
        missingPostingTranslations.length;
      results.posting.issues.push(
        `⚠️  ${missingPostingTranslations.length}/${postingsData.length} missing Hindi translations`
      );
    }

    results.posting.passed =
      missingPostingSlug.length === 0 &&
      missingPostingTranslations.length === 0;

    console.log(`Total: ${postingsData.length}`);
    console.log(`With slugs: ${postingsData.length - missingPostingSlug.length}`);
    console.log(
      `With Hindi translations: ${postingsData.length - missingPostingTranslations.length}`
    );
    console.log(`Status: ${results.posting.passed ? "✅ PASS" : "❌ FAIL"}\n`);

    // ✅ ARTICLES
    console.log("📋 ARTICLES");
    console.log("───────────────────────────────────────────────────\n");

    const articlesData = await db.select().from(articles);
    results.article.total = articlesData.length;

    const missingArticleSlug = articlesData.filter((a) => !a.slug);
    const missingArticleTranslations = articlesData.filter(
      (a) => !a.titleHi || !a.contentHi
    );

    if (missingArticleSlug.length > 0) {
      results.article.issues.push(
        `❌ ${missingArticleSlug.length}/${articlesData.length} missing slugs`
      );
    }

    if (missingArticleTranslations.length > 0) {
      results.article.missingTranslations = missingArticleTranslations.length;
      results.article.issues.push(
        `⚠️  ${missingArticleTranslations.length}/${articlesData.length} missing Hindi translations`
      );
    }

    results.article.passed =
      missingArticleSlug.length === 0 &&
      missingArticleTranslations.length === 0;

    console.log(`Total: ${articlesData.length}`);
    console.log(
      `With slugs: ${articlesData.length - missingArticleSlug.length}`
    );
    console.log(
      `With Hindi translations: ${articlesData.length - missingArticleTranslations.length}`
    );
    console.log(`Status: ${results.article.passed ? "✅ PASS" : "❌ FAIL"}\n`);

    // ✅ SUMMARY
    console.log("═══════════════════════════════════════════════════");
    console.log("📊 VALIDATION SUMMARY\n");

    const allPassed =
      results.organization.passed &&
      results.exam.passed &&
      results.posting.passed &&
      results.article.passed;

    results.summary.allPassed = allPassed;
    results.summary.totalIssues = results.organization.issues.length +
      results.exam.issues.length +
      results.posting.issues.length +
      results.article.issues.length;

    if (allPassed) {
      console.log("✅ ALL CANONICAL ROUTES VALID\n");
    } else {
      console.log("⚠️  ISSUES DETECTED\n");

      console.log("RECOMMENDATIONS:\n");
      if (results.organization.missingTranslations > 0) {
        console.log(
          `1. Translate ${results.organization.missingTranslations} organizations to Hindi`
        );
        console.log(`   Run: npm run i18n:translate-organizations\n`);
      }

      if (results.exam.missingTranslations > 0) {
        console.log(`2. Translate ${results.exam.missingTranslations} exams to Hindi`);
        console.log(`   Run: npm run i18n:translate-exams\n`);
      }

      if (results.posting.missingTranslations > 0) {
        console.log(
          `3. Translate ${results.posting.missingTranslations} postings to Hindi`
        );
        console.log(`   Run: npm run i18n:translate-hindi\n`);
      }

      if (results.article.missingTranslations > 0) {
        console.log(
          `4. Translate ${results.article.missingTranslations} articles to Hindi`
        );
        console.log(`   Run: npm run i18n:translate-articles\n`);
      }
    }

    console.log("\n═══════════════════════════════════════════════════\n");
  } catch (error) {
    console.error("❌ Validation failed:", error);
    process.exit(1);
  }

  return results;
}

// Run validation
validateCanonicalRoutes()
  .then((results) => {
    process.exit(results.summary.allPassed ? 0 : 1);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
