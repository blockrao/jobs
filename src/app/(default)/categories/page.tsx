import { pageSeo } from "@/lib/seo";
import type { Metadata } from "next";
import { countLivePostsBySector } from "@/lib/queries";
import { safeQuery } from "@/lib/safe-query";
import { SECTORS } from "@/lib/sectors";
import { CategoriesContent } from "@/components/categories-content";

export const revalidate = 86400; // Phase 1: daily revalidation

export const metadata: Metadata = {
  title: "Government Jobs by Category",
  description:
    "Browse live government job notifications by sector — central government, state government, railway, banking, defence and PSU.",
  ...pageSeo("/categories"),
};

export default async function CategoriesPage() {
  const counts = await safeQuery(() => countLivePostsBySector(), {});
  const items = SECTORS.map((s) => ({
    sector: s,
    count: s.sectors.reduce((n, k) => n + (counts[k] ?? 0), 0),
  }));
  return <CategoriesContent items={items} />;
}
