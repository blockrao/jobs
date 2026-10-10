// /hi/commissions/[commission_slug] — locale-aware commission page.
// Mirrors (default)/commissions/[commission_slug]/page.tsx but lives under
// [locale] so /hi/commissions/bpsc always renders in Hindi. Canonical for SEO
// is /commissions/[slug]; this is noindex.
import { getCommissionBySlug, getPostingsByCommission } from "@/lib/queries";
import { CommissionContent } from "@/components/commission-content";
import { safeQuery } from "@/lib/safe-query";
import { pageSeo } from "@/lib/seo";

export const revalidate = 300;

type Props = {
  params: Promise<{ locale: string; commission_slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale, commission_slug } = await params;
  const isHi = locale === "hi";
  const commission = await safeQuery(() => getCommissionBySlug(commission_slug), null);
  const name = isHi
    ? (commission as any)?.nameHi || commission?.name || "Commission"
    : commission?.name || "Commission";
  return {
    title: name,
    description: isHi
      ? `${name} की सभी परीक्षाओं और पदों की जानकारी।`
      : `Browse all open ${name} job exams and positions.`,
    ...pageSeo(`/commissions/${commission_slug}`, { index: false }),
  };
}

export default async function LocaleCommissionPage({ params }: Props) {
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

  return <CommissionContent commission={commission} allPostings={allPostings} />;
}
