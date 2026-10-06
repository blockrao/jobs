import { pageSeo } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use – JobOye",
  description: "Terms of use for the JobOye website.",
  ...pageSeo("/terms"),
  openGraph: {
    title: "Terms of Use – JobOye",
    description: "Terms governing use of the JobOye website.",
    url: "https://www.joboye.com/terms",
    siteName: "JobOye",
    type: "website",
  },
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Terms of Use</h1>
      <p className="text-sm text-neutral-500 mb-8">Last updated: October 2026</p>

      <section className="prose prose-neutral max-w-none space-y-4 text-neutral-700">
        <p>
          By using this website, you agree to these terms. If you do not agree, please
          do not use the site.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">Informational purpose only</h2>
        <p>
          JobOye provides information about government job notifications for general
          reference. The information is drawn from official sources but may contain
          errors or may become outdated after publication. You should always verify
          information against the official notification published by the recruiting body
          before taking any action, including submitting an application.
        </p>
        <p>
          JobOye is not affiliated with any government department, commission, board,
          or agency. Use of this site does not constitute an application for any
          government position.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">No warranties</h2>
        <p>
          The site and its contents are provided &ldquo;as is&rdquo; without any
          warranty, express or implied. We do not warrant the accuracy, completeness,
          or timeliness of any information on the site. We are not liable for any loss
          or damage arising from your use of, or reliance on, information on this site.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">Acceptable use</h2>
        <p>
          You may use JobOye for personal, non-commercial informational purposes. You
          may not scrape, copy, redistribute, or republish the site&apos;s content in
          bulk. You may not use the site in any way that is unlawful or harmful.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">Intellectual property</h2>
        <p>
          The JobOye name, logo, and original written content are the property of
          JobOye. Information derived from official government notifications is in the
          public domain. Third-party trademarks belong to their respective owners.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">Links to other websites</h2>
        <p>
          JobOye links to official government websites and recruitment portals. We are
          not responsible for the content or availability of any external site.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">Changes to these terms</h2>
        <p>
          We may update these terms from time to time. Continued use of the site after
          changes are posted constitutes your acceptance of the updated terms.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">Governing law</h2>
        <p>
          These terms are governed by the laws of India. Any disputes arising from
          use of this site are subject to the jurisdiction of Indian courts.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">Contact</h2>
        <p>
          For questions about these terms, write to{" "}
          <a href="mailto:contact@joboye.com" className="underline hover:text-neutral-900">
            contact@joboye.com
          </a>
          .
        </p>
      </section>
    </main>
  );
}
