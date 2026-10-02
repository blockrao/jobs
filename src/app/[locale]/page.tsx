import Link from "next/link";
import { JobPostingLink } from "@/components/job-posting-link";
import { getExamBySlug, getExamBySlugLight, getPostingsByExam, listCommissionsWithExams } from "@/lib/queries";
import { STAGE_LABELS, formatDate } from "@/lib/labels";

// This file lives at src/app/[locale]/page.tsx — i.e. it shares a folder
// (and therefore Next's dynamic-segment name, "locale") with layout.tsx and
// the articles/exams/organizations/jobs subtrees below it, even though this
// page itself has nothing to do with Hindi/English locale routing. It used
// to be its own top-level route at src/app/[exam_slug]/page.tsx, with its
// own differently-named dynamic segment — but Next.js's App Router
// requires every dynamic folder at the same tree depth to share one
// parameter name (two sibling folders like `[exam_slug]` and `[locale]`
// under `src/app/` throw "You cannot use different slug names for the
// same dynamic path" the moment a real request needs routing — this
// doesn't show up in `next build`'s own output, only when `next dev` or
// `next start` actually serves a request, which is why it went unnoticed).
// Moving this page's file into the [locale] folder, and just renaming the
// destructured param below, satisfies that constraint without changing
// this route's URL, behavior, or content in any way — a request for
// /ssc-cgl-2026 still renders this exact page; it simply arrives as
// params.locale instead of params.exam_slug. See [locale]/layout.tsx for
// the corresponding change needed there (it must NOT 404 real exam slugs
// just because they aren't "en" or "hi").
export const revalidate = 300;

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale: examSlug } = await params;
  const exam = await getExamBySlugLight(examSlug);
  return {
    title: exam ? exam.label : "Exam Jobs",
    description: `Browse all open ${exam?.label || "job"} positions and apply online.`,
  };
}

export async function generateStaticParams() {
  try {
    const commissions = await listCommissionsWithExams();
    const params = [];
    for (const comm of commissions) {
      for (const exam of comm.exams) {
        params.push({ locale: exam.slug });
      }
    }
    return params;
  } catch {
    // Database unavailable during build - return empty array
    // Pages will be generated on-demand (ISR) instead
    return [];
  }
}

export default async function ExamPage({ params }: Props) {
  const { locale: examSlug } = await params;
  const exam = await getExamBySlug(examSlug);
  const postings = await getPostingsByExam(examSlug);

  if (!exam) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">Exam not found</h1>
      </div>
    );
  }

  // Get related exams (other exams in same commission)
  // Use exam.commission relationship instead of fetching all commissions
  const relatedExams = exam.commission?.exams?.filter((e) => e.id !== exam.id) || [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/commissions/${exam.commission?.slug}`}
          className="text-sm text-neutral-600 hover:underline"
        >
          ← Back to {exam.commission?.name}
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-2">{exam.label}</h1>
        {exam.description && (
          <p className="text-neutral-600 mb-3">{exam.description}</p>
        )}
        {(exam.salaryMin || exam.salaryMax) && (
          <p className="text-sm text-neutral-500">
            Salary: ₹{exam.salaryMin?.toLocaleString("en-IN")} - ₹{exam.salaryMax?.toLocaleString("en-IN")}
          </p>
        )}
      </div>

      <p className="text-neutral-600 mb-6">
        {postings.length} open position{postings.length !== 1 ? "s" : ""} available
      </p>

      {postings.length === 0 ? (
        <div className="rounded-lg bg-neutral-50 border border-black/10 p-8 text-center">
          <p className="text-neutral-600">
            No open positions for this exam at the moment. Check back soon!
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-black/10 mb-8">
          {postings.map((posting) => (
            <li key={posting.id} className="py-4">
              <JobPostingLink
                href={`/jobs/${posting.slug}`}
                slug={posting.slug}
                title={posting.title}
                examSlug={examSlug}
                className="text-base font-semibold hover:underline block"
              >
                {posting.title}
              </JobPostingLink>
              <p className="text-sm text-neutral-600 mt-1">
                {posting.organization.name}
                {posting.locationCity ? ` · ${posting.locationCity}` : ""} ·{" "}
                {STAGE_LABELS[posting.currentStage] ?? posting.currentStage}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Posted {formatDate(posting.datePosted)}
                {posting.validThrough && ` · Apply by ${formatDate(posting.validThrough)}`}
              </p>
            </li>
          ))}
        </ul>
      )}

      {relatedExams.length > 0 && (
        <div className="mt-8 pt-8 border-t border-black/10">
          <h2 className="text-lg font-semibold mb-4">
            Other {exam.commission?.name} Exams
          </h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {relatedExams.map((relatedExam) => (
              <li key={relatedExam.id}>
                <Link
                  href={`/${relatedExam.slug}`}
                  className="block p-3 border border-black/10 rounded hover:bg-neutral-50 transition-colors"
                >
                  <div className="font-medium text-sm">{relatedExam.label}</div>
                  {relatedExam.salaryMin && (
                    <div className="text-xs text-neutral-500 mt-1">
                      ₹{relatedExam.salaryMin?.toLocaleString("en-IN")} - ₹{relatedExam.salaryMax?.toLocaleString("en-IN")}
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
