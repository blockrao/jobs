import { pageSeo } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About JobOye",
  description:
    "JobOye is an independent platform that aggregates government job notifications from official sources across India, helping job seekers find and track recruitment opportunities.",
  ...pageSeo("/about"),
  openGraph: {
    title: "About JobOye",
    description:
      "JobOye is an independent platform that aggregates government job notifications from official sources across India.",
    url: "https://www.joboye.com/about",
    siteName: "JobOye",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About JobOye",
    description: "JobOye is an independent platform that aggregates government job notifications from official sources across India.",
  },
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">About JobOye</h1>

      <section className="prose prose-neutral max-w-none space-y-4 text-neutral-700">
        <p>
          JobOye is an independent information platform dedicated to helping job seekers
          across India discover government recruitment opportunities. We track official
          notifications from central and state government bodies — commissions, courts,
          boards, railways, banks, defence services, and more — and present them in a
          clear, consistent format.
        </p>

        <p>
          Our goal is to make it easier to find relevant openings, understand eligibility
          and fees at a glance, and never miss an application deadline.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">How we work</h2>
        <p>
          Every job listing on JobOye is sourced from the official recruitment notification
          published by the hiring authority. We display the facts as stated in those
          documents: post name, vacancies, age limits, educational qualifications,
          application fee, selection process, and key dates.
        </p>
        <p>
          We review each notification before publishing. Where a notification is ambiguous
          or a field cannot be reliably determined, we leave it blank rather than guess.
          We update postings when official addenda or corrigenda are issued.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">Editorial policy</h2>
        <p>
          JobOye is not affiliated with any government department, commission, or agency.
          We do not accept payment to list or promote any vacancy. The information on this
          site is provided for informational purposes only — always verify details against
          the official notification before applying.
        </p>
        <p>
          If you spot an error, please use the &ldquo;Report an error&rdquo; link on the
          relevant job page, or{" "}
          <a href="/contact" className="underline hover:text-neutral-900">
            contact us
          </a>
          .
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">Coverage</h2>
        <p>
          We currently cover government recruitments notified in English and Hindi across
          all Indian states and union territories, with a focus on central government and
          large state-level recruitments. Coverage of smaller district and local body
          recruitments is growing.
        </p>
      </section>
    </main>
  );
}
