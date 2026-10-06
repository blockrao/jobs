import { pageSeo } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact – JobOye",
  description: "Get in touch with JobOye to report an error, suggest a missing recruitment, or ask a question.",
  ...pageSeo("/contact"),
  openGraph: {
    title: "Contact JobOye",
    description: "Report errors, suggest missing recruitments, or ask a question.",
    url: "https://www.joboye.com/contact",
    siteName: "JobOye",
    type: "website",
  },
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Contact</h1>

      <section className="space-y-4 text-neutral-700">
        <p>
          We welcome corrections, suggestions and feedback. The best way to reach us
          depends on what you need:
        </p>

        <div className="rounded-lg border border-black/10 p-5 space-y-3">
          <h2 className="font-semibold text-neutral-900">Report an error on a job page</h2>
          <p className="text-sm">
            Use the &ldquo;Report an error&rdquo; link at the bottom of the relevant
            job page. Include the field that is wrong and the correct value from the
            official notification, along with a link to the notification PDF if possible.
          </p>
        </div>

        <div className="rounded-lg border border-black/10 p-5 space-y-3">
          <h2 className="font-semibold text-neutral-900">Suggest a missing recruitment</h2>
          <p className="text-sm">
            Email us at{" "}
            <a
              href="mailto:contact@joboye.com"
              className="underline hover:text-neutral-900"
            >
              contact@joboye.com
            </a>{" "}
            with the subject &ldquo;Missing recruitment&rdquo;. Please include the name
            of the recruiting body and a link to the official notification.
          </p>
        </div>

        <div className="rounded-lg border border-black/10 p-5 space-y-3">
          <h2 className="font-semibold text-neutral-900">Other enquiries</h2>
          <p className="text-sm">
            For anything else, write to{" "}
            <a
              href="mailto:contact@joboye.com"
              className="underline hover:text-neutral-900"
            >
              contact@joboye.com
            </a>
            . We aim to respond within two business days.
          </p>
        </div>

        <p className="text-sm text-neutral-500 pt-2">
          JobOye is not affiliated with any government department or agency. We cannot
          help with application status, admit cards, result queries, or any issue with
          an official recruitment portal. Please contact the recruiting body directly
          for those.
        </p>
      </section>
    </main>
  );
}
