import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageSeo } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { QUALIFICATIONS, getQualification } from "@/lib/qualifications";
import {
  listLivePostsByQualification,
  countLivePostsByQualification,
} from "@/lib/queries";

import { safeQuery } from "@/lib/safe-query";
import { parsePage } from "@/lib/pagination";
import { buildBreadcrumbSchema, jsonLdGraph } from "@/lib/structured-data";
import { QualificationHubContent } from "@/components/qualification-hub-content";

// Qualification hub pages resolve at request time — they depend on live DB.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateStaticParams() {
  return QUALIFICATIONS.map((q) => ({ slug: q.slug }));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  const hub = getQualification(slug);
  if (!hub) return {};

  const path =
    page > 1 ? `/qualifications/${slug}?page=${page}` : `/qualifications/${slug}`;
  const title = `${hub.label} 2026${page > 1 ? ` — Page ${page}` : ""} — Sarkari Naukri`;
  const description = `${hub.description} Updated daily with the latest government job notifications, vacancy counts and last dates.`;

  return {
    title,
    description,
    ...pageSeo(path),
    openGraph: {
      title,
      description,
      url: absoluteUrl(path),
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function QualificationHubPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  const hub = getQualification(slug);
  if (!hub) notFound();

  const [rows, total] = await Promise.all([
    safeQuery(
      () =>
        listLivePostsByQualification(hub.namePattern, {
          limit: PAGE_SIZE + 1,
          offset: (page - 1) * PAGE_SIZE,
        }),
      [],
    ),
    safeQuery(() => countLivePostsByQualification(hub.namePattern), 0),
  ]);

  const hasNext = rows.length > PAGE_SIZE;
  const items = hasNext ? rows.slice(0, PAGE_SIZE) : rows;

  if (page > 1 && items.length === 0) notFound();

  const schema = jsonLdGraph(
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Qualifications", path: "/qualifications" },
      { name: hub.label, path: `/qualifications/${slug}` },
    ]),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <QualificationHubContent
        hub={hub}
        rows={items}
        total={total}
        page={page}
        hasNext={hasNext}
      />
    </>
  );
}
