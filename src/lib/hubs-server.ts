'use server';

import { cache } from "react";
import { getDb } from "@/db";
import { and, gte, lte, ilike, eq, desc } from "drizzle-orm";
import { postings, organizations } from "@/db/schema";
import type { Hub } from "@/data/hubs-metadata";
import { getHub } from "@/data/hubs-metadata";

/**
 * Hub job interface — mirrors the database result shape
 */
export interface HubJob {
  id: number;
  title: string;
  organization: string;
  vacancies: number | null;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  last_date: Date | null;
  recruitment_slug: string;
  post_slug: string;
}

/**
 * Fetch live jobs for a hub from the database
 * Server-only function with database access
 * Cached with ISR (6 hours revalidation)
 */
export const getHubJobs = cache(async (slug: string, limit: number = 15): Promise<HubJob[]> => {
  const hub = getHub(slug);
  if (!hub) return [];

  try {
    const db = getDb();
    if (!db) return [];

    const conditions: any[] = [];

    // Build query based on hub category and filters
    if (hub.category === "exam" && hub.filters.exam) {
      // Match exam by name
      const examName = hub.filters.exam;
      conditions.push(ilike(postings.title, `%${examName}%`));
    } else if (hub.category === "state" && hub.filters.state) {
      // Match by state/location
      conditions.push(ilike(postings.locationRegion, `%${hub.filters.state}%`));
    } else if (hub.category === "department" && hub.filters.department) {
      // Match by title containing department name
      conditions.push(ilike(postings.title, `%${hub.filters.department}%`));
    } else if (hub.category === "qualification" && hub.filters.qualification) {
      // Match by eligibility field
      conditions.push(ilike(postings.eligibility, `%${hub.filters.qualification}%`));
    } else if (hub.category === "salary") {
      // Match salary range
      if (hub.filters.salaryMin) {
        conditions.push(gte(postings.salaryMax, hub.filters.salaryMin));
      }
      if (hub.filters.salaryMax) {
        conditions.push(lte(postings.salaryMin, hub.filters.salaryMax));
      }
    }

    // Always filter for published/approved postings
    conditions.push(eq(postings.reviewStatus, "APPROVED"));

    // Execute query
    const jobs = await db
      .select({
        id: postings.id,
        title: postings.title,
        organization: organizations.name,
        vacancies: postings.totalVacancies,
        location: postings.locationRegion,
        salary_min: postings.salaryMin,
        salary_max: postings.salaryMax,
        last_date: postings.validThrough,
        recruitment_slug: postings.slug,
        post_slug: postings.slug,
      })
      .from(postings)
      .leftJoin(organizations, eq(postings.organizationId, organizations.id))
      .where(and(...conditions))
      .orderBy(desc(postings.datePosted))
      .limit(limit);

    return jobs.map(job => ({
      ...job,
      organization: job.organization || "Government of India",
    })) as HubJob[];
  } catch (error) {
    console.warn(`Failed to fetch jobs for hub ${slug}:`, error);
    return [];
  }
});
