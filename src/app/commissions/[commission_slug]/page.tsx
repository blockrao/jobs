import { getCommissionBySlug, getPostingsByCommission, listCommissionsWithExams } from "@/lib/queries";
import { CommissionContent } from "@/components/commission-content";

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

  // CommissionContent (client) decides how to render the fetched data based
  // on the visitor's saved language cookie — same reasoning as
  // home-content.tsx — keeping this page statically generated
  // (generateStaticParams above, ● SSG per `next build`).
  return <CommissionContent commission={commission} allPostings={allPostings} />;
}
