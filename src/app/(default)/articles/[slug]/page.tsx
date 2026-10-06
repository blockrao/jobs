import { entitySeo } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleBySlug } from "@/lib/queries";
import { absoluteUrl } from "@/lib/site";
import { safeQuery } from "@/lib/safe-query";
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
  jsonLdGraph,
} from "@/lib/structured-data";
import { ARTICLE_TYPE_LABELS, formatDate } from "@/lib/labels";
import { InfoCard } from "@/components/ui/info-card";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await safeQuery(() => getArticleBySlug(slug), null);
  if (!article) return {};

  const hasHindi = Boolean(article.titleHi);
  const seo = entitySeo({ base: "/articles", slug: article.slug, locale: "en", hasHindi });

  return {
    title: article.title,
    description: article.dek ?? article.body.slice(0, 155),
    alternates: seo.alternates,
    robots: seo.robots,
    openGraph: {
      title: article.title,
      description: article.dek ?? undefined,
      type: "article",
      url: seo.url,
      images: [{ url: "/og-default.png", width: 1200, height: 630, alt: article.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.dek ?? article.body.slice(0, 155),
      images: ["/og-default.png"],
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await safeQuery(() => getArticleBySlug(slug), null);
  if (!article || article.status !== "PUBLISHED") notFound();

  const relatedPostings = article.postingArticles
    .map((pa) => pa.posting)
    .filter((p) => p.reviewStatus === "APPROVED");
  const aboutUrls = relatedPostings.map((p) => absoluteUrl(`/jobs/${p.slug}`));

  const breadcrumbItems = [
    { name: "Home", path: "/" },
    { name: "Articles", path: "/articles" },
    { name: article.title, path: `/articles/${article.slug}` },
  ];

  const schema = jsonLdGraph(
    buildArticleSchema(article, aboutUrls),
    buildBreadcrumbSchema(breadcrumbItems),
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
      {article.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- remote,
        // scraped/CMS-supplied URLs; no next/image domain allowlist set up
        // for these yet.
        <img
          src={article.coverImageUrl}
          alt=""
          className="mt-4 aspect-video w-full rounded-lg object-cover"
        />
      )}
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
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {relatedPostings.map((posting) => (
              <InfoCard
                key={posting.id}
                tone="brand"
                href={`/jobs/${posting.slug}`}
                title={posting.title}
                subtitle={
                  posting.totalVacancies != null
                    ? `${posting.totalVacancies} vacancies`
                    : "View details"
                }
              />
            ))}
          </div>
        </aside>
      )}

      <nav className="mt-12 pt-6 border-t text-sm text-neutral-600">
        <Link href="/" className="hover:underline">Home</Link>
        {" / "}
        <Link href="/articles" className="hover:underline">Articles</Link>
        {" / "}
        <span>{article.title}</span>
      </nav>
    </article>
  );
}
