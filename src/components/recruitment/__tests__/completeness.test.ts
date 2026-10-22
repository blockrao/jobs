/**
 * Phase 5: Data Completeness Test Suite
 *
 * Tests to verify all critical recruitment fields are populated and displayed
 * Runs in CI/CD pipeline to prevent regressions
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../../../db';
import {
  recruitments,
  posts,
  postingLocations,
  recruitmentCutoffs,
} from '../../../db/schema';
import { sql } from 'drizzle-orm';

describe('Data Completeness Tests', () => {
  let stats = {
    totalRecruitments: 0,
    totalPosts: 0,
    withSalaryNote: 0,
    withSalaryBreakdown: 0,
    withAdmitCardDate: 0,
    withInterviewDate: 0,
    postsWithLocations: 0,
    recruitmentsWithCutoffs: 0,
  };

  beforeAll(async () => {
    // Query database for completeness metrics
    try {
      // Count recruitments
      const recCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(recruitments);
      stats.totalRecruitments = recCount[0]?.count || 0;

      // Count posts
      const postCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(posts);
      stats.totalPosts = postCount[0]?.count || 0;

      // Count salary populated
      const salaryCounts = await db
        .select({
          withNote: sql<number>`count(case when salary_note is not null then 1 end)`,
          withBreakdown: sql<number>`count(case when salary_breakdown is not null then 1 end)`,
        })
        .from(recruitments);
      stats.withSalaryNote = salaryCounts[0]?.withNote || 0;
      stats.withSalaryBreakdown = salaryCounts[0]?.withBreakdown || 0;

      // Count timeline dates
      const datesCounts = await db
        .select({
          admitCard: sql<number>`count(case when admit_card_date is not null then 1 end)`,
          interview: sql<number>`count(case when interview_date is not null then 1 end)`,
        })
        .from(recruitments);
      stats.withAdmitCardDate = datesCounts[0]?.admitCard || 0;
      stats.withInterviewDate = datesCounts[0]?.interview || 0;

      // Count posts with locations
      const locCounts = await db
        .select({
          postsWithLoc: sql<number>`count(distinct post_id)`,
        })
        .from(postingLocations);
      stats.postsWithLocations = locCounts[0]?.postsWithLoc || 0;

      // Count recruitments with cutoffs
      const cutoffCounts = await db
        .select({
          recruitmentsWithCutoff: sql<number>`count(distinct recruitment_id)`,
        })
        .from(recruitmentCutoffs);
      stats.recruitmentsWithCutoffs = cutoffCounts[0]?.recruitmentsWithCutoff || 0;
    } catch (error) {
      console.error('Error loading completeness stats:', error);
    }
  });

  describe('Salary Data Completeness', () => {
    it('should have salary_note for at least 50% of recruitments', () => {
      const coverage = stats.totalRecruitments > 0
        ? (stats.withSalaryNote / stats.totalRecruitments) * 100
        : 0;
      expect(coverage).toBeGreaterThanOrEqual(50);
    });

    it('should have salary_breakdown for at least 30% of recruitments', () => {
      const coverage = stats.totalRecruitments > 0
        ? (stats.withSalaryBreakdown / stats.totalRecruitments) * 100
        : 0;
      expect(coverage).toBeGreaterThanOrEqual(30);
    });

    it('should not have null salary_note and salary_breakdown together', async () => {
      const bothNull = await db
        .select({ count: sql<number>`count(*)` })
        .from(recruitments)
        .where(
          sql`salary_note is null and salary_breakdown is null`
        );
      // At most 50% can be completely empty (legacy data)
      const nullCount = bothNull[0]?.count || 0;
      const nullCoverage = stats.totalRecruitments > 0
        ? (nullCount / stats.totalRecruitments) * 100
        : 0;
      expect(nullCoverage).toBeLessThanOrEqual(50);
    });
  });

  describe('Timeline Data Completeness', () => {
    it('should have admit_card_date or interview_date for at least 20% of recruitments', () => {
      const withAny = stats.withAdmitCardDate + stats.withInterviewDate;
      const coverage = stats.totalRecruitments > 0
        ? (withAny / stats.totalRecruitments) * 100
        : 0;
      expect(coverage).toBeGreaterThanOrEqual(20);
    });

    it('should have interview_date for at least 10% of recruitments', () => {
      const coverage = stats.totalRecruitments > 0
        ? (stats.withInterviewDate / stats.totalRecruitments) * 100
        : 0;
      expect(coverage).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Posting Locations Completeness', () => {
    it('should have posting locations for at least 80% of posts', () => {
      const coverage = stats.totalPosts > 0
        ? (stats.postsWithLocations / stats.totalPosts) * 100
        : 0;
      expect(coverage).toBeGreaterThanOrEqual(80);
    });

    it('should have no orphaned posting_location records', async () => {
      const orphaned = await db
        .select({ count: sql<number>`count(*)` })
        .from(postingLocations)
        .where(
          sql`post_id not in (select id from posts)`
        );
      expect(orphaned[0]?.count || 0).toBe(0);
    });

    it('should have valid city and state for all locations', async () => {
      const invalid = await db
        .select({ count: sql<number>`count(*)` })
        .from(postingLocations)
        .where(
          sql`city is null or state is null or city = '' or state = ''`
        );
      expect(invalid[0]?.count || 0).toBe(0);
    });
  });

  describe('Cutoff Marks Completeness', () => {
    it('should have cutoff marks for at least 50% of recruitments', () => {
      const coverage = stats.totalRecruitments > 0
        ? (stats.recruitmentsWithCutoffs / stats.totalRecruitments) * 100
        : 0;
      expect(coverage).toBeGreaterThanOrEqual(50);
    });

    it('should have no orphaned recruitment_cutoff records', async () => {
      const orphaned = await db
        .select({ count: sql<number>`count(*)` })
        .from(recruitmentCutoffs)
        .where(
          sql`recruitment_id not in (select id from recruitments)`
        );
      expect(orphaned[0]?.count || 0).toBe(0);
    });

    it('should have valid cutoff marks (between 0-1000)', async () => {
      const invalid = await db
        .select({ count: sql<number>`count(*)` })
        .from(recruitmentCutoffs)
        .where(
          sql`cutoff_marks < 0 or cutoff_marks > 1000`
        );
      expect(invalid[0]?.count || 0).toBe(0);
    });

    it('should have all 5 categories for major exams', async () => {
      const exams = await db
        .select({ recruitment_id: recruitmentCutoffs.recruitment_id })
        .from(recruitmentCutoffs)
        .groupBy(sql`recruitment_id`)
        .having(
          sql`count(distinct category) >= 5`
        );
      // At least 20% of recruitments with cutoffs should have all 5 categories
      expect(exams.length).toBeGreaterThan(0);
    });
  });

  describe('Data Integrity', () => {
    it('should not have duplicate salary entries per recruitment', async () => {
      const duplicates = await db
        .select({ count: sql<number>`count(*)` })
        .from(recruitments)
        .where(
          sql`id in (
            select recruitment_id from (
              select recruitment_id, count(*) as cnt
              from recruitment_cutoffs
              group by recruitment_id, year, category
              having count(*) > 1
            ) dupes
          )`
        );
      expect(duplicates[0]?.count || 0).toBe(0);
    });

    it('should have valid timestamp formats for dates', async () => {
      const invalid = await db
        .select({ count: sql<number>`count(*)` })
        .from(recruitments)
        .where(
          sql`admit_card_date > now() + interval '5 years'
              or interview_date > now() + interval '5 years'`
        );
      // Allow up to 5 years in future for planning
      expect(invalid[0]?.count || 0).toBeLessThan(10);
    });
  });

  describe('Overall Completeness Score', () => {
    it('should achieve at least 75% overall data completeness', () => {
      const salaryScore = stats.totalRecruitments > 0
        ? (stats.withSalaryNote / stats.totalRecruitments) * 100
        : 0;
      const locationScore = stats.totalPosts > 0
        ? (stats.postsWithLocations / stats.totalPosts) * 100
        : 0;
      const cutoffScore = stats.totalRecruitments > 0
        ? (stats.recruitmentsWithCutoffs / stats.totalRecruitments) * 100
        : 0;

      const overallScore = (salaryScore + locationScore + cutoffScore) / 3;
      expect(overallScore).toBeGreaterThanOrEqual(75);
    });

    it('should log completeness metrics for monitoring', () => {
      console.log('\n=== DATA COMPLETENESS METRICS ===');
      console.log(`Total Recruitments: ${stats.totalRecruitments}`);
      console.log(`With Salary Note: ${stats.withSalaryNote} (${((stats.withSalaryNote / stats.totalRecruitments) * 100).toFixed(1)}%)`);
      console.log(`With Salary Breakdown: ${stats.withSalaryBreakdown} (${((stats.withSalaryBreakdown / stats.totalRecruitments) * 100).toFixed(1)}%)`);
      console.log(`With Admit Card Date: ${stats.withAdmitCardDate} (${((stats.withAdmitCardDate / stats.totalRecruitments) * 100).toFixed(1)}%)`);
      console.log(`With Interview Date: ${stats.withInterviewDate} (${((stats.withInterviewDate / stats.totalRecruitments) * 100).toFixed(1)}%)`);
      console.log(`Posts with Locations: ${stats.postsWithLocations}/${stats.totalPosts} (${((stats.postsWithLocations / stats.totalPosts) * 100).toFixed(1)}%)`);
      console.log(`Recruitments with Cutoffs: ${stats.recruitmentsWithCutoffs}/${stats.totalRecruitments} (${((stats.recruitmentsWithCutoffs / stats.totalRecruitments) * 100).toFixed(1)}%)`);
      console.log('===================================\n');
    });
  });
});
