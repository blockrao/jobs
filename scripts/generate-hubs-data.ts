import * as fs from 'fs';
import * as path from 'path';
import { load } from 'cheerio';

// Complete hub metadata mapping
const hubMappings: Record<string, { 
  category: 'exam' | 'state' | 'department' | 'qualification' | 'salary'; 
  color: string; 
  filters: Record<string, any>;
  relatedHubs?: string[];
  stats?: Record<string, string | number>;
}> = {
  // Exams
  'ssc-comprehensive-guide': { 
    category: 'exam', color: '#8B5CF6', filters: { exam: 'SSC' },
    relatedHubs: ['upsc-comprehensive-guide', 'banking-comprehensive-guide', '50-100k-comprehensive-guide'],
    stats: { totalJobs: 12000, salaryRange: '₹21K–₹60K', selectionRate: '1–2%' }
  },
  'upsc-comprehensive-guide': { 
    category: 'exam', color: '#EC4899', filters: { exam: 'UPSC' },
    relatedHubs: ['ssc-comprehensive-guide', 'bachelors-comprehensive-guide', '50-100k-comprehensive-guide'],
    stats: { totalJobs: 1500, salaryRange: '₹56K–₹250K', selectionRate: '0.08–1%' }
  },
  'banking-comprehensive-guide': { 
    category: 'exam', color: '#06B6D4', filters: { exam: 'Banking' },
    relatedHubs: ['ssc-comprehensive-guide', 'upsc-comprehensive-guide', '50-100k-comprehensive-guide'],
    stats: { totalJobs: 8000, salaryRange: '₹18K–₹75K', selectionRate: '1–2%' }
  },
  
  // States
  'delhi-comprehensive-guide': { 
    category: 'state', color: '#F59E0B', filters: { state: 'Delhi' },
    relatedHubs: ['maharashtra-comprehensive-guide', 'uttar-pradesh-comprehensive-guide'],
    stats: { totalJobs: 5000, salaryRange: '₹21K–₹100K', selectionRate: '2–4%' }
  },
  'maharashtra-comprehensive-guide': { 
    category: 'state', color: '#F59E0B', filters: { state: 'Maharashtra' },
    relatedHubs: ['delhi-comprehensive-guide', 'tamil-nadu-comprehensive-guide'],
    stats: { totalJobs: 8000, salaryRange: '₹21K–₹80K', selectionRate: '2–4%' }
  },
  'tamil-nadu-comprehensive-guide': { 
    category: 'state', color: '#F59E0B', filters: { state: 'Tamil Nadu' },
    relatedHubs: ['maharashtra-comprehensive-guide', 'rajasthan-comprehensive-guide'],
    stats: { totalJobs: 4000, salaryRange: '₹21K–₹70K', selectionRate: '2–3%' }
  },
  'uttar-pradesh-comprehensive-guide': { 
    category: 'state', color: '#F59E0B', filters: { state: 'Uttar Pradesh' },
    relatedHubs: ['delhi-comprehensive-guide', 'madhya-pradesh-comprehensive-guide'],
    stats: { totalJobs: 12000, salaryRange: '₹21K–₹80K', selectionRate: '2–3%' }
  },
  'bihar-comprehensive-guide': { 
    category: 'state', color: '#F59E0B', filters: { state: 'Bihar' },
    relatedHubs: ['uttar-pradesh-comprehensive-guide', 'madhya-pradesh-comprehensive-guide'],
    stats: { totalJobs: 3000, salaryRange: '₹21K–₹60K', selectionRate: '3–5%' }
  },
  'madhya-pradesh-comprehensive-guide': { 
    category: 'state', color: '#F59E0B', filters: { state: 'Madhya Pradesh' },
    relatedHubs: ['rajasthan-comprehensive-guide', 'bihar-comprehensive-guide'],
    stats: { totalJobs: 5000, salaryRange: '₹21K–₹70K', selectionRate: '2–4%' }
  },
  'haryana-comprehensive-guide': { 
    category: 'state', color: '#F59E0B', filters: { state: 'Haryana' },
    relatedHubs: ['delhi-comprehensive-guide', 'punjab-comprehensive-guide'],
    stats: { totalJobs: 2000, salaryRange: '₹21K–₹75K', selectionRate: '2–4%' }
  },
  'rajasthan-comprehensive-guide': { 
    category: 'state', color: '#F59E0B', filters: { state: 'Rajasthan' },
    relatedHubs: ['madhya-pradesh-comprehensive-guide', 'gujarat-comprehensive-guide'],
    stats: { totalJobs: 4000, salaryRange: '₹21K–₹70K', selectionRate: '2–4%' }
  },
  
  // Departments
  'railways-comprehensive-guide': { 
    category: 'department', color: '#10B981', filters: { department: 'Railways' },
    relatedHubs: ['ssc-comprehensive-guide', 'police-comprehensive-guide'],
    stats: { totalJobs: 15000, salaryRange: '₹18K–₹100K', selectionRate: '2–4%' }
  },
  'police-comprehensive-guide': { 
    category: 'department', color: '#10B981', filters: { department: 'Police' },
    relatedHubs: ['defense-comprehensive-guide', 'railways-comprehensive-guide'],
    stats: { totalJobs: 40000, salaryRange: '₹21K–₹80K', selectionRate: '3–5%' }
  },
  'postal-comprehensive-guide': { 
    category: 'department', color: '#10B981', filters: { department: 'Postal' },
    relatedHubs: ['railways-comprehensive-guide', 'banking-comprehensive-guide'],
    stats: { totalJobs: 5000, salaryRange: '₹18K–₹60K', selectionRate: '2–4%' }
  },
  'defense-comprehensive-guide': { 
    category: 'department', color: '#10B981', filters: { department: 'Defense' },
    relatedHubs: ['police-comprehensive-guide', 'railways-comprehensive-guide'],
    stats: { totalJobs: 25000, salaryRange: '₹21K–₹100K', selectionRate: '5–8%' }
  },
  'education-comprehensive-guide': { 
    category: 'department', color: '#10B981', filters: { department: 'Education' },
    relatedHubs: ['health-comprehensive-guide', 'bachelors-comprehensive-guide'],
    stats: { totalJobs: 18000, salaryRange: '₹21K–₹70K', selectionRate: '2–4%' }
  },
  'health-comprehensive-guide': { 
    category: 'department', color: '#10B981', filters: { department: 'Health' },
    relatedHubs: ['education-comprehensive-guide', 'bachelors-comprehensive-guide'],
    stats: { totalJobs: 12000, salaryRange: '₹21K–₹80K', selectionRate: '2–4%' }
  },
  'it-tech-comprehensive-guide': { 
    category: 'department', color: '#10B981', filters: { department: 'IT/Tech' },
    relatedHubs: ['bachelors-comprehensive-guide', '50-100k-comprehensive-guide'],
    stats: { totalJobs: 5000, salaryRange: '₹35K–₹150K', selectionRate: '1–3%' }
  },
  'finance-comprehensive-guide': { 
    category: 'department', color: '#10B981', filters: { department: 'Finance' },
    relatedHubs: ['banking-comprehensive-guide', '50-100k-comprehensive-guide'],
    stats: { totalJobs: 3000, salaryRange: '₹25K–₹100K', selectionRate: '1–2%' }
  },
  
  // Qualifications
  '12th-pass-comprehensive-guide': { 
    category: 'qualification', color: '#EF4444', filters: { qualification: '12th' },
    relatedHubs: ['ssc-comprehensive-guide', 'railways-comprehensive-guide', 'banking-comprehensive-guide'],
    stats: { totalJobs: 50000, salaryRange: '₹18K–₹45K', selectionRate: '1–3%' }
  },
  'bachelors-comprehensive-guide': { 
    category: 'qualification', color: '#EF4444', filters: { qualification: 'Bachelor' },
    relatedHubs: ['upsc-comprehensive-guide', 'it-tech-comprehensive-guide', '50-100k-comprehensive-guide'],
    stats: { totalJobs: 25000, salaryRange: '₹25K–₹70K', selectionRate: '0.5–2%' }
  },
  'diploma-comprehensive-guide': { 
    category: 'qualification', color: '#EF4444', filters: { qualification: 'Diploma' },
    relatedHubs: ['railways-comprehensive-guide', 'defense-comprehensive-guide', '30-50k-comprehensive-guide'],
    stats: { totalJobs: 15000, salaryRange: '₹18K–₹35K', selectionRate: '2–4%' }
  },
  'masters-comprehensive-guide': { 
    category: 'qualification', color: '#EF4444', filters: { qualification: 'Master' },
    relatedHubs: ['upsc-comprehensive-guide', 'it-tech-comprehensive-guide', 'education-comprehensive-guide'],
    stats: { totalJobs: 5000, salaryRange: '₹45K–₹75K', selectionRate: '0.08–1%' }
  },
  
  // Salaries
  '30-50k-comprehensive-guide': { 
    category: 'salary', color: '#3B82F6', filters: { salaryMin: 30000, salaryMax: 50000 },
    relatedHubs: ['banking-comprehensive-guide', 'diploma-comprehensive-guide', 'railways-comprehensive-guide'],
    stats: { totalJobs: 20000, salaryRange: '₹30K–₹50K', selectionRate: '1–3%' }
  },
  '50-100k-comprehensive-guide': { 
    category: 'salary', color: '#3B82F6', filters: { salaryMin: 50000, salaryMax: 100000 },
    relatedHubs: ['upsc-comprehensive-guide', 'it-tech-comprehensive-guide', 'bachelors-comprehensive-guide'],
    stats: { totalJobs: 10000, salaryRange: '₹50K–₹100K', selectionRate: '0.5–2%' }
  },
  '100k-plus-comprehensive-guide': { 
    category: 'salary', color: '#3B82F6', filters: { salaryMin: 100000 },
    relatedHubs: ['upsc-comprehensive-guide', 'it-tech-comprehensive-guide'],
    stats: { totalJobs: 1000, salaryRange: '₹100K+', selectionRate: '0.08–0.5%' }
  },
  '100k-comprehensive-guide': { 
    category: 'salary', color: '#3B82F6', filters: { salaryMin: 100000 },
    relatedHubs: ['upsc-comprehensive-guide', 'it-tech-comprehensive-guide'],
    stats: { totalJobs: 1000, salaryRange: '₹100K+', selectionRate: '0.08–0.5%' }
  },
  
  // Phase 2A
  '12th-pass-government-jobs-2026': { 
    category: 'qualification', color: '#EF4444', filters: { qualification: '12th' },
    relatedHubs: ['ssc-comprehensive-guide', 'railways-comprehensive-guide'],
    stats: { totalJobs: 50000, salaryRange: '₹18K–₹45K', selectionRate: '1–3%' }
  },
  'ssc-cgl-vs-upsc-ias-comparison-2026': { 
    category: 'exam', color: '#8B5CF6', filters: { exam: 'SSC' },
    relatedHubs: ['ssc-comprehensive-guide', 'upsc-comprehensive-guide'],
    stats: { totalJobs: 13500, salaryRange: '₹21K–₹250K', selectionRate: '0.5–2%' }
  },
  'diploma-government-jobs-2026': { 
    category: 'qualification', color: '#EF4444', filters: { qualification: 'Diploma' },
    relatedHubs: ['railways-comprehensive-guide', 'defense-comprehensive-guide'],
    stats: { totalJobs: 15000, salaryRange: '₹18K–₹35K', selectionRate: '2–4%' }
  },
  'government-jobs-vs-private-sector-2026': { 
    category: 'exam', color: '#8B5CF6', filters: {},
    relatedHubs: ['upsc-comprehensive-guide', 'banking-comprehensive-guide'],
    stats: { totalJobs: 150000, salaryRange: '₹18K–₹250K', selectionRate: '1–5%' }
  },
  'highest-paying-government-jobs-2026': { 
    category: 'salary', color: '#3B82F6', filters: { salaryMin: 50000 },
    relatedHubs: ['upsc-comprehensive-guide', 'it-tech-comprehensive-guide', '50-100k-comprehensive-guide'],
    stats: { totalJobs: 11000, salaryRange: '₹50K+', selectionRate: '0.3–2%' }
  },
  'customs-comprehensive-guide': { 
    category: 'department', color: '#10B981', filters: { department: 'Customs' },
    relatedHubs: ['police-comprehensive-guide', 'defense-comprehensive-guide'],
    stats: { totalJobs: 2000, salaryRange: '₹25K–₹100K', selectionRate: '1–2%' }
  },
};

async function main() {
  const hubDir = '/home/claude/jobs/public/hubs';
  const files = fs.readdirSync(hubDir)
    .filter(f => f.endsWith('.html') && f !== 'index.html' && !f.includes('expanded'))
    .sort();

  console.log(`Processing ${files.length} hub files...`);

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
    
    const title = $('title').text() || slug;
    const description = $('meta[name="description"]').attr('content') || '';
    
    // Extract body content, removing header/footer/script/style
    let bodyHtml = $('body').html() || '';
    bodyHtml = bodyHtml.replace(/<script[^>]*>.*?<\/script>/gis, '');
    bodyHtml = bodyHtml.replace(/<style[^>]*>.*?<\/style>/gis, '');
    // Remove duplicate header/footer if present
    bodyHtml = bodyHtml.replace(/<header[^>]*>.*?<\/header>/gis, '');
    bodyHtml = bodyHtml.replace(/<footer[^>]*>.*?<\/footer>/gis, '');
    
    hubs[slug] = {
      slug,
      title,
      keyword: title.substring(0, 80),
      description,
      content: bodyHtml.trim(),
      category: mapping.category,
      color: mapping.color,
      filters: mapping.filters,
      relatedHubs: mapping.relatedHubs || [],
      stats: mapping.stats || {},
    };

    console.log(`✓ ${slug}`);
  });

  // Generate TypeScript file
  const tsContent = `/**
 * Hub pages data — 33 hubs across 5 categories
 * Auto-generated from /public/hubs/*.html
 * Run: npm run generate:hubs-data
 */

export type HubCategory = 'qualification' | 'exam' | 'state' | 'department' | 'salary';

export interface Hub {
  slug: string;
  title: string;
  keyword: string;
  description: string;
  content: string; // HTML content body
  category: HubCategory;
  color: string; // Tailwind color or hex
  filters: Record<string, any>; // Supabase query filters
  relatedHubs: string[]; // Slugs of related hubs
  stats: Record<string, string | number>; // Display stats (total jobs, salary range, etc.)
}

export const hubs: Record<string, Hub> = ${JSON.stringify(hubs, null, 2)};

export function getHub(slug: string): Hub | undefined {
  return hubs[slug];
}

export function getHubsByCategory(category: HubCategory): Hub[] {
  return Object.values(hubs).filter(h => h.category === category);
}

export function getAllHubs(): Hub[] {
  return Object.values(hubs);
}
`;

  const outputPath = '/home/claude/jobs/src/data/hubs.ts';
  fs.writeFileSync(outputPath, tsContent);
  console.log(`\n✓ Generated ${outputPath}`);
  console.log(`  Total hubs: ${Object.keys(hubs).length}`);
}

main().catch(console.error);
