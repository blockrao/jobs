import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { buildBreadcrumbSchema, buildFAQSchema, jsonLdGraph } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Maharashtra Government Jobs 2025 | MPSC, SSC, Railway, State Jobs",
  description: "Maharashtra government jobs: MPSC State PSC, SSC, railway, banking, PSU recruitment. Mumbai, Pune, and all Maharashtra state vacancies.",
  ...pageSeo(`${SITE_URL}/government-jobs/maharashtra-government-jobs`, { index: true }),
};

export default function MaharashtraGovernmentJobsPage() {
  const schema = jsonLdGraph(
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Government Jobs", path: "/government-jobs" },
      { name: "Maharashtra Jobs", path: "/government-jobs/maharashtra-government-jobs" },
    ]),
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-6">Government Jobs in Maharashtra</h1>
        
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 border-b-2 border-green-600 pb-2">Maharashtra Government Opportunities</h2>
          <p className="mb-4">Maharashtra is India's economic hub with highest concentration of government and PSU jobs. MPSC (Maharashtra Public Service Commission) conducts major recruitment for state administrative positions.</p>
          
          <div className="space-y-6">
            <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-600">
              <h3 className="font-bold text-lg mb-2">MPSC (Maharashtra PSC)</h3>
              <p className="text-sm">State-level civil service exam. Officers become district collectors, deputy secretaries in state government.</p>
              <p className="text-sm mt-2"><strong>Salary:</strong> ₹45,000-80,000/month | <strong>Upper Age Limit:</strong> 42-45 years</p>
            </div>

            <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-600">
              <h3 className="font-bold text-lg mb-2">SSC (Central Exams)</h3>
              <p className="text-sm">SSC CGL, CHSL for Mumbai/Maharashtra postings. All-India recruitment but candidates can get Maharashtra postings.</p>
              <p className="text-sm mt-2"><strong>Vacancies:</strong> 5,000+/year in Maharashtra region</p>
            </div>

            <div className="bg-purple-50 p-6 rounded-lg border-l-4 border-purple-600">
              <h3 className="font-bold text-lg mb-2">Railway Recruitment</h3>
              <p className="text-sm">RRB Central Railway (Mumbai HQ), South Central Railway (Secunderabad). Highest recruitment in Western India.</p>
              <p className="text-sm mt-2"><strong>Salary:</strong> ₹25,000-50,000/month</p>
            </div>

            <div className="bg-amber-50 p-6 rounded-lg border-l-4 border-amber-600">
              <h3 className="font-bold text-lg mb-2">Banking & Insurance</h3>
              <p className="text-sm">SBI, IBPS, LIC, GIC major offices in Mumbai. Banking sector largest employer in Maharashtra.</p>
              <p className="text-sm mt-2"><strong>Salary:</strong> ₹21,000-70,000/month depending on grade</p>
            </div>

            <div className="bg-red-50 p-6 rounded-lg border-l-4 border-red-600">
              <h3 className="font-bold text-lg mb-2">State Government Departments</h3>
              <p className="text-sm">PWD, Education, Health, Police, Municipal corporations across 36 districts.</p>
              <p className="text-sm mt-2"><strong>Annual Vacancies:</strong> 10,000+ across state</p>
            </div>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-6 border-b-2 border-green-600 pb-2">Why Maharashtra for Government Jobs?</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Largest economy:</strong> Highest salaries and allowances in India</li>
            <li><strong>Major cities:</strong> Mumbai, Pune with best infrastructure and quality of life</li>
            <li><strong>Career growth:</strong> Large cadre size means fast promotions</li>
            <li><strong>Industries:</strong> Cross-sector growth in banking, IT, manufacturing</li>
          </ul>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-6 border-b-2 border-green-600 pb-2">FAQs</h2>
          <details className="bg-gray-100 rounded-lg p-4 mb-3">
            <summary className="font-semibold cursor-pointer">Do I need to be Maharashtra resident for MPSC?</summary>
            <p className="mt-2 text-sm text-gray-700">Technically no, but MPSC prioritizes Maharashtra residents. Non-residents can appear but have lower chances of state posting.</p>
          </details>
          <details className="bg-gray-100 rounded-lg p-4 mb-3">
            <summary className="font-semibold cursor-pointer">What's the salary for MPSC State Officer?</summary>
            <p className="mt-2 text-sm text-gray-700">Entry: ₹45,000/month, Peak (Chief Secretary): ₹250,000+/month. Same structure as UPSC IAS.</p>
          </details>
        </section>
      </main>
    </>
  );
}
