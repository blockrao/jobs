import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostingBySlug } from "@/lib/queries";
import {
  buildBreadcrumbSchema,
  buildExamEventSchema,
  buildFAQSchema,
  buildJobPostingSchema,
  isHiringOpen,
  jsonLdGraph,
} from "@/lib/structured-data";
import { absoluteUrl } from "@/lib/site";
import {
  EMPLOYMENT_TYPE_LABELS,
  KIND_LABELS,
  STAGE_LABELS,
  WORKPLACE_TYPE_LABELS,
  formatCurrencyRange,
  formatDate,
} from "@/lib/labels";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const posting = await getPostingBySlug(slug);
  if (!posting) return {};

  const title = `${posting.title} — ${posting.organization.name}`;
  const description =
    posting.description.length > 155
      ? `${posting.description.slice(0, 152)}...`
      : posting.description;

  return {
    title,
    description,
    alternates: { canonical: `/jobs/${posting.slug}` },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/jobs/${posting.slug}`),
      type: "article",
    },
  };
}

function buildFaqs(posting: NonNullable<Awaited<ReturnType<typeof getPostingBySlug>>>) {
  const faqs: { question: string; answer: string }[] = [];
  if (posting.totalVacancies) {
    faqs.push({
      question: `How many vacancies are there in ${posting.title}?`,
      answer: `${posting.title} has ${posting.totalVacancies} vacancies announced by ${posting.organization.name}.`,
    });
  }
  if (posting.eligibility) {
    faqs.push({
      question: `What is the eligibility for ${posting.title}?`,
      answer: posting.eligibility,
    });
  }
  if (posting.validThrough) {
    faqs.push({
      question: `What is the last date to apply for ${posting.title}?`,
      answer: `The last date to apply is ${formatDate(posting.validThrough)}. Always confirm on the official notification before the deadline.`,
    });
  }
  if (posting.applicationFeeGeneral != null) {
    faqs.push({
      question: `What is the application fee for ${posting.title}?`,
      answer: `The application fee is ₹${posting.applicationFeeGeneral} for general category${
        posting.applicationFeeReserved != null
          ? ` and ₹${posting.applicationFeeReserved} for reserved categories`
          : ""
      }.`,
    });
  }
  return faqs;
}

export default async function JobPage({ params }: Props) {
  const { slug } = await params;
  const posting = await getPostingBySlug(slug);
  if (!posting) notFound();

  const org = posting.organization;
  const hiringOpen = isHiringOpen(posting.currentStage);
  const faqs = buildFaqs(posting);
  const timeline = [...posting.updates].sort(
    (a, b) => a.eventDate.getTime() - b.eventDate.getTime(),
  );
  const relatedArticles = posting.postingArticles.map((pa: any) => pa.article);
  const kindPath = posting.kind === "GOVERNMENT" ? "GOVERNMENT" : "PRIVATE";

  const schema = jsonLdGraph(
    buildJobPostingSchema(posting, org),
    buildExamEventSchema(posting),
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: KIND_LABELS[posting.kind], path: `/jobs?kind=${kindPath}` },
      { name: org.name, path: `/organizations/${org.slug}` },
      { name: posting.title, path: `/jobs/${posting.slug}` },
    ]),
    buildFAQSchema(faqs),
  );

  const salaryText = formatCurrencyRange(
    posting.salaryMin,
    posting.salaryMax,
    posting.salaryCurrency ?? "INR",
    posting.salaryPeriod ?? "MONTH",
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-neutral-500">
        <Link href="/" className="hover:underline">
          Home
        </Link>{" "}
        /{" "}
        {posting.canonicalPosition && (
          <>
            <Link href={`/positions/${posting.canonicalPosition.slug}`} className="hover:underline">
              {posting.canonicalPosition.name}
            </Link>
            {" / "}
          </>
        )}
        {posting.canonicalRecruitment && (
          <>
            <Link href={`/recruitments/${posting.canonicalRecruitment.slug}`} className="hover:underline">
              {posting.canonicalRecruitment.name}
            </Link>
            {" / "}
          </>
        )}
        <Link href={`/jobs?kind=${kindPath}`} className="hover:underline">
          {KIND_LABELS[posting.kind]} Jobs
        </Link>{" "}
        /{" "}
        <Link
          href={`/organizations/${org.slug}`}
          className="hover:underline"
        >
          {org.name}
        </Link>
      </nav>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-medium text-white">
          {KIND_LABELS[posting.kind]}
        </span>
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
          {STAGE_LABELS[posting.currentStage] ?? posting.currentStage}
        </span>
      </div>

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        {posting.title}
      </h1>
      <p className="mt-1 text-neutral-600">
        <Link href={`/organizations/${org.slug}`} className="hover:underline">
          {org.name}
        </Link>
        {posting.locationCity ? ` · ${posting.locationCity}` : ""}
        {posting.locationRegion ? `, ${posting.locationRegion}` : ""}
      </p>

      {!hiringOpen && (
        <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This recruitment has moved past the application stage (
          {STAGE_LABELS[posting.currentStage]}). Details below are kept for
          reference — see the timeline for the latest update.
        </div>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-black/10 p-4 text-sm sm:grid-cols-3">
        {posting.totalVacancies != null && (
          <div>
            <dt className="text-neutral-500">Vacancies</dt>
            <dd className="font-medium">{posting.totalVacancies}</dd>
          </div>
        )}
        {posting.postNames && posting.postNames.length > 0 && (
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-neutral-500">Post(s)</dt>
            <dd className="font-medium">{posting.postNames.join(", ")}</dd>
          </div>
        )}
        <div>
          <dt className="text-neutral-500">Employment Type</dt>
          <dd className="font-medium">
            {EMPLOYMENT_TYPE_LABELS[posting.employmentType]}
          </dd>
        </div>
        <div>
          <dt className="text-neutral-500">Work Mode</dt>
          <dd className="font-medium">
            {WORKPLACE_TYPE_LABELS[posting.workplaceType]}
          </dd>
        </div>
        {salaryText && (
          <div>
            <dt className="text-neutral-500">
              {posting.kind === "GOVERNMENT" ? "Pay Scale" : "Salary"}
            </dt>
            <dd className="font-medium">{salaryText}</dd>
          </div>
        )}
        {(posting.ageLimitMin || posting.ageLimitMax) && (
          <div>
            <dt className="text-neutral-500">Age Limit</dt>
            <dd className="font-medium">
              {posting.ageLimitMin ?? "—"}–{posting.ageLimitMax ?? "—"} yrs
            </dd>
          </div>
        )}
        {posting.applicationFeeGeneral != null && (
          <div>
            <dt className="text-neutral-500">Application Fee</dt>
            <dd className="font-medium">₹{posting.applicationFeeGeneral}</dd>
          </div>
        )}
        {posting.datePosted && (
          <div>
            <dt className="text-neutral-500">Posted On</dt>
            <dd className="font-medium">{formatDate(posting.datePosted)}</dd>
          </div>
        )}
        {posting.validThrough && (
          <div>
            <dt className="text-neutral-500">Last Date to Apply</dt>
            <dd className="font-medium">{formatDate(posting.validThrough)}</dd>
          </div>
        )}
        {posting.examDate && (
          <div>
            <dt className="text-neutral-500">Exam Date</dt>
            <dd className="font-medium">{formatDate(posting.examDate)}</dd>
          </div>
        )}
      </dl>

      <div className="mt-6 flex flex-wrap gap-3">
        {posting.applyUrl && hiringOpen && (
          <a
            href={posting.applyUrl}
            target="_blank"
            rel="noopener nofollow"
            className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700"
          >
            Apply Now
          </a>
        )}
        {posting.officialNotificationUrl && (
          <a
            href={posting.officialNotificationUrl}
            target="_blank"
            rel="noopener nofollow"
            className="rounded-md border border-black/20 px-5 py-2.5 text-sm font-semibold hover:bg-neutral-50"
          >
            Official Notification (PDF)
          </a>
        )}
      </div>

      {timeline.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Timeline</h2>
          <ol className="mt-3 space-y-3 border-l border-black/10 pl-4">
            {timeline.map((update) => (
              <li key={update.id}>
                <p className="text-xs text-neutral-500">
                  {formatDate(update.eventDate)}
                </p>
                <p className="font-medium">
                  {STAGE_LABELS[update.stage] ?? update.stage}: {update.title}
                </p>
                {update.description && (
                  <p className="text-sm text-neutral-600">
                    {update.description}
                  </p>
                )}
                {update.linkUrl && (
                  <a
                    href={update.linkUrl}
                    target="_blank"
                    rel="noopener nofollow"
                    className="text-sm text-neutral-900 underline"
                  >
                    View
                  </a>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="prose prose-neutral mt-10 max-w-none">
        <h2 className="text-lg font-semibold">Overview</h2>
        <p className="whitespace-pre-line">{posting.description}</p>

        {posting.eligibility && (
          <>
            <h2 className="text-lg font-semibold">Eligibility</h2>
            <p className="whitespace-pre-line">{posting.eligibility}</p>
          </>
        )}

        {posting.responsibilities && (
          <>
            <h2 className="text-lg font-semibold">Responsibilities</h2>
            <p className="whitespace-pre-line">{posting.responsibilities}</p>
          </>
        )}

        {posting.requirements && (
          <>
            <h2 className="text-lg font-semibold">Requirements</h2>
            <p className="whitespace-pre-line">{posting.requirements}</p>
          </>
        )}
      </section>

      {faqs.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Frequently Asked Questions</h2>
          <div className="mt-3 space-y-4">
            {faqs.map((faq) => (
              <div key={faq.question}>
                <p className="font-medium">{faq.question}</p>
                <p className="text-sm text-neutral-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {relatedArticles.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Related Guides</h2>
          <ul className="mt-3 space-y-2">
            {relatedArticles.map((article: any) => (
              <li key={article.id}>
                <Link
                  href={`/articles/${article.slug}`}
                  className="font-medium text-neutral-900 underline hover:no-underline"
                >
                  {article.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Related Canonical Hubs */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Related Information</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Canonical Position Hub - if v2 post is linked */}
          {posting.canonicalPosition && (
            <Link
              href={`/positions/${posting.canonicalPosition.slug}`}
              className="rounded-lg border border-blue-200 bg-blue-50 p-4 hover:bg-blue-100"
            >
              <div className="font-semibold text-blue-900">📍 {posting.canonicalPosition.name}</div>
              <div className="text-sm text-blue-700">
                View all recruitment campaigns for this position
              </div>
            </Link>
          )}

          {/* Canonical Recruitment Hub - if v2 recruitment is linked */}
          {posting.canonicalRecruitment && (
            <Link
              href={`/recruitments/${posting.canonicalRecruitment.slug}`}
              className="rounded-lg border border-green-200 bg-green-50 p-4 hover:bg-green-100"
            >
              <div className="font-semibold text-green-900">🎯 {posting.canonicalRecruitment.name}</div>
              <div className="text-sm text-green-700">
                View recruitment timeline and all posts
              </div>
            </Link>
          )}

          {/* Organization Hub */}
          <Link
            href={`/organizations/${org.slug}`}
            className="rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50"
          >
            <div className="font-semibold text-neutral-900">{org.name}</div>
            <div className="text-sm text-neutral-600">View all campaigns and exams</div>
          </Link>

          {/* Exam Hub - if exam is linked */}
          {posting.exam && (
            <Link
              href={`/exams/${posting.exam.slug}`}
              className="rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50"
            >
              <div className="font-semibold text-neutral-900">{posting.exam.label}</div>
              <div className="text-sm text-neutral-600">
                View exam details and other campaigns
              </div>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
