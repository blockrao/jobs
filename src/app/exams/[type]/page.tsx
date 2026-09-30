import Link from "next/link";
import { getPostingsByExamType, EXAM_TYPES } from "@/lib/queries";
import { STAGE_LABELS, formatDate } from "@/lib/labels";
import { postings, organizations } from "@/db/schema";

export const revalidate = 300;

type Props = {
  params: Promise<{ type: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { type } = await params;
  const exam = EXAM_TYPES.find((e) => e.slug === type);
  return {
    title: exam ? exam.label : "Exam Jobs",
    description: `Browse all open ${exam?.label || "job"} notifications and apply online.`,
  };
}

export async function generateStaticParams() {
  return EXAM_TYPES.map((exam) => ({
    type: exam.slug,
  }));
}

export default async function ExamTypePage({ params }: Props) {
  const { type } = await params;
  const exam = EXAM_TYPES.find((e) => e.slug === type);
  const postings = await getPostingsByExamType(type);

  if (!exam) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">Exam category not found</h1>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: exam.color }}
        />
        <h1 className="text-3xl font-bold tracking-tight">{exam.label}</h1>
      </div>

      <p className="text-neutral-600 mb-6">
        {postings.length} open position{postings.length !== 1 ? "s" : ""} available
      </p>

      <div className="mb-6">
        <Link href="/exams" className="text-sm text-neutral-600 hover:underline">
          ← Back to all exams
        </Link>
      </div>

      {postings.length === 0 ? (
        <div className="rounded-lg bg-neutral-50 border border-black/10 p-8 text-center">
          <p className="text-neutral-600">
            No open positions for this exam type at the moment. Check back soon!
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-black/10">
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
    </div>
  );
}
