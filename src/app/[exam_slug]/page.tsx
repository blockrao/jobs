import Link from "next/link";
import { getExamBySlug, getPostingsByExam, listCommissionsWithExams } from "@/lib/queries";
import { STAGE_LABELS, formatDate } from "@/lib/labels";

export const revalidate = 300;

type Props = {
  params: Promise<{ exam_slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { exam_slug } = await params;
  const exam = await getExamBySlug(exam_slug);
  return {
    title: exam ? exam.label : "Exam Jobs",
    description: `Browse all open ${exam?.label || "job"} positions and apply online.`,
  };
}

export async function generateStaticParams() {
  const commissions = await listCommissionsWithExams();
  const params = [];
  for (const comm of commissions) {
    for (const exam of comm.exams) {
      params.push({ exam_slug: exam.slug });
    }
  }
  return params;
}

export default async function ExamPage({ params }: Props) {
  const { exam_slug } = await params;
  const exam = await getExamBySlug(exam_slug);
  const postings = await getPostingsByExam(exam_slug);

  if (!exam) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">Exam not found</h1>
      </div>
    );
  }

  // Get related exams (other exams in same commission)
  const commissions = await listCommissionsWithExams();
  const currentComm = commissions.find((c) => c.id === exam.commission?.id);
  const relatedExams = currentComm?.exams.filter((e) => e.id !== exam.id) || [];

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
              <Link
                href={`/jobs/${posting.slug}`}
                className="text-base font-semibold hover:underline block"
              >
                {posting.title}
              </Link>
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
