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

type Props = { params: Promise<{ slug: string; locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const article = await safeQuery(() => getArticleBySlug(slug), null);
  if (!article) return {};

  const hasHindi = Boolean(article.titleHi);
  const title = locale === "hi" ? article.titleHi || article.title : article.title;
  const dek = locale === "hi" ? article.dekHi || article.dek : article.dek;
  const body = locale === "hi" ? article.bodyHi || article.body : article.body;

  const seo = entitySeo({ base: "/articles", slug: article.slug, locale, hasHindi });

  return {
    title,
    description: dek ?? body.slice(0, 155),
    alternates: seo.alternates,
    robots: seo.robots,
    openGraph: {
      title,
      description: dek ?? undefined,
      type: "article",
      url: seo.url,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug, locale } = await params;
  const article = await safeQuery(() => getArticleBySlug(slug), null);
  if (!article || article.status !== "PUBLISHED") notFound();

  const isHi = locale === "hi";
  const title = isHi ? article.titleHi || article.title : article.title;
  const dek = isHi ? article.dekHi || article.dek : article.dek;
  const body = isHi ? article.bodyHi || article.body : article.body;
  const notTranslatedNotice = isHi && !article.titleHi
    ? "इस लेख का पूरा हिंदी अनुवाद जल्द ही उपलब्ध होगा। नीचे अंग्रेज़ी में विवरण दिया गया है।"
    : null;

  const relatedPostings = article.postingArticles
    .map((pa) => pa.posting)
    .filter((p) => p.reviewStatus === "APPROVED");
  // buildJobPostingSchema always mints the JobPosting @id off the canonical
  // unprefixed URL (absoluteUrl(`/jobs/${slug}`)) regardless of locale — the
  // Article.about[] references must match that exact @id or the graph
  // doesn't actually link up for a crawler walking it.
  const aboutUrls = relatedPostings.map((p) => absoluteUrl(`/jobs/${p.slug}`));

  // No localized homepage or articles hub exists (only this [slug] detail
  // page is under [locale]/articles/ — see root layout.tsx) — point these
  // at the real pages rather than /${locale} URLs that 404 or redirect.
  const breadcrumbItems = [
    { name: locale === "hi" ? "होम" : "Home", path: "/" },
    { name: locale === "hi" ? "लेख" : "Articles", path: "/articles" },
    { name: title, path: locale === "hi" ? `/hi/articles/${article.slug}` : `/articles/${article.slug}` },
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
        {title}
      </h1>
      {dek && (
        <p className="mt-2 text-lg text-neutral-600">{dek}</p>
      )}
      <p className="mt-2 text-xs text-neutral-400">
        {article.authorName ? `By ${article.authorName} · ` : ""}
        {formatDate(article.publishedAt)}
      </p>

      {notTranslatedNotice && (
        <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          {notTranslatedNotice}
        </div>
      )}

      <div className="prose prose-neutral mt-8 max-w-none whitespace-pre-line">
        {body}
      </div>

      {relatedPostings.length > 0 && (
        <aside className="mt-10 rounded-lg border border-black/10 p-4">
          <h2 className="text-sm font-semibold text-neutral-700">
            {locale === "hi" ? "संबंधित नौकरी पोस्टिंग" : "Related Job Postings"}
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {relatedPostings.map((posting) => {
              // Only link into the Hindi job page when this posting actually
              // has Hindi content — otherwise the plain canonical page, same
              // discipline used for job/article links elsewhere (e.g.
              // home-content.tsx). This also means the English locale
              // ("en") links straight to the canonical /jobs/{slug} instead
              // of the non-canonical /en/jobs/{slug}.
              const postingHref =
                isHi && posting.titleHi
                  ? `/hi/jobs/${posting.slug}`
                  : `/jobs/${posting.slug}`;
              const vacancySubtitle =
                posting.totalVacancies != null
                  ? isHi
                    ? `${posting.totalVacancies} रिक्तियां`
                    : `${posting.totalVacancies} vacancies`
                  : isHi
                    ? "विवरण देखें"
                    : "View details";
              return (
                <InfoCard
                  key={posting.id}
                  tone="brand"
                  href={postingHref}
                  title={isHi ? posting.titleHi || posting.title : posting.title}
                  subtitle={vacancySubtitle}
                />
              );
            })}
          </div>
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
