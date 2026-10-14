import { pageSeo } from "@/lib/seo";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { listLivePostsBySector, countLivePostsBySector } from "@/lib/queries";
import { buildBreadcrumbSchema, jsonLdGraph } from "@/lib/structured-data";
import { safeQuery } from "@/lib/safe-query";
import { SECTORS, LEGACY_SLUGS_TO_INDEX, getSector, getSectorByAlias, sectorHref } from "@/lib/sectors";
import { parsePage } from "@/lib/pagination";
import { CategoryContent } from "@/components/category-content";

// Sector hub. The taxonomy is src/lib/sectors.ts (one source for tiles,
// index, footer, sitemap and this route); data is canonical Posts resolved
// through organizations.sector. See the header comment in sectors.ts for why
// the old DB-backed category pages were replaced.

export const revalidate = 300;
export const dynamicParams = true;

const PAGE_SIZE = 50;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export function generateStaticParams() {
  return SECTORS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sector = getSector(slug);
  if (!sector) return {};
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const suffix = page > 1 ? ` — Page ${page}` : "";
  const path = page > 1 ? `${sectorHref(sector)}?page=${page}` : sectorHref(sector);
  return {
    title: `${sector.label} Jobs 2026 — Latest Notifications${suffix}`,
    description: sector.description,
    ...pageSeo(path),
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sector = getSector(slug);

  if (!sector) {
    // Every former vocabulary (seed-table slugs like `banking-jobs`, the
    // homepage tile slugs that never resolved, `/jobs?sector=` values) maps
    // to its canonical hub with a 301 so nothing that was ever linked 404s.
    const target = getSectorByAlias(slug);
    if (target) permanentRedirect(sectorHref(target));
    if (LEGACY_SLUGS_TO_INDEX.has(slug.toLowerCase())) permanentRedirect("/categories");
    notFound();
  }

  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  const [rows, counts] = await Promise.all([
    safeQuery(
      () =>
        listLivePostsBySector(sector.sectors, {
          limit: PAGE_SIZE + 1,
          offset: (page - 1) * PAGE_SIZE,
        }),
      [],
    ),
    safeQuery(() => countLivePostsBySector(), {}),
  ]);

  const hasNext = rows.length > PAGE_SIZE;
  const posts = hasNext ? rows.slice(0, PAGE_SIZE) : rows;
  const total = sector.sectors.reduce((n, s) => n + (counts[s] ?? 0), 0);

  // A paginated page beyond the data is a soft 404; return a real one.
  if (page > 1 && posts.length === 0) notFound();

  const schema = jsonLdGraph(
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Categories", path: "/categories" },
      { name: sector.label, path: sectorHref(sector) },
    ]),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <CategoryContent
        sector={sector}
        posts={posts}
        total={total}
        page={page}
        hasNext={hasNext}
      />
    </>
  );
}
