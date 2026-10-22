import type { Metadata } from "next";
import Link from "next/link";
import { pageSeo } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { buildBreadcrumbSchema, jsonLdGraph } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Government Jobs by Location | Delhi, Maharashtra, State-wise Guide",
  description: "Government jobs by location. Find state-wise government job opportunities. Delhi, Maharashtra, and all states guide to recruitment, MPSC, state PSC, local jobs.",
  ...pageSeo(`${SITE_URL}/government-jobs/by-location`, { index: true }),
};

export default function GovernmentJobsByLocationPage() {
  const schema = jsonLdGraph(
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Government Jobs by Location", path: "/government-jobs/by-location" },
    ]),
  );

  const majorStates = [
    { name: "Delhi", slug: "delhi-government-jobs", vacancies: "50,000+/year", advantage: "Capital city, highest salaries" },
    { name: "Maharashtra", slug: "maharashtra-government-jobs", vacancies: "40,000+/year", advantage: "Economic hub, banking/PSU jobs" },
    { name: "Uttar Pradesh", slug: "state-wise-guide-coming", vacancies: "60,000+/year", advantage: "Largest state, most vacancies" },
    { name: "Tamil Nadu", slug: "state-wise-guide-coming", vacancies: "30,000+/year", advantage: "High education level" },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-6">Government Jobs by Location</h1>
        
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Choose Your Location</h2>
          <p className="mb-6 text-gray-700">Government job opportunities vary significantly by location. Some states offer more vacancies, higher salaries, or better career growth. Select your preferred location to explore job opportunities, exams, and salary prospects.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {majorStates.map((state) => (
              <Link
                key={state.slug}
                href={`/government-jobs/${state.slug}`}
                className="block p-6 border border-gray-200 rounded-lg hover:shadow-lg hover:border-blue-300 transition-all"
              >
                <h3 className="text-xl font-bold text-blue-600 mb-2">{state.name}</h3>
                <p className="text-gray-600 mb-2">{state.advantage}</p>
                <p className="text-sm text-green-600"><strong>Annual Vacancies:</strong> {state.vacancies}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-4">How Location Affects Your Government Job</h2>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Salary Variations</h3>
              <p className="text-sm">Same grade, different states: Delhi pays 30-50% more allowances than rural areas. Grade D salary ranges ₹18,000 (rural) to ₹25,000 (Delhi).</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Exam Difficulty</h3>
              <p className="text-sm">Some state PSCs are easier (less competition), some harder (more candidates). National exams (UPSC, SSC) uniform difficulty.</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Career Growth</h3>
              <p className="text-sm">Large states (UP, Maharashtra) have more senior positions available. Small states may have fewer promotion opportunities.</p>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Quality of Life</h3>
              <p className="text-sm">Metro cities (Delhi, Mumbai) high cost of living but better infrastructure. Tier-2 cities balanced. Rural areas lower costs but limited amenities.</p>
            </div>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-4">Related Resources</h2>
          <ul className="list-disc pl-6 text-blue-600 underline space-y-2">
            <li><a href="/government-jobs/delhi-government-jobs">Delhi Government Jobs</a></li>
            <li><a href="/government-jobs/maharashtra-government-jobs">Maharashtra Government Jobs</a></li>
            <li><a href="/salary-guides/government-job-salary-by-grade">Salary by Grade (All India)</a></li>
          </ul>
        </section>
      </main>
    </>
  );
}
