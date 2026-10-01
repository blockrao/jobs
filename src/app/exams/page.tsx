import Link from "next/link";
import { listCommissionsWithExams, getPostingsByCommission } from "@/lib/queries";

export const revalidate = 300;

export const metadata = {
  title: "Browse by Exam",
  description: "Discover government job exams by commission: SSC, UPSC, Banking, Railways, State, Teaching, Defence, and more.",
};

export default async function ExamsPage() {
  let commissions: Awaited<ReturnType<typeof listCommissionsWithExams>> = [];
  try {
    commissions = await listCommissionsWithExams();
  } catch {
    commissions = [];
  }

  // Get open count per commission
  const postingsByComm = new Map<number, number>();
  for (const comm of commissions) {
    try {
      const posts = await getPostingsByCommission(comm.slug);
      postingsByComm.set(comm.id, posts.length);
    } catch {
      postingsByComm.set(comm.id, 0);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Browse by Exam</h1>
        <p className="text-neutral-600">
          Explore government job exams from different commissions and find your next opportunity.
        </p>
      </div>

      {commissions.length === 0 ? (
        <div className="rounded-lg bg-neutral-50 border border-black/10 p-8 text-center">
          <p className="text-neutral-600">No exams available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {commissions.map((comm) => {
            const openCount = postingsByComm.get(comm.id) || 0;
            return (
              <Link key={comm.id} href={`/commissions/${comm.slug}`}>
                <div className="p-6 border border-black/10 rounded-lg hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
                      style={{ backgroundColor: comm.color || "#000000" }}
                    />
                    <h2 className="text-lg font-semibold">{comm.name}</h2>
                  </div>

                  {comm.description && (
                    <p className="text-sm text-neutral-600 mb-3 line-clamp-2">
                      {comm.description}
                    </p>
                  )}

                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">{comm.exams.length}</span> exams
                    </div>
                    {openCount > 0 && (
                      <div className="text-sm text-green-600 font-medium">
                        {openCount} position{openCount !== 1 ? "s" : ""} open
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
