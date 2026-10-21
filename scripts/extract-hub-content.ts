import * as fs from 'fs';
import * as path from 'path';
import { load } from 'cheerio';

// Complete hub metadata mapping - all 33 hubs
const hubMappings: Record<string, { category: string; color: string; filters: Record<string, any> }> = {
  // Exams (3)
  'ssc-comprehensive-guide': { category: 'exam', color: '#8B5CF6', filters: { exam: 'SSC' } },
  'upsc-comprehensive-guide': { category: 'exam', color: '#EC4899', filters: { exam: 'UPSC' } },
  'banking-comprehensive-guide': { category: 'exam', color: '#06B6D4', filters: { exam: 'Banking' } },
  
  // States (8)
  'delhi-comprehensive-guide': { category: 'state', color: '#F59E0B', filters: { state: 'Delhi' } },
  'maharashtra-comprehensive-guide': { category: 'state', color: '#F59E0B', filters: { state: 'Maharashtra' } },
  'tamil-nadu-comprehensive-guide': { category: 'state', color: '#F59E0B', filters: { state: 'Tamil Nadu' } },
  'uttar-pradesh-comprehensive-guide': { category: 'state', color: '#F59E0B', filters: { state: 'Uttar Pradesh' } },
  'bihar-comprehensive-guide': { category: 'state', color: '#F59E0B', filters: { state: 'Bihar' } },
  'madhya-pradesh-comprehensive-guide': { category: 'state', color: '#F59E0B', filters: { state: 'Madhya Pradesh' } },
  'haryana-comprehensive-guide': { category: 'state', color: '#F59E0B', filters: { state: 'Haryana' } },
  'rajasthan-comprehensive-guide': { category: 'state', color: '#F59E0B', filters: { state: 'Rajasthan' } },
  
  // Departments (8)
  'railways-comprehensive-guide': { category: 'department', color: '#10B981', filters: { department: 'Railways' } },
  'police-comprehensive-guide': { category: 'department', color: '#10B981', filters: { department: 'Police' } },
  'postal-comprehensive-guide': { category: 'department', color: '#10B981', filters: { department: 'Postal' } },
  'defense-comprehensive-guide': { category: 'department', color: '#10B981', filters: { department: 'Defense' } },
  'education-comprehensive-guide': { category: 'department', color: '#10B981', filters: { department: 'Education' } },
  'health-comprehensive-guide': { category: 'department', color: '#10B981', filters: { department: 'Health' } },
  'it-tech-comprehensive-guide': { category: 'department', color: '#10B981', filters: { department: 'IT/Tech' } },
  'finance-comprehensive-guide': { category: 'department', color: '#10B981', filters: { department: 'Finance' } },
  
  // Qualifications (7)
  '12th-pass-comprehensive-guide': { category: 'qualification', color: '#EF4444', filters: { qualification: '12th' } },
  'bachelors-comprehensive-guide': { category: 'qualification', color: '#EF4444', filters: { qualification: 'Bachelor' } },
  'diploma-comprehensive-guide': { category: 'qualification', color: '#EF4444', filters: { qualification: 'Diploma' } },
  'masters-comprehensive-guide': { category: 'qualification', color: '#EF4444', filters: { qualification: 'Master' } },
  '50-100k-comprehensive-guide': { category: 'salary', color: '#3B82F6', filters: { salaryMin: 50000, salaryMax: 100000 } },
  '30-50k-comprehensive-guide': { category: 'salary', color: '#3B82F6', filters: { salaryMin: 30000, salaryMax: 50000 } },
  '100k-plus-comprehensive-guide': { category: 'salary', color: '#3B82F6', filters: { salaryMin: 100000 } },
  
  // Phase 2A hubs (5)
  '12th-pass-government-jobs-2026': { category: 'qualification', color: '#EF4444', filters: { qualification: '12th' } },
  'ssc-cgl-vs-upsc-ias-comparison-2026': { category: 'exam', color: '#8B5CF6', filters: { exam: 'SSC' } },
  'diploma-government-jobs-2026': { category: 'qualification', color: '#EF4444', filters: { qualification: 'Diploma' } },
  'government-jobs-vs-private-sector-2026': { category: 'exam', color: '#8B5CF6', filters: {} },
  'highest-paying-government-jobs-2026': { category: 'salary', color: '#3B82F6', filters: { salaryMin: 50000 } },
  
  // Fallback for 100k
  '100k-comprehensive-guide': { category: 'salary', color: '#3B82F6', filters: { salaryMin: 100000 } },
  'customs-comprehensive-guide': { category: 'department', color: '#10B981', filters: { department: 'Customs' } },
};

async function main() {
  const hubDir = '/home/claude/jobs/public/hubs';
  const files = fs.readdirSync(hubDir)
    .filter(f => f.endsWith('.html') && f !== 'index.html' && !f.includes('expanded'));

  console.log(`Found ${files.length} hub files to extract`);

  const hubs: Record<string, any> = {};

  files.forEach(file => {
    const slug = file.replace('.html', '');
    const filePath = path.join(hubDir, file);
    const html = fs.readFileSync(filePath, 'utf-8');
    
    const mapping = hubMappings[slug];
    if (!mapping) {
      console.warn(`⚠ No mapping for ${slug}, skipping...`);
      return;
    }

    const $ = load(html);
    
    const title = ($('title').text() || $('h1').first().text()).substring(0, 150);
    const description = ($('meta[name="description"]').attr('content') || '').substring(0, 200);
    
    hubs[slug] = {
      slug,
      title: title || slug,
      description: description || 'Government jobs guide for ' + slug,
      category: mapping.category,
      color: mapping.color,
      filters: mapping.filters,
    };

    console.log(`✓ ${slug}`);
  });

  // Output
  console.log(`\n=== EXTRACTED ${Object.keys(hubs).length} HUBS ===`);
  fs.writeFileSync('/tmp/hubs-extracted.json', JSON.stringify(hubs, null, 2));
  console.log('Saved to /tmp/hubs-extracted.json');
  
  // Show summary
  const byCategory = {} as any;
  Object.values(hubs).forEach((h: any) => {
    if (!byCategory[h.category]) byCategory[h.category] = 0;
    byCategory[h.category]++;
  });
  console.log('\nBy category:', byCategory);
}

main().catch(console.error);
