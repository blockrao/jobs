import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryBySlug } from "@/lib/queries";
import { buildBreadcrumbSchema, jsonLdGraph } from "@/lib/structured-data";
import { STAGE_LABELS, formatDate } from "@/lib/labels";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getCategoryBySlug(slug);
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
  const result = await getCategoryBySlug(slug);
  if (!result) notFound();
  const { category, postings, articles } = result;

  const schema = jsonLdGraph(
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Categories", path: "/categories" },
      { name: category.name, path: `/categories/${category.slug}` },
    ]),
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <h1 className="text-2xl font-bold tracking-tight">{category.name}</h1>
      {category.description && (
        <p className="mt-2 max-w-2xl text-neutral-600">
          {category.description}
        </p>
      )}

      <h2 className="mt-8 text-lg font-semibold">Open Postings</h2>
      <ul className="mt-3 divide-y divide-black/10">
        {postings.map((posting) => (
          <li key={posting.id} className="py-4">
            <Link
              href={`/jobs/${posting.slug}`}
              className="font-semibold hover:underline"
            >
              {posting.title}
            </Link>
            <p className="text-sm text-neutral-600">
              {posting.organization.name} ·{" "}
              {STAGE_LABELS[posting.currentStage] ?? posting.currentStage} ·
              Posted {formatDate(posting.datePosted)}
            </p>
          </li>
        ))}
        {postings.length === 0 && (
          <li className="py-6 text-sm text-neutral-500">
            No postings in this category yet.
          </li>
        )}
      </ul>

      {articles.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-semibold">Related Guides</h2>
          <ul className="mt-3 space-y-2">
            {articles.map((article) => (
              <li key={article.id}>
                <Link
                  href={`/articles/${article.slug}`}
                  className="font-medium underline hover:no-underline"
                >
                  {article.title}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
