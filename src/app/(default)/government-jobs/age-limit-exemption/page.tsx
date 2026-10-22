/**
 * Government Jobs Age Limit Exemption Page
 */

import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { buildBreadcrumbSchema, buildFAQSchema, jsonLdGraph } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Government Jobs Age Limit Exemption | Military Service, Government Service",
  description: "Age limit exemptions for government jobs. Military service exemption, government service exemption, and other categories that exempt candidates from age restrictions.",
  ...pageSeo(`${SITE_URL}/government-jobs/age-limit-exemption`, { index: true }),
};

const pageContent = {
  title: "Government Jobs Age Limit Exemption",
  sections: [
    {
      id: "intro",
      title: "Who Gets Age Limit Exemption?",
      content: (
        <div className="space-y-4">
          <p>Certain candidates get complete exemption from age limits in government exams based on their service or special status. This is different from relaxation (which adds years) — exemption means the age limit doesn't apply at all.</p>
        </div>
      ),
    },
    {
      id: "exemptions",
      title: "Categories Getting Age Limit Exemption",
      content: (
        <div className="space-y-6">
          <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-600">
            <h3 className="font-bold text-lg mb-2">Defence Service/Ex-Servicemen (DOS)</h3>
            <p className="text-sm">Officers commissioned from defence service can appear for civil service exams till age 50. Maximum age exemption available in government recruitment.</p>
          </div>

          <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-600">
            <h3 className="font-bold text-lg mb-2">Government Officials</h3>
            <p className="text-sm">Serving government employees seeking promotion or transfer across departments often get age limit exemption or significant relaxation (varies by state/central rules).</p>
          </div>

          <div className="bg-purple-50 p-6 rounded-lg border-l-4 border-purple-600">
            <h3 className="font-bold text-lg mb-2">Freedom Fighters & Kin</h3>
            <p className="text-sm">Families of freedom fighters, especially from pre-1947 independence struggle, may get age exemption in certain state government exams.</p>
          </div>

          <div className="bg-amber-50 p-6 rounded-lg border-l-4 border-amber-600">
            <h3 className="font-bold text-lg mb-2">State-Specific Exemptions</h3>
            <p className="text-sm">Some states exempt local candidates, candidates from border areas, flood-affected regions, or other categories. Check your state PSC notification.</p>
          </div>
        </div>
      ),
    },
    {
      id: "how-prove",
      title: "How to Claim Age Exemption",
      content: (
        <div className="space-y-4">
          <ol className="list-decimal pl-6 space-y-2 text-sm">
            <li>Check the exam notification for exemption clause</li>
            <li>Gather required proof documents (service certificate, government ID, etc.)</li>
            <li>Mention exemption category during application</li>
            <li>Upload proof as per exam requirement</li>
            <li>Present original documents during verification</li>
          </ol>
        </div>
      ),
    },
  ],
  faqs: [
    {
      question: "Can DOS (ex-defence officer) appear for any age?",
      answer: "DOS can appear till age 50 for most civil service exams. However, some exams (like SSC) may have specific age limits even for DOS. Always verify notification.",
    },
    {
      question: "Do serving government employees get automatic exemption?",
      answer: "Not automatic. It depends on the specific exam and promotion rules. Some promotions offer exemption, some don't. Check your department promotion guidelines.",
    },
    {
      question: "Is age exemption the same across all states?",
      answer: "No. Union exams (UPSC, SSC) have uniform rules. State exams (State PSC) vary significantly. Check your state PSC's official notification.",
    },
  ],
};

export default function AgeLimitExemptionPage() {
  const schema = jsonLdGraph(
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Government Jobs", path: "/government-jobs" },
      { name: "Age Limit Exemption", path: "/government-jobs/age-limit-exemption" },
    ]),
    buildFAQSchema(pageContent.faqs),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-6">{pageContent.title}</h1>

        {pageContent.sections.map((section) => (
          <section key={section.id} id={section.id} className="mb-12">
            <h2 className="text-2xl font-bold mb-4 border-b-2 border-amber-600 pb-2">{section.title}</h2>
            <div className="prose prose-lg max-w-none">
              {section.content}
            </div>
          </section>
        ))}

        {/* FAQs */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-6 border-b-2 border-amber-600 pb-2">FAQs</h2>
          <div className="space-y-4">
            {pageContent.faqs.map((faq, idx) => (
              <details key={idx} className="bg-gray-100 rounded-lg p-4 cursor-pointer">
                <summary className="font-semibold">{faq.question}</summary>
                <p className="mt-3 text-sm text-gray-700">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
