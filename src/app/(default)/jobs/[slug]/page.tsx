/**
 * Canonical English job detail page — /jobs/[slug]
 *
 * This is the authoritative URL for every JobPosting: buildJobPostingSchema()
 * emits url: absoluteUrl(`/jobs/${slug}`) and @id: `${url}#jobposting`, so
 * Google's job-search crawler must find real content here. The [locale] mirror
 * at /hi/jobs/[slug] is the Hindi-only version; this page handles English only.
 *
 * JobPosting guidelines implemented:
 *  - One <JobPosting> per page, title = postNames[0] (the extracted job title,
 *    never the scraped headline).
 *  - jobLocation.addressLocality populated from locationCity so local job
 *    searches ("jobs in Jaipur") match this posting.
 *  - totalJobOpenings carries the aggregate vacancy count for multi-post
 *    notices (postNames.length > 1).
 *  - directApply=true only when applyUrl is on-site.
 *  - validThrough prevents stale listings from appearing in Google Jobs after
 *    the deadline.
 *  - baseSalary in INR with MONTH period for pay-scale visibility.
 *  - FAQPage schema co-emitted for rich snippets.
 *  - BreadcrumbList schema for site hierarchy signals.
 *  - ExamEvent schema when examDate is set.
 *  - hiringOrganization links to the Organization @id node.
 */
import { buildNoticeFaqs, buildNoticeTimeline, type NoticeFacts } from "@/lib/content/notice-faqs";
import { publicLink, stripAggregatorTag } from "@/lib/aggregators";
import { getStateBySlug } from "@/lib/states/states";
import { pageSeo } from "@/lib/seo";
import { cutAtWord, composeJobMetaDescription, composeJobMetaTitle } from "@/lib/seo/meta-title";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostingBySlug } from "@/lib/queries";
import { safeQuery } from "@/lib/safe-query";
import {
  buildBreadcrumbSchema,
  buildExamEventSchema,
  buildFAQSchema,
  buildJobPostingSchema,
  isHiringOpen,
  jsonLdGraph,
} from "@/lib/structured-data";
import {
  EMPLOYMENT_TYPE_LABELS,
  KIND_LABELS,
  STAGE_LABELS,
  WORKPLACE_TYPE_LABELS,
  formatAgeRange,
  formatCurrencyRange,
  formatDate,
  formatFee,
  vacanciesPhrase,
} from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { InfoCard } from "@/components/ui/info-card";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

function plainTextSnippet(html: string, repeatOf: string, maxLen = 155): string {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const deduped = text.toLowerCase().startsWith(repeatOf.toLowerCase())
    ? text.slice(repeatOf.length).replace(/^[\s.:–-]+/, "")
    : text;
  return cutAtWord(deduped, maxLen);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const posting = await safeQuery(() => getPostingBySlug(slug), null);
  if (!posting) return {};

  const org = posting.organization;
  const title = composeJobMetaTitle(posting.title, [org.name]);
  const factsDescription = composeJobMetaDescription({
    postName: posting.postNames?.[0]?.trim() || null,
    orgName: org.name,
    vacancies: posting.totalVacancies,
    lastDate: posting.validThrough ? formatDate(posting.validThrough, "en-IN") : null,
  });
  const description = factsDescription ?? plainTextSnippet(posting.description, posting.title);

  // This is the canonical English page — use pageSeo (single-language,
  // no locale branching). hreflang is emitted by the sitemap, not here.
  const seo = pageSeo(`/jobs/${slug}`);
  const ogImages = [{ url: "/og-default.png", width: 1200, height: 630, alt: "JobOye government jobs" }];

  return {
    title,
    description,
    alternates: seo.alternates,
    robots: seo.robots,
    openGraph: {
      title,
      description,
      url: `/jobs/${slug}`,
      type: "article",
      images: ogImages,
    },
    twitter: { card: "summary_large_image", title, description, images: ogImages.map((i) => i.url) },
  };
}

function buildFaqs(
  posting: NonNullable<Awaited<ReturnType<typeof getPostingBySlug>>>,
  displayTitle: string,
  displayOrgName: string,
  displayEligibility: string | null,
) {
  const faqs: { question: string; answer: string }[] = [];
  const t = posting.postNames?.[0]?.trim() || displayTitle;

  if (posting.totalVacancies) {
    faqs.push({
      question: `How many vacancies are there for ${t} at ${displayOrgName}?`,
      answer: `${displayOrgName} has announced ${vacanciesPhrase(posting.totalVacancies)} for ${t}.`,
    });
  }
  if (displayEligibility) {
    faqs.push({ question: `What is the eligibility for ${t}?`, answer: displayEligibility });
  }
  if (posting.validThrough) {
    const dateStr = formatDate(posting.validThrough, "en-IN");
    faqs.push({
      question: `What is the last date to apply for ${t}?`,
      answer: `The last date to apply is ${dateStr}. Always confirm on the official notification before the deadline.`,
    });
  }
  if (posting.applicationFeeGeneral != null) {
    faqs.push({
      question: `What is the application fee for ${t}?`,
      answer: `The application fee is ₹${posting.applicationFeeGeneral} for general category${
        posting.applicationFeeReserved != null
          ? ` and ₹${posting.applicationFeeReserved} for reserved categories`
          : ""
      }.`,
    });
  }
  const extra = ((posting as any).extraContent ?? null) as import("@/db/schema").ExtraContent | null;
  for (const f of extra?.faqs ?? []) {
    if (f.q && f.a && !faqs.some((x) => x.question === f.q)) faqs.push({ question: f.q, answer: f.a });
  }
  return faqs;
}

function recruitmentStatusLabel(
  stage: string,
  validThrough: Date | null,
  hiringOpen: boolean,
  applicationStartDate?: Date | null,
): { label: string; color: "green" | "amber" | "red" | "neutral" } {
  // If stage is APPLICATION_OPEN but the opening date is in the future, show
  // "Notification Out" — the window hasn't opened yet.
  if (stage === "APPLICATION_OPEN" && applicationStartDate && new Date() < new Date(applicationStartDate))
    return { label: "🟡 Notification Out – Applications Open Soon", color: "amber" };
  if (stage === "APPLICATION_OPEN" && hiringOpen)
    return { label: "🟢 Applications Open", color: "green" };
  if (stage === "APPLICATION_CLOSED" || (!hiringOpen && validThrough && new Date() > validThrough))
    return { label: "🔴 Applications Closed", color: "red" };
  if (stage === "NOTIFICATION_OUT")
    return { label: "🟡 Notification Out", color: "amber" };
  if (["EXAM_SCHEDULED", "EXAM_CONDUCTED", "ADMIT_CARD_RELEASED"].includes(stage))
    return { label: "📋 Exam Stage", color: "amber" };
  if (["RESULT_OUT", "MERIT_LIST_OUT", "FINAL_RESULT_OUT"].includes(stage))
    return { label: "✅ Result Available", color: "green" };
  if (stage === "INTERVIEW_SCHEDULED")
    return { label: "🗓️ Interview Scheduled", color: "amber" };
  return { label: "Status Unknown", color: "neutral" };
}

export default async function JobPage({ params }: Props) {
  const { slug } = await params;
  const posting = await safeQuery(() => getPostingBySlug(slug), null);
  if (!posting) notFound();

  const org = posting.organization;
  const orgHref = `/organizations/${org.slug}`;
  const stateHub = getStateBySlug((posting as any).stateSlug ?? "");
  const hiringOpen = isHiringOpen(posting.currentStage, posting.validThrough);
  const extraContent = ((posting as any).extraContent ?? null) as import("@/db/schema").ExtraContent | null;
  const faqs = buildFaqs(posting, posting.title, org.name, posting.eligibility);

  const noticeFacts: NoticeFacts = {
    id: posting.id,
    title: posting.title,
    org: org.name,
    vac: posting.totalVacancies ?? null,
    pay_min: posting.salaryMin ?? null,
    pay_max: posting.salaryMax ?? null,
    age_min: posting.ageLimitMin ?? null,
    age_max: posting.ageLimitMax ?? null,
    date_posted: posting.datePosted ? new Date(posting.datePosted).toISOString() : null,
    valid_through: posting.validThrough ? new Date(posting.validThrough).toISOString() : null,
    application_start: posting.canonicalRecruitment?.applicationStartDate
      ? new Date(posting.canonicalRecruitment.applicationStartDate).toISOString()
      : null,
    exam_date: posting.examDate ? new Date(posting.examDate).toISOString() : null,
    has_apply: Boolean(publicLink(posting.applyUrl)),
    post_names: ((posting.postNames as string[] | null) ?? []).filter((n) => typeof n === "string"),
    extra_tables: (extraContent?.tables ?? []).map((t: any) => t.title as string),
    existing_faqs: extraContent?.faqs?.length ?? 0,
    n_updates: (posting.updates ?? []).length,
  };
  if (noticeFacts.existing_faqs === 0) {
    for (const f of buildNoticeFaqs(noticeFacts)) {
      if (!faqs.some((x) => x.question === f.q)) faqs.push({ question: f.q, answer: f.a });
    }
  }

  const derivedTimeline = buildNoticeTimeline(noticeFacts).map((r, i) => ({
    id: `derived-${i}`,
    stage: r.stage,
    title: r.title,
    titleHi: null,
    description: null,
    descriptionHi: null,
    linkUrl: null,
    eventDate: new Date(r.eventDate),
  }));
  const timeline = [...(posting.updates ?? []), ...derivedTimeline].sort(
    (a: any, b: any) => a.eventDate.getTime() - b.eventDate.getTime(),
  );

  const relatedArticles = (posting.postingArticles ?? [])
    .map((pa: any) => pa.article)
    .filter((a: any) => a.status === "PUBLISHED");

  const schema = jsonLdGraph(
    buildJobPostingSchema(posting as any, org as any, relatedArticles.map((a: any) => a.slug)),
    buildExamEventSchema(posting as any),
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: org.name, path: orgHref },
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

  const recruitmentStatus = recruitmentStatusLabel(posting.currentStage, posting.validThrough, hiringOpen, posting.canonicalRecruitment?.applicationStartDate);

  const statusColorMap = {
    green: "border-green-200 bg-green-50 text-green-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-red-200 bg-red-50 text-red-800",
    neutral: "border-neutral-200 bg-neutral-50 text-neutral-700",
  };

  const hasEntityGraph = posting.canonicalPosition || posting.canonicalRecruitment || posting.exam;

  const sv = extraContent?.sourceVerification;

  const notice = !hiringOpen
    ? `This recruitment has moved past the application stage (${
        STAGE_LABELS[posting.currentStage] ?? posting.currentStage
      }). Details below are kept for reference — see the timeline for the latest update.`
    : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      {/* ── Breadcrumb ── */}
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-neutral-500">
        <Link href="/" className="hover:underline">Home</Link>{" / "}
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
        <Link href={`/jobs?kind=${posting.kind === "GOVERNMENT" ? "GOVERNMENT" : "PRIVATE"}`} className="hover:underline">
          {KIND_LABELS[posting.kind]}
        </Link>{" / "}
        <Link href={orgHref} className="hover:underline">{org.name}</Link>
        {stateHub && (
          <>
            {" / "}
            <Link href={`/states/${stateHub.slug}`} className="hover:underline">
              {stateHub.name}
            </Link>
          </>
        )}
      </nav>

      {/* ── 1. JOB IDENTITY ── */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge tone="brand">{KIND_LABELS[posting.kind]}</Badge>
        <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold ${statusColorMap[recruitmentStatus.color]}`}>
          {recruitmentStatus.label}
        </span>
      </div>

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{posting.title}</h1>
      <p className="mt-1 text-neutral-600">
        <Link href={orgHref} className="hover:underline">{org.name}</Link>
        {posting.locationCity ? ` · ${posting.locationCity}` : ""}
        {posting.locationRegion && !stateHub ? `, ${posting.locationRegion}` : ""}
        {stateHub && (
          <>
            {", "}
            <Link href={`/states/${stateHub.slug}`} className="hover:underline">
              {stateHub.name}
            </Link>
          </>
        )}
      </p>

      {/* Hindi version link */}
      {(posting as any).titleHi && (
        <p className="mt-2 text-xs text-neutral-500">
          <Link href={`/hi/jobs/${posting.slug}`} className="underline hover:no-underline" hrefLang="hi">
            हिंदी में पढ़ें
          </Link>
        </p>
      )}

      {relatedArticles.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {relatedArticles.map((article: any) => (
            <Link
              key={article.id}
              href={`/articles/${article.slug}`}
              className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800 hover:bg-blue-100"
            >
              📄 {article.title}
            </Link>
          ))}
        </div>
      )}

      {/* Warnings */}
      {notice && (
        <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {notice}
        </div>
      )}
      {(!posting.validThrough || !posting.officialNotificationUrl || posting.totalVacancies == null) && (
        <div className="mt-4 rounded-md border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-800">
          This information is derived from a published source and may be incomplete. Check the official notification before applying.
        </div>
      )}

      {(extraContent?.highlights ?? []).length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {(extraContent!.highlights!).map((h) => (
            <span
              key={h.text}
              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-neutral-50 px-3 py-1 text-sm font-medium"
            >
              <span aria-hidden="true">{h.icon}</span>
              {h.text}
            </span>
          ))}
        </div>
      )}

      {/* ── 2. CRITICAL FACTS (stats grid) ── */}
      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-black/10 p-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-neutral-500">Vacancies</dt>
          <dd className="font-medium">{posting.totalVacancies != null ? posting.totalVacancies : "Not specified"}</dd>
        </div>
        {posting.postNames && posting.postNames.length > 0 && (
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-neutral-500">Post(s)</dt>
            <dd className="font-medium">{posting.postNames.join(", ")}</dd>
          </div>
        )}
        <div>
          <dt className="text-neutral-500">Employment Type</dt>
          <dd className="font-medium">{EMPLOYMENT_TYPE_LABELS[posting.employmentType]}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Work Mode</dt>
          <dd className="font-medium">{WORKPLACE_TYPE_LABELS[posting.workplaceType]}</dd>
        </div>
        {salaryText && (
          <div>
            <dt className="text-neutral-500">{posting.kind === "GOVERNMENT" ? "Pay Scale" : "Salary"}</dt>
            <dd className="font-medium">{salaryText}</dd>
          </div>
        )}
        {formatAgeRange(posting.ageLimitMin, posting.ageLimitMax, false) && (
          <div>
            <dt className="text-neutral-500">Age Limit</dt>
            <dd className="font-medium">
              {formatAgeRange(posting.ageLimitMin, posting.ageLimitMax, false)}
              {posting.ageRelaxationNotes && (
                <span className="font-normal text-neutral-500"> (varies by category)</span>
              )}
            </dd>
          </div>
        )}
        {formatFee(posting.applicationFeeGeneral, posting.applicationFeeReserved, false) && (
          <div>
            <dt className="text-neutral-500">Application Fee</dt>
            <dd className="font-medium">{formatFee(posting.applicationFeeGeneral, posting.applicationFeeReserved, false)}</dd>
          </div>
        )}
        {posting.datePosted && (
          <div>
            <dt className="text-neutral-500">Posted On</dt>
            <dd className="font-medium">{formatDate(posting.datePosted, "en-IN")}</dd>
          </div>
        )}
        <div>
          <dt className="text-neutral-500">Last Date to Apply</dt>
          <dd className="font-medium">{posting.validThrough ? formatDate(posting.validThrough, "en-IN") : "Not available"}</dd>
        </div>
        {posting.examDate && (
          <div>
            <dt className="text-neutral-500">Exam Date</dt>
            <dd className="font-medium">{formatDate(posting.examDate, "en-IN")}</dd>
          </div>
        )}
        {posting.lastVerifiedAt && (
          <div>
            <dt className="text-neutral-500">Last Verified</dt>
            <dd className="font-medium">{formatDate(posting.lastVerifiedAt, "en-IN")}</dd>
          </div>
        )}
      </dl>

      {/* ── 3. PRIMARY ACTIONS ── */}
      <div className="mt-6 flex flex-wrap gap-3">
        {publicLink(posting.applyUrl) && hiringOpen && (
          <a
            href={publicLink(posting.applyUrl) as string}
            target="_blank"
            rel="noopener nofollow"
            className="rounded-md bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Apply Now
          </a>
        )}
        {publicLink(posting.officialNotificationUrl) && (
          <a
            href={publicLink(posting.officialNotificationUrl) as string}
            target="_blank"
            rel="noopener nofollow"
            className="rounded-md border border-black/20 px-5 py-2.5 text-sm font-semibold hover:bg-neutral-50"
          >
            Official Notification (PDF)
          </a>
        )}
      </div>

      {/* ── 4. RECRUITMENT STATUS / TIMELINE ── */}
      {timeline.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Timeline</h2>
          <ol className="mt-3 space-y-3 border-l border-black/10 pl-4">
            {timeline.map((update: any) => (
              <li key={update.id}>
                <p className="text-xs text-neutral-500">{formatDate(update.eventDate, "en-IN")}</p>
                <p className="font-medium">
                  {String(update.id).startsWith("derived-")
                    ? stripAggregatorTag(update.title)
                    : `${STAGE_LABELS[update.stage] ?? update.stage}: ${stripAggregatorTag(update.title)}`}
                </p>
                {update.description && (
                  <p className="text-sm text-neutral-600">{update.description}</p>
                )}
                {publicLink(update.linkUrl) && (
                  <a
                    href={publicLink(update.linkUrl) as string}
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

      {/* ── 5. JOB CONTEXT / ENTITY GRAPH ── */}
      {hasEntityGraph && (
        <section className="mt-8 rounded-lg border border-black/10 bg-neutral-50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Job Context
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {posting.canonicalPosition && (
              <div>
                <span className="text-neutral-500">Position</span>
                {" · "}
                <Link href={`/positions/${posting.canonicalPosition.slug}`} className="font-medium text-neutral-900 hover:underline">
                  {posting.canonicalPosition.name}
                </Link>
              </div>
            )}
            {posting.canonicalRecruitment && (
              <div>
                <span className="text-neutral-500">Recruitment</span>
                {" · "}
                <Link href={`/recruitments/${posting.canonicalRecruitment.slug}`} className="font-medium text-neutral-900 hover:underline">
                  {posting.canonicalRecruitment.name}
                </Link>
              </div>
            )}
            <div>
              <span className="text-neutral-500">Organisation</span>
              {" · "}
              <Link href={orgHref} className="font-medium text-neutral-900 hover:underline">{org.name}</Link>
            </div>
            {posting.exam && (
              <div>
                <span className="text-neutral-500">Exam</span>
                {" · "}
                <Link href={`/exams/${posting.exam.slug}`} className="font-medium text-neutral-900 hover:underline">
                  {posting.exam.label}
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── MAIN CONTENT ── */}
      <section className="prose prose-neutral mt-10 max-w-none">

        {/* ── 6. OVERVIEW ── */}
        <h2 className="text-lg font-semibold">Overview</h2>
        <p className="whitespace-pre-line">{posting.description}</p>

        {(extraContent?.notices ?? []).map((n) => (
          <div key={n.title}>
            <h2 className="text-lg font-semibold">{n.title}</h2>
            <p className="whitespace-pre-line">{n.body}</p>
          </div>
        ))}

        {/* ── 7. VACANCY / POST STRUCTURE ── */}
        {(extraContent?.tables ?? []).map((t) => (
          <div key={t.title}>
            <h2 className="text-lg font-semibold">{t.title}</h2>
            <div className="not-prose overflow-x-auto">
              <table className="w-full min-w-[20rem] border-collapse text-sm">
                <thead>
                  <tr>
                    {t.headers.map((h) => (
                      <th key={h} className="border border-black/10 bg-neutral-50 px-3 py-2 text-left font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {t.rows.map((r) => (
                    <tr key={r.join("|")}>
                      {r.map((c, i) => (
                        <td key={i} className="border border-black/10 px-3 py-2">{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* ── 8. ELIGIBILITY ── */}
        {(extraContent?.checklist ?? []).length > 0 ? (
          <>
            <h2 className="text-lg font-semibold">Eligibility Criteria</h2>
            {(extraContent!.checklist!).map((group) => (
              <div key={group.heading} className="not-prose mb-4">
                <h3 className="mb-2 font-semibold text-neutral-800">{group.heading}</h3>
                <ul className="space-y-1.5">
                  {group.items.map((item, idx) => (
                    <li key={idx} className="flex gap-2 text-sm">
                      <span className="mt-0.5 flex-shrink-0 text-neutral-400" aria-hidden="true">▸</span>
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </>
        ) : posting.eligibility ? (
          <>
            <h2 className="text-lg font-semibold">Eligibility</h2>
            <p className="whitespace-pre-line">{posting.eligibility}</p>
          </>
        ) : null}

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

        {/* ── 9. HOW TO APPLY ── */}
        {(extraContent?.steps ?? []).length > 0 && (
          <>
            <h2 className="text-lg font-semibold">How to Apply</h2>
            <ol className="not-prose mt-3 space-y-4">
              {(extraContent!.steps!).map((s) => (
                <li key={s.step} className="flex gap-3">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
                    {s.step}
                  </span>
                  <div>
                    <p className="font-semibold text-neutral-900">{s.title}</p>
                    <p className="mt-0.5 text-sm text-neutral-600">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}

        {/* ── 10. SELECTION PROCESS ── */}
        {(extraContent?.selectionProcess ?? []).length > 0 && (
          <>
            <h2 className="text-lg font-semibold">Selection Process</h2>
            <ol className="not-prose mt-3 space-y-3">
              {(extraContent!.selectionProcess!).map((s) => (
                <li key={s.step} className="flex gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-neutral-300 text-xs font-bold text-neutral-700">
                    {s.step}
                  </span>
                  <div>
                    <p className="font-medium text-neutral-900">{s.title}</p>
                    {s.body && <p className="mt-0.5 text-sm text-neutral-600">{s.body}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}

        {/* ── 11. FEE / PAYMENT / BANK DETAILS ── */}
        {(extraContent?.bankDetails ?? []).length > 0 && (
          <>
            <h2 className="text-lg font-semibold">Fee & Payment Details</h2>
            <div className="not-prose rounded-md border border-black/10 bg-neutral-50 p-4">
              <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                {(extraContent!.bankDetails!).map((row) => (
                  <div key={row.label}>
                    <dt className="text-neutral-500">{row.label}</dt>
                    <dd className="font-mono font-medium">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </>
        )}

        {/* ── 12. AGE RELAXATION ── */}
        {posting.ageRelaxationNotes && (
          <>
            <h2 className="text-lg font-semibold">Age Limit and Relaxation</h2>
            <p className="whitespace-pre-line">{posting.ageRelaxationNotes}</p>
          </>
        )}

      </section>

      {/* ── 13. FAQ ── */}
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

      {/* ── Related Guides ── */}
      {relatedArticles.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Related Guides</h2>
          <ul className="mt-3 space-y-2">
            {relatedArticles.map((article: any) => (
              <li key={article.id}>
                <Link href={`/articles/${article.slug}`} className="font-medium text-neutral-900 underline hover:no-underline">
                  {article.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── 14. SOURCE & VERIFICATION ── */}
      {(sv || posting.lastVerifiedAt) && (
        <section className="mt-10 rounded-lg border border-black/10 bg-neutral-50 p-4 text-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Source & Verification
          </p>
          <dl className="space-y-1.5">
            {sv?.sourceType && (
              <div className="flex gap-2">
                <dd className={`font-medium ${sv.sourceType === "official" ? "text-green-700" : "text-neutral-700"}`}>
                  {sv.sourceType === "official" ? "✅ Officially Verified" : "ℹ️ Derived from news aggregator"}
                </dd>
              </div>
            )}
            {sv?.sourceName && (
              <div className="flex gap-2 text-neutral-600">
                <dt className="flex-shrink-0">Source:</dt>
                <dd>{sv.sourceName}</dd>
              </div>
            )}
            {sv?.advertisementNo && (
              <div className="flex gap-2 text-neutral-600">
                <dt className="flex-shrink-0">Advertisement No:</dt>
                <dd className="font-mono">{sv.advertisementNo}</dd>
              </div>
            )}
            {sv?.lastChecked && (
              <div className="flex gap-2 text-neutral-600">
                <dt className="flex-shrink-0">Last checked:</dt>
                <dd>{formatDate(new Date(sv.lastChecked), "en-IN")}</dd>
              </div>
            )}
            {!sv && posting.lastVerifiedAt && (
              <div className="flex gap-2 text-neutral-600">
                <dt className="flex-shrink-0">Last Verified:</dt>
                <dd>{formatDate(posting.lastVerifiedAt, "en-IN")}</dd>
              </div>
            )}
          </dl>
          {!posting.officialNotificationUrl && (
            <p className="mt-2 text-neutral-500">
              No official notification link on file. Visit the organisation&apos;s website directly.
            </p>
          )}
        </section>
      )}

      {/* ── 15. RELATED CANONICAL ENTITIES ── */}
      <section className="mt-10 border-t border-black/10 pt-8">
        <h2 className="text-sm font-semibold text-neutral-500">Related Information</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {posting.canonicalPosition && (
            <InfoCard
              tone="brand"
              href={`/positions/${posting.canonicalPosition.slug}`}
              title={posting.canonicalPosition.name}
              subtitle="View all recruitment campaigns for this position"
            />
          )}
          {posting.canonicalRecruitment && (
            <InfoCard
              tone="success"
              href={`/recruitments/${posting.canonicalRecruitment.slug}`}
              title={posting.canonicalRecruitment.name}
              subtitle="View recruitment timeline and all posts"
            />
          )}
          <InfoCard
            tone="neutral"
            href={orgHref}
            title={org.name}
            subtitle="View all campaigns and exams"
          />
          {posting.exam && (
            <InfoCard
              tone="neutral"
              href={`/exams/${posting.exam.slug}`}
              title={posting.exam.label}
              subtitle="View exam details and other campaigns"
            />
          )}
        </div>
      </section>

      {/* ── REPORT AN ERROR ── */}
      <p className="mt-8 text-xs text-neutral-400">
        Spotted an error or outdated information?{" "}
        <Link href="/contact" className="underline hover:text-neutral-600">
          Report it
        </Link>
        {" "}and we'll fix it.
      </p>
    </div>
  );
}
