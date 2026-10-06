import { pageSeo } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy – JobOye",
  description: "JobOye privacy policy: what data we collect, how we use it, and your rights.",
  ...pageSeo("/privacy"),
  openGraph: {
    title: "Privacy Policy – JobOye",
    description: "What data JobOye collects, how we use it, and your rights.",
    url: "https://www.joboye.com/privacy",
    siteName: "JobOye",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy – JobOye",
    description: "What data JobOye collects, how we use it, and your rights.",
  },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-neutral-500 mb-8">Last updated: October 2026</p>

      <section className="prose prose-neutral max-w-none space-y-4 text-neutral-700">
        <p>
          This policy explains what information JobOye collects when you use our website,
          how we use it, and the choices you have.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">Information we collect</h2>
        <p>
          <strong>Usage data.</strong> When you visit JobOye, our hosting provider
          automatically records standard server logs: your IP address, browser type,
          referring page, pages visited, and the date and time of each request. We use
          this to understand aggregate traffic patterns and to diagnose technical issues.
        </p>
        <p>
          <strong>Analytics.</strong> We use privacy-respecting analytics to count page
          views and understand which content is most useful. This does not track you
          across other websites.
        </p>
        <p>
          <strong>Cookies.</strong> We store a small preference cookie to remember your
          language choice (English or Hindi). We do not use advertising cookies or
          third-party tracking cookies.
        </p>
        <p>
          <strong>Emails you send us.</strong> If you contact us by email, we keep your
          message and email address to respond to you and to track corrections.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">How we use your information</h2>
        <p>
          We use the information described above to operate and improve the website, to
          respond to enquiries, and to fulfil legal obligations. We do not sell personal
          data. We do not share personal data with third parties except where required
          by law or where necessary to operate the service (for example, our hosting
          provider processes server logs on our behalf).
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">Data retention</h2>
        <p>
          Server logs are retained for up to 30 days. Correction emails are kept for
          as long as they are relevant to an open or recently resolved issue, after which
          they are deleted.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">Your rights</h2>
        <p>
          You can request access to, correction of, or deletion of any personal data we
          hold about you by writing to{" "}
          <a href="mailto:contact@joboye.com" className="underline hover:text-neutral-900">
            contact@joboye.com
          </a>
          . We will respond within 30 days.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">Changes to this policy</h2>
        <p>
          We may update this policy from time to time. Material changes will be noted
          by updating the date at the top of this page.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">Contact</h2>
        <p>
          For privacy-related questions, write to{" "}
          <a href="mailto:contact@joboye.com" className="underline hover:text-neutral-900">
            contact@joboye.com
          </a>
          .
        </p>
      </section>
    </main>
  );
}
