import { pageSeo } from "@/lib/seo";
import { listCommissionsWithExams, getPostingsByCommission } from "@/lib/queries";
import { ExamsHubContent } from "@/components/exams-hub-content";

export const revalidate = 300;

export const metadata = {
  title: "Browse by Exam",
  description: "Discover government job exams by commission: SSC, UPSC, Banking, Railways, State, Teaching, Defence, and more.",
  ...pageSeo("/exams"),
};

export default async function ExamsPage() {
  let commissions: Awaited<ReturnType<typeof listCommissionsWithExams>> = [];
  try {
    commissions = await listCommissionsWithExams();
  } catch {
    commissions = [];
  }

  // Get open count per commission
  const postingsByComm: Record<number, number> = {};
  for (const comm of commissions) {
    try {
      const posts = await getPostingsByCommission(comm.slug);
      postingsByComm[comm.id] = posts.length;
    } catch {
      postingsByComm[comm.id] = 0;
    }
  }

  // ExamsHubContent (client) decides how to render based on the visitor's
  // saved language cookie — same reasoning as home-content.tsx — keeping
  // this page a plain static/ISR server component.
  return (
    <ExamsHubContent commissions={commissions} openCounts={postingsByComm} />
  );
}
