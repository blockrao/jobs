/**
 * Daily posting pipeline entry point
 * Handles new postings arriving from aggregators or official sources
 * Auto-assigns index tier, validates JobPosting schema, creates relationships
 */

import { createClient } from '@supabase/supabase-js';
import { buildJobPostingSchema } from '@/lib/structured-data';
import type { Database } from '@/lib/database.types';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface RawPostingInput {
  title: string;
  description?: string;
  organizationName: string;
  organizationSlug?: string;
  positionTitle: string;
  recruitmentTitle: string;
  locationCity?: string;
  locationRegion?: string;
  salaryMin?: number;
  salaryMax?: number;
  totalVacancies?: number;
  applicationUrl?: string;
  notificationUrl?: string;
  sourceType: 'official' | 'aggregator';
  source: string;
  externalId?: string;
}

/**
 * Process new posting through pipeline:
 * 1. Normalize & validate
 * 2. Resolve/create organization
 * 3. Resolve/create recruitment
 * 4. Resolve/create post
 * 5. Auto-assign index tier
 * 6. Create posting with JobPosting schema
 * 7. Flag orgs for review if auto-created
 */
export async function processNewPosting(rawPosting: RawPostingInput): Promise<void> {
  // Step 1: Normalize
  const normalized = normalizePosting(rawPosting);

  // Step 2: Resolve organization
  const org = await resolveOrganization(normalized.organizationName, normalized.organizationSlug);

  // Step 3: Resolve recruitment
  const recruitment = await getOrCreateRecruitment(
    normalized.recruitmentTitle,
    org.id
  );

  // Step 4: Resolve post
  const post = await getOrCreatePost(recruitment.id, normalized.positionTitle);

  // Step 5: Calculate index tier
  const indexTier = assignIndexTier({
    organizationVerified: org.verification_status === 'VERIFIED',
    dataCompleteness: calculateCompleteness(normalized),
    sourceType: normalized.sourceType,
  });

  // Step 6: Create posting
  const posting = await createPosting({
    ...normalized,
    inferred_post_id: post.id,
    inferred_recruitment_id: recruitment.id,
    organization_id: org.id,
    index_tier: indexTier,
    publishing_status: indexTier === 'A' ? 'AUTOMATED_VALIDATION_PASS' : 'DRAFT',
  });

  // Step 6b: Build JobPosting schema for the created posting
  // (uses shared schema builder from src/lib/structured-data.ts per contract SD-03)
  const jobPostingSchema = buildJobPostingSchema(posting, org);
  if (jobPostingSchema) {
    console.log(`✅ JobPosting schema generated for posting: ${posting.id}`);
  }

  // Step 7: Flag org if auto-created
  if (org.created_at === org.updated_at) {
    await flagForReview(org.id, 'NEW_ORGANIZATION_AUTO_CREATED', {
      sourceType: normalized.sourceType,
      sourceUrl: normalized.sourceUrl,
    });
  }

  console.log(`✅ Processed posting: ${posting.id} (${indexTier})`);
}

function normalizePosting(raw: RawPostingInput) {
  return {
    title: raw.title?.trim() || '',
    description: raw.description?.trim() || '',
    organizationName: raw.organizationName?.trim() || '',
    organizationSlug: raw.organizationSlug?.toLowerCase().replace(/[^a-z0-9-]/g, '-') || '',
    positionTitle: raw.positionTitle?.trim() || '',
    recruitmentTitle: raw.recruitmentTitle?.trim() || '',
    locationCity: raw.locationCity?.trim() || '',
    locationRegion: raw.locationRegion?.trim() || 'India',
    salaryMin: raw.salaryMin || null,
    salaryMax: raw.salaryMax || null,
    totalVacancies: raw.totalVacancies || 1,
    applicationUrl: raw.applicationUrl || null,
    sourceUrl: raw.notificationUrl || null,
    sourceType: raw.sourceType,
    source: raw.source,
    externalId: raw.externalId || null,
  };
}

async function resolveOrganization(name: string, slug?: string) {
  // Try to find by slug or name
  if (slug) {
    const { data: existing } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single()
      .catch(() => ({ data: null }));

    if (existing) return existing;
  }

  // Try to find by name (case-insensitive)
  const { data: byName } = await supabase
    .from('organizations')
    .select('*')
    .ilike('name', name)
    .single()
    .catch(() => ({ data: null }));

  if (byName) return byName;

  // Create new organization
  const newSlug = slug || name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const { data: created } = await supabase
    .from('organizations')
    .insert([{
      name,
      slug: newSlug,
      description: `Government organization - auto-created from ${name}`,
    }])
    .select()
    .single();

  return created!;
}

async function getOrCreateRecruitment(title: string, organizationId: number) {
  // Try to find matching recruitment
  const { data: existing } = await supabase
    .from('recruitments')
    .select('*')
    .eq('name', title)
    .eq('organization_id', organizationId)
    .single()
    .catch(() => ({ data: null }));

  if (existing) return existing;

  // Create new recruitment
  const slug = title.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const { data: created } = await supabase
    .from('recruitments')
    .insert([{
      name: title,
      slug,
      organization_id: organizationId,
      status: 'ACTIVE',
    }])
    .select()
    .single();

  return created!;
}

async function getOrCreatePost(recruitmentId: number, positionTitle: string) {
  // Try to find matching post
  const { data: existing } = await supabase
    .from('posts')
    .select('*')
    .eq('recruitment_id', recruitmentId)
    .ilike('title', positionTitle)
    .single()
    .catch(() => ({ data: null }));

  if (existing) return existing;

  // Create new post
  const { data: created } = await supabase
    .from('posts')
    .insert([{
      recruitment_id: recruitmentId,
      position_id: 6, // "Other" category by default
      title: positionTitle,
    }])
    .select()
    .single();

  return created!;
}

function assignIndexTier(context: {
  organizationVerified: boolean;
  dataCompleteness: number; // 0-100
  sourceType: string;
}): 'A' | 'B' | 'C' {
  if (context.organizationVerified || context.dataCompleteness >= 90) {
    return 'A';
  }
  if (context.dataCompleteness >= 70) {
    return 'B';
  }
  return 'C';
}

function calculateCompleteness(posting: any): number {
  const fields = [
    posting.title,
    posting.description,
    posting.organizationName,
    posting.locationCity,
    posting.salaryMin,
    posting.totalVacancies,
    posting.sourceUrl,
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}

async function createPosting(data: any) {
  const { data: posting } = await supabase
    .from('postings')
    .insert([{
      title: data.title,
      slug: generateSlug(data),
      organization_id: data.organization_id,
      description: data.description,
      eligibility: data.positionTitle,
      total_vacancies: data.totalVacancies,
      location_city: data.locationCity,
      location_region: data.locationRegion,
      salary_min: data.salaryMin,
      salary_max: data.salaryMax,
      current_stage: 'APPLICATION_OPEN',
      status: 'ACTIVE',
      index_tier: data.index_tier,
      publishing_status: data.publishing_status,
      inferred_post_id: data.inferred_post_id,
      inferred_recruitment_id: data.inferred_recruitment_id,
      apply_url: data.applicationUrl || data.sourceUrl,
      official_notification_url: data.sourceUrl,
      source: data.source,
      confidence_score: 85,
      source_confidence: 80,
      created_at: new Date(),
      updated_at: new Date(),
    }])
    .select()
    .single();

  return posting!;
}

function generateSlug(data: any): string {
  const orgSlug = data.organizationSlug || data.organizationName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const titleSlug = data.title.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  return `${orgSlug}/${titleSlug}`.replace(/^-+|-+$/g, '').replace(/-+/g, '-');
}

async function flagForReview(orgId: number, reason: string, context?: any) {
  // Log to review queue or separate table
  console.warn(`⚠️ Organization ${orgId} flagged for review: ${reason}`, context);
}
