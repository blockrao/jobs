import Link from "next/link";
import { getCommissionBySlug, getPostingsByCommission, listCommissionsWithExams } from "@/lib/queries";

export const revalidate = 300;

type Props = {
  params: Promise<{ commission_slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { commission_slug } = await params;
  const commission = await getCommissionBySlug(commission_slug);
  return {
    title: commission ? commission.name : "Commission",
    description: `Browse all open ${commission?.name || "government"} job exams and positions.`,
  };
}

export async function generateStaticParams() {
  try {
    const commissions = await listCommissionsWithExams();
    return commissions.map((comm) => ({
      commission_slug: comm.slug,
    }));
  } catch {
    // Database unavailable during build - return empty array
    // Pages will be generated on-demand (ISR) instead
    return [];
  }
}

export default async function CommissionPage({ params }: Props) {
  const { commission_slug } = await params;
  const commission = await getCommissionBySlug(commission_slug);
  const allPostings = await getPostingsByCommission(commission_slug);

  if (!commission) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">Commission not found</h1>
      </div>
    );
  }

  // Count open positions per exam
  const postingsByExam = new Map<number, number>();
  allPostings.forEach((posting) => {
    if (posting.exam) {
      postingsByExam.set(
        posting.exam.id,
        (postingsByExam.get(posting.exam.id) || 0) + 1
      );
    }
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <Link href="/exams" className="text-sm text-neutral-600 hover:underline">
          ← Back to all exams
        </Link>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-6 h-6 rounded-full"
            style={{ backgroundColor: commission.color || "#000000" }}
          />
          <h1 className="text-3xl font-bold tracking-tight">{commission.name}</h1>
        </div>
        {commission.description && (
          <p className="text-neutral-600">{commission.description}</p>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">
          Exams ({commission.exams.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {commission.exams.map((exam) => {
            const openCount = postingsByExam.get(exam.id) || 0;
            return (
              <Link key={exam.id} href={`/${exam.slug}`}>
                <div className="p-4 border border-black/10 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                  <h3 className="font-semibold text-base mb-2">{exam.label}</h3>
                  <div className="text-sm text-neutral-600 space-y-1">
                    {openCount > 0 && (
                      <p>
                        <span className="font-medium text-green-600">
                          {openCount} position{openCount !== 1 ? "s" : ""}
                        </span>{" "}
                        open
                      </p>
                    )}
                    {exam.salaryMin && (
                      <p>
                        Salary: ₹{exam.salaryMin.toLocaleString("en-IN")} - ₹
                        {exam.salaryMax?.toLocaleString("en-IN")}
                      </p>
                    )}
                    {exam.eligibility && (
                      <p className="text-xs">Eligibility: {exam.eligibility}</p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">
          All Open Positions ({allPostings.length})
        </h2>
        {allPostings.length === 0 ? (
          <div className="rounded-lg bg-neutral-50 border border-black/10 p-8 text-center">
            <p className="text-neutral-600">
              No open positions at the moment. Check back soon!
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-black/10">
            {allPostings.map((posting) => (
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
                  <span className="text-xs bg-neutral-100 px-2 py-1 rounded">
                    {posting.exam?.label}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
