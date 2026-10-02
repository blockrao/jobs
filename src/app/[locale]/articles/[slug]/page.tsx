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

type Props = { params: Promise<{ slug: string; locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return {};

  const title = locale === "hi" ? article.titleHi || article.title : article.title;
  const dek = locale === "hi" ? article.dekHi || article.dek : article.dek;
  const body = locale === "hi" ? article.bodyHi || article.body : article.body;

  return {
    title,
    description: dek ?? body.slice(0, 155),
    alternates: {
      canonical: `/${locale}/articles/${article.slug}`,
      languages: {
        en: `${absoluteUrl('/en/articles/' + article.slug)}`,
        hi: `${absoluteUrl('/hi/articles/' + article.slug)}`,
      }
    },
    openGraph: {
      title,
      description: dek ?? undefined,
      type: "article",
      url: absoluteUrl(`/${locale}/articles/${article.slug}`),
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug, locale } = await params;
  const article = await getArticleBySlug(slug);
  if (!article || article.status !== "PUBLISHED") notFound();

  const title = locale === "hi" ? article.titleHi || article.title : article.title;
  const dek = locale === "hi" ? article.dekHi || article.dek : article.dek;
  const body = locale === "hi" ? article.bodyHi || article.body : article.body;

  const relatedPostings = article.postingArticles.map((pa) => pa.posting);
  const aboutUrls = relatedPostings.map((p) => absoluteUrl(`/${locale}/jobs/${p.slug}`));

  // No localized homepage or articles hub exists (only this [slug] detail
  // page is under [locale]/articles/ — see root layout.tsx) — point these
  // at the real pages rather than /${locale} URLs that 404 or redirect.
  const breadcrumbItems = [
    { name: locale === "hi" ? "होम" : "Home", path: "/" },
    { name: locale === "hi" ? "लेख" : "Articles", path: "/articles" },
    { name: title, path: `/${locale}/articles/${article.slug}` },
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
      <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
        {title}
      </h1>
      {dek && (
        <p className="mt-2 text-lg text-neutral-600">{dek}</p>
      )}
      <p className="mt-2 text-xs text-neutral-400">
        {article.authorName ? `By ${article.authorName} · ` : ""}
        {formatDate(article.publishedAt)}
      </p>

      <div className="prose prose-neutral mt-8 max-w-none whitespace-pre-line">
        {body}
      </div>

      {relatedPostings.length > 0 && (
        <aside className="mt-10 rounded-lg border border-black/10 p-4">
          <h2 className="text-sm font-semibold text-neutral-700">
            {locale === "hi" ? "संबंधित नौकरी पोस्टिंग" : "Related Job Postings"}
          </h2>
          <ul className="mt-2 space-y-1">
            {relatedPostings.map((posting) => (
              <li key={posting.id}>
                <Link
                  href={`/${locale}/jobs/${posting.slug}`}
                  className="font-medium underline hover:no-underline"
                >
                  {locale === "hi" ? posting.titleHi || posting.title : posting.title}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}

      {/* Breadcrumb Navigation */}
      <nav className="mt-12 pt-6 border-t text-sm text-neutral-600">
        <Link href="/" className="hover:underline">
          {locale === "hi" ? "होम" : "Home"}
        </Link>
        {" / "}
        <Link href="/articles" className="hover:underline">
          {locale === "hi" ? "लेख" : "Articles"}
        </Link>
        {" / "}
        <span>{title}</span>
      </nav>
    </article>
  );
}
