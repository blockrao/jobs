import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleBySlug } from "@/lib/queries";
import { absoluteUrl } from "@/lib/site";
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
  jsonLdGraph,
} from "@/lib/structured-data";
import { ARTICLE_TYPE_LABELS, formatDate } from "@/lib/labels";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return {};
  // Only advertise the Hindi alternate when this article is actually
  // translated (titleHi) — advertising a hi URL with English content would
  // mislead search engines rather than help them find real Hindi content.
  const hasHindi = Boolean((article as any).titleHi);
  return {
    title: article.title,
    description: article.dek ?? article.body.slice(0, 155),
    alternates: {
      canonical: `/articles/${article.slug}`,
      ...(hasHindi && {
        languages: {
          en: absoluteUrl(`/en/articles/${article.slug}`),
          hi: absoluteUrl(`/hi/articles/${article.slug}`),
        },
      }),
    },
    openGraph: {
      title: article.title,
      description: article.dek ?? undefined,
      type: "article",
      url: absoluteUrl(`/articles/${article.slug}`),
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article || article.status !== "PUBLISHED") notFound();

  const relatedPostings = article.postingArticles.map((pa) => pa.posting);
  const aboutUrls = relatedPostings.map((p) => absoluteUrl(`/jobs/${p.slug}`));

  const schema = jsonLdGraph(
    buildArticleSchema(article, aboutUrls),
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Articles", path: "/articles" },
      { name: article.title, path: `/articles/${article.slug}` },
    ]),
  );

  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <span className="inline-block rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700">
        {ARTICLE_TYPE_LABELS[article.type] ?? article.type}
      </span>
      <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
        {article.title}
      </h1>
      {article.dek && (
        <p className="mt-2 text-lg text-neutral-600">{article.dek}</p>
      )}
      <p className="mt-2 text-xs text-neutral-400">
        {article.authorName ? `By ${article.authorName} · ` : ""}
        {formatDate(article.publishedAt)}
      </p>

      <div className="prose prose-neutral mt-8 max-w-none whitespace-pre-line">
        {article.body}
      </div>

      {relatedPostings.length > 0 && (
        <aside className="mt-10 rounded-lg border border-black/10 p-4">
          <h2 className="text-sm font-semibold text-neutral-700">
            Related Job Postings
          </h2>
          <ul className="mt-2 space-y-1">
            {relatedPostings.map((posting) => (
              <li key={posting.id}>
                <Link
                  href={`/jobs/${posting.slug}`}
                  className="font-medium underline hover:no-underline"
                >
                  {posting.title}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </article>
  );
}
