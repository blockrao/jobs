// /hi/exams — locale-aware exams hub listing. Mirrors (default)/exams/page.tsx
// but reads locale from the route segment (always "hi" here) instead of the
// NEXT_LOCALE cookie. The canonical page for SEO remains /exams; this is noindex.
import { listCommissionsWithExams, countCurrentPostingsByCommission } from "@/lib/queries";
import { ExamsHubContent } from "@/components/exams-hub-content";

export const revalidate = 300;

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const isHi = locale === "hi";
  return {
    title: isHi ? "परीक्षा अनुसार ब्राउज़ करें" : "Browse by Exam",
    description: isHi
      ? "विभिन्न आयोगों की सरकारी नौकरी परीक्षाओं को देखें और अपना अगला अवसर खोजें।"
      : "Discover government job exams by commission: SSC, UPSC, Banking, Railways, State, Teaching, Defence, and more.",
    robots: { index: false, follow: true },
    alternates: { canonical: "/exams" },
  };
}

export default async function LocaleExamsPage() {
  let commissions: Awaited<ReturnType<typeof listCommissionsWithExams>> = [];
  try {
    commissions = await listCommissionsWithExams();
  } catch {
    commissions = [];
  }

  let postingsByComm: Record<number, number> = {};
  try {
    postingsByComm = await countCurrentPostingsByCommission();
  } catch {
    postingsByComm = {};
  }
  for (const comm of commissions) postingsByComm[comm.id] ??= 0;

  // ExamsHubContent is a client component that reads the NEXT_LOCALE cookie.
  // When a visitor arrives at /hi/exams the language switcher sets the cookie
  // to "hi", so ExamsHubContent renders in Hindi. The locale param on this
  // page is guaranteed to be "hi" (or "en"), but we don't pass it here —
  // ExamsHubContent already handles both paths consistently via the cookie.
  return (
    <ExamsHubContent commissions={commissions} openCounts={postingsByComm} />
  );
}
