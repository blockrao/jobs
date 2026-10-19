import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageSeo } from "@/lib/seo";
import { listClosingSoon, countClosingSoon } from "@/lib/queries";
import { safeQuery } from "@/lib/safe-query";
import { parsePage } from "@/lib/pagination";
import { buildBreadcrumbSchema, jsonLdGraph } from "@/lib/structured-data";
import { ClosingSoonContent } from "@/components/closing-soon-content";

// Government recruitments closing within 30 days, ranked by vacancies then
// last date — the same rule as the homepage's "Closing in the next two weeks"
// block (HOMEPAGE_DESIGN_STRATEGY_2026_10_14). Indexable: it is the page for
// "sarkari naukri last date" intent, and it refreshes with the data.

export const revalidate = 86400; // Phase 1: daily revalidation

const WINDOW_DAYS = 30;
const PAGE_SIZE = 50;

type Props = { searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const path = page > 1 ? `/closing-soon?page=${page}` : "/closing-soon";
  return {
    title: `Government Jobs Closing Soon — Last Date Within 30 Days${page > 1 ? ` — Page ${page}` : ""}`,
    description:
      "Every government recruitment whose last date falls in the next 30 days, biggest first, with vacancies, last date and a countdown. Dates from the official notification.",
    ...pageSeo(path),
  };
}

export default async function ClosingSoonPage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  const [rows, total] = await Promise.all([
    safeQuery(() => listClosingSoon({ days: WINDOW_DAYS, limit: PAGE_SIZE + 1, offset: (page - 1) * PAGE_SIZE }), []),
    safeQuery(() => countClosingSoon(WINDOW_DAYS), 0),
  ]);
  const hasNext = rows.length > PAGE_SIZE;
  const items = hasNext ? rows.slice(0, PAGE_SIZE) : rows;
  if (page > 1 && items.length === 0) notFound();

  const schema = jsonLdGraph(
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Closing soon", path: "/closing-soon" },
    ]),
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <ClosingSoonContent rows={items} total={total} page={page} hasNext={hasNext} windowDays={WINDOW_DAYS} />
    </>
  );
}
