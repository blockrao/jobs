import { discoveryHubMetadata } from "@/lib/seo/discovery-hub-metadata";
import { getCommissionBySlug, getPostingsByCommission, listCommissionsWithExams } from "@/lib/queries";
import { CommissionContent } from "@/components/commission-content";
import { safeQuery } from "@/lib/safe-query";

export const revalidate = 86400; // Phase 1: daily revalidation

type Props = {
  params: Promise<{ commission_slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { commission_slug } = await params;
  const commission = await safeQuery(() => getCommissionBySlug(commission_slug), null);
  if (!commission) return {};
  const title = `${commission.name} Recruitment, Exams & Jobs`;
  const description = `Explore ${commission.name} exams, recruitment information and available positions on JobOye.`;
  return discoveryHubMetadata({
    title,
    description,
    canonicalPath: `/commissions/${commission.slug}`,
    ogImageAlt: `${commission.name} recruitment and jobs – JobOye`,
  });
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
  const commission = await safeQuery(() => getCommissionBySlug(commission_slug), null);
  const allPostings = await safeQuery(
    () => getPostingsByCommission(commission_slug),
    [],
  );

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
