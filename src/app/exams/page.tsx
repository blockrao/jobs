import Link from "next/link";
import { EXAM_TYPES } from "@/lib/queries";

export const revalidate = 300;

export const metadata = {
  title: "Exam Categories",
  description: "Browse government job notifications by exam type and category.",
};

export default function ExamsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Government Job Exams</h1>
      <p className="text-neutral-600 mb-8">
        Explore open positions across major Indian government exams and recruitment boards.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {EXAM_TYPES.map((exam) => (
          <Link
            key={exam.slug}
            href={`/exams/${exam.slug}`}
            className="group block p-6 rounded-lg border border-black/10 hover:border-black/30 hover:bg-neutral-50 transition-all"
          >
            <div
              className="w-3 h-3 rounded-full mb-3"
              style={{ backgroundColor: exam.color }}
            />
            <h2 className="text-lg font-semibold group-hover:underline">{exam.label}</h2>
            <p className="text-sm text-neutral-500 mt-2">
              View all open positions and notifications
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-12 p-6 rounded-lg bg-neutral-50 border border-black/10">
        <h3 className="font-semibold mb-2">Stay Updated</h3>
        <p className="text-sm text-neutral-600">
          New job notifications are added daily. Check back regularly or follow us for alerts
          on the latest openings in your preferred exam category.
        </p>
      </div>
    </div>
  );
}
