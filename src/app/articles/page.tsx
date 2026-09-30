import type { Metadata } from "next";
import Link from "next/link";
import { listArticles } from "@/lib/queries";
import { ARTICLE_TYPE_LABELS, formatDate } from "@/lib/labels";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Guides & Articles",
  description:
    "Syllabus breakdowns, exam patterns, previous papers, salary reports, and interview guides for government and private jobs in India.",
  alternates: { canonical: "/articles" },
};

export default async function ArticlesPage() {
  const articles = await listArticles({ limit: 50 });
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Guides & Articles</h1>
      <ul className="mt-6 divide-y divide-black/10">
        {articles.map((article) => (
          <li key={article.id} className="py-4">
            <span className="mb-1 inline-block rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700">
              {ARTICLE_TYPE_LABELS[article.type] ?? article.type}
            </span>
            <Link
              href={`/articles/${article.slug}`}
              className="block text-base font-semibold hover:underline"
            >
              {article.title}
            </Link>
            {article.dek && (
              <p className="text-sm text-neutral-600">{article.dek}</p>
            )}
            <p className="text-xs text-neutral-400">
              {formatDate(article.publishedAt)}
            </p>
          </li>
        ))}
        {articles.length === 0 && (
          <li className="py-8 text-center text-sm text-neutral-500">
            No articles published yet.
          </li>
        )}
      </ul>
    </div>
  );
}
