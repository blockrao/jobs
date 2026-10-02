import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryBySlug } from "@/lib/queries";
import { buildBreadcrumbSchema, jsonLdGraph } from "@/lib/structured-data";
import { safeQuery } from "@/lib/safe-query";
import { CategoryContent } from "@/components/category-content";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await safeQuery(() => getCategoryBySlug(slug), null);
  if (!result) return {};
  return {
    title: result.category.name,
    description:
      result.category.description ??
      `Latest ${result.category.name} openings and related guides.`,
    alternates: { canonical: `/categories/${result.category.slug}` },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const result = await safeQuery(() => getCategoryBySlug(slug), null);
  if (!result) notFound();
  const { category } = result;

  const schema = jsonLdGraph(
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Categories", path: "/categories" },
      { name: category.name, path: `/categories/${category.slug}` },
    ]),
  );

  // CategoryContent (client) decides how to render the fetched data based
  // on the visitor's saved language cookie — same reasoning as
  // home-content.tsx — keeping this page a plain static/ISR server
  // component. The breadcrumb schema stays here, server-rendered, in
  // English (it's structured data for crawlers, not visible page copy).
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <CategoryContent result={result} />
    </>
  );
}
