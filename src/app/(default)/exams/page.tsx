import { pageSeo } from "@/lib/seo";
import { listCommissionsWithExams, countCurrentPostingsByCommission } from "@/lib/queries";
import { ExamsHubContent } from "@/components/exams-hub-content";

export const revalidate = 300;

export const metadata = {
  title: "Browse by Exam",
  description: "Discover government job exams by commission: SSC, UPSC, Banking, Railways, State, Teaching, Defence, and more.",
  ...pageSeo("/exams"),
  openGraph: {
    title: "Browse Government Exams – JobOye",
    description: "Discover government job exams by commission: SSC, UPSC, Banking, Railways, State, Teaching, Defence, and more.",
    url: "https://www.joboye.com/exams",
    siteName: "JobOye",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Browse Government Exams – JobOye",
    description: "Discover government job exams by commission: SSC, UPSC, Banking, Railways, State, Teaching, Defence, and more.",
  },
};

export default async function ExamsPage() {
  let commissions: Awaited<ReturnType<typeof listCommissionsWithExams>> = [];
  try {
    commissions = await listCommissionsWithExams();
  } catch {
    commissions = [];
  }

  // Open count per commission: one grouped query (same rule as the commission page, capped at 200 as before).
  let postingsByComm: Record<number, number> = {};
  try {
    postingsByComm = await countCurrentPostingsByCommission();
  } catch {
    postingsByComm = {};
  }
  for (const comm of commissions) postingsByComm[comm.id] ??= 0;

  // ExamsHubContent (client) decides how to render based on the visitor's
  // saved language cookie — same reasoning as home-content.tsx — keeping
  // this page a plain static/ISR server component.
  return (
    <ExamsHubContent commissions={commissions} openCounts={postingsByComm} />
  );
}
