/**
 * Official Dataset Phase 1 Ingest
 * Purpose: Ingest FreeJobAlert official notifications into posts table
 * 
 * Usage:
 *   DRY_RUN=true npm run ts-node src/scripts/ingest-official-dataset.ts
 *   DRY_RUN=false npm run ts-node src/scripts/ingest-official-dataset.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

interface CategoryARecord {
  post_title: string;
  organization: string;
  vacancy_total: number;
  is_official_source: boolean;
  original_notification_url: string;
  apply_portal_url: string | null;
  official_website: string | null;
  posted_date: string;
  last_date: string;
  location: string;
  source: string;
  source_row: number;
}

interface CategoryBCRecord {
  source_row: number;
  category: string;
  original_post: string;
  decomposed_role: string;
  role_index: number;
  total_roles: number;
  organization: string;
  vacancy_total: number;
  official_notification_url: string;
  apply_portal_url: string | null;
  posted_date: string;
  last_date: string;
  location: string;
}

interface PostRecord {
  id?: string;
  post_title: string;
  organization: string;
  vacancy_total: number;
  is_official_source: boolean;
  original_recruitment_url: string;
  official_notification_url?: string;
  apply_portal_url?: string;
  official_website?: string;
  posted_date: string;
  last_date: string;
  location: string;
  source_name: string;
  source_reference: string;
  created_at?: string;
}

const DRY_RUN = process.env.DRY_RUN === 'true';
const DATA_DIR = '/tmp/claude-0/-home-claude-jobs/63bbf424-1dbe-5cea-bb2f-1a65f5cedf9b/scratchpad';

async function loadCategoryA(): Promise<PostRecord[]> {
  console.log('\n📂 Loading Category A records...');
  
  const filePath = path.join(DATA_DIR, 'category_a_ingest_final.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  const records: PostRecord[] = data.map((record: CategoryARecord, idx: number) => ({
    id: uuidv4(),
    post_title: record.post_title,
    organization: record.organization,
    vacancy_total: record.vacancy_total,
    is_official_source: true,
    original_recruitment_url: record.original_notification_url || '',
    official_notification_url: record.original_notification_url,
    apply_portal_url: record.apply_portal_url,
    official_website: record.official_website,
    posted_date: record.posted_date,
    last_date: record.last_date,
    location: record.location,
    source_name: 'FreeJobAlert',
    source_reference: `FreeJobAlert_row_${record.source_row}`,
    created_at: new Date().toISOString()
  }));
  
  console.log(`  ✓ Loaded ${records.length} Category A records`);
  console.log(`  ✓ Total vacancies: ${records.reduce((sum, r) => sum + r.vacancy_total, 0).toFixed(0)}`);
  
  return records;
}

async function loadCategoryBC(): Promise<PostRecord[]> {
  console.log('\n📂 Loading Categories B & C records...');
  
  const filePath = path.join(DATA_DIR, 'decomposition_data_final_clean.csv');
  const records: PostRecord[] = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (record: any) => {
        const postRecord: PostRecord = {
          id: uuidv4(),
          post_title: record.decomposed_role || record.original_post,
          organization: record.organization,
          vacancy_total: parseFloat(record.vacancy_total) || 0,
          is_official_source: true,
          original_recruitment_url: record.official_notification_url || '',
          official_notification_url: record.official_notification_url,
          apply_portal_url: record.apply_portal_url,
          posted_date: record.posted_date,
          last_date: record.last_date,
          location: record.location,
          source_name: 'FreeJobAlert',
          source_reference: `FreeJobAlert_row_${record.source_row}_role_${record.role_index}`,
          created_at: new Date().toISOString()
        };
        records.push(postRecord);
      })
      .on('end', () => {
        console.log(`  ✓ Loaded ${records.length} Categories B & C records`);
        console.log(`  ✓ Total vacancies: ${records.reduce((sum, r) => sum + r.vacancy_total, 0).toFixed(0)}`);
        resolve(records);
      })
      .on('error', reject);
  });
}

async function executeDryRun(allRecords: PostRecord[]): Promise<void> {
  console.log('\n🔍 DRY-RUN MODE: Validating data without database writes');
  console.log(`   Total records to insert: ${allRecords.length}`);
  
  // Validate all records
  let validCount = 0;
  let invalidCount = 0;
  const errors: string[] = [];
  
  allRecords.forEach((record, idx) => {
    if (!record.post_title || !record.organization || record.vacancy_total === undefined) {
      invalidCount++;
      errors.push(`Row ${idx}: Missing required fields`);
    } else if (record.vacancy_total < 0) {
      invalidCount++;
      errors.push(`Row ${idx}: Invalid vacancy count: ${record.vacancy_total}`);
    } else {
      validCount++;
    }
  });
  
  console.log(`   Valid records: ${validCount}`);
  console.log(`   Invalid records: ${invalidCount}`);
  
  if (errors.length > 0 && errors.length <= 10) {
    console.log('\n   Validation errors:');
    errors.forEach(e => console.log(`     - ${e}`));
  }
  
  if (invalidCount > 0) {
    throw new Error(`Dry-run validation failed: ${invalidCount} invalid records`);
  }
  
  console.log('\n   ✓ All records valid');
  console.log('   ✓ No database writes performed (DRY_RUN=true)');
  console.log('   ✓ Ready for production execution with DRY_RUN=false\n');
}

async function executeProduction(allRecords: PostRecord[]): Promise<void> {
  console.log('\n🚀 PRODUCTION MODE: Executing database writes');
  
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  let insertedCount = 0;
  let errorCount = 0;
  const batchSize = 100;
  
  // Insert in batches
  for (let i = 0; i < allRecords.length; i += batchSize) {
    const batch = allRecords.slice(i, Math.min(i + batchSize, allRecords.length));
    
    const { error } = await supabase
      .from('posts')
      .insert(batch.map(r => ({
        post_title: r.post_title,
        organization: r.organization,
        vacancy_total: r.vacancy_total,
        is_official_source: r.is_official_source,
        original_recruitment_url: r.original_recruitment_url,
        official_notification_url: r.official_notification_url,
        source_name: r.source_name,
        source_reference: r.source_reference,
        location: r.location,
        posted_date: r.posted_date,
        last_date: r.last_date
      })));
    
    if (error) {
      console.error(`   ✗ Batch error: ${error.message}`);
      errorCount += batch.length;
    } else {
      insertedCount += batch.length;
      console.log(`   ✓ Inserted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records`);
    }
  }
  
  console.log(`\n   Total inserted: ${insertedCount}`);
  console.log(`   Errors: ${errorCount}`);
  
  if (errorCount > 0) {
    throw new Error(`Production execution failed: ${errorCount} records failed to insert`);
  }
}

async function main() {
  console.log('═'.repeat(70));
  console.log('Official Dataset Phase 1 Ingest');
  console.log('═'.repeat(70));
  console.log(`Mode: ${DRY_RUN ? 'DRY-RUN' : 'PRODUCTION'}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  try {
    // Load data
    const categoryA = await loadCategoryA();
    const categoryBC = await loadCategoryBC();
    const allRecords = [...categoryA, ...categoryBC];
    
    console.log('\n📊 Summary:');
    console.log(`   Category A posts: ${categoryA.length}`);
    console.log(`   Categories B & C posts: ${categoryBC.length}`);
    console.log(`   Total posts: ${allRecords.length}`);
    console.log(`   Total vacancies: ${allRecords.reduce((sum, r) => sum + r.vacancy_total, 0).toFixed(0)}`);
    
    // Execute based on mode
    if (DRY_RUN) {
      await executeDryRun(allRecords);
    } else {
      await executeProduction(allRecords);
    }
    
    console.log('═'.repeat(70));
    console.log('✓ Ingest completed successfully');
    console.log('═'.repeat(70));
    
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
