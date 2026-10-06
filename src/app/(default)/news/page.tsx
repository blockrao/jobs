import { pageSeo } from "@/lib/seo";
import Link from "next/link";
import { listArticles } from "@/lib/queries";
import { formatDate } from "@/lib/labels";

export const revalidate = 300;

export const metadata = {
  title: "Latest Job News",
  description: "Stay updated with the latest government job notifications and news.",
  ...pageSeo("/news"),
  openGraph: {
    title: "Latest Government Job News – JobOye",
    description: "Stay updated with the latest government job notifications and news.",
    url: "https://www.joboye.com/news",
    siteName: "JobOye",
    type: "website",
  },
};

export default async function NewsPage() {
  let articles: Awaited<ReturnType<typeof listArticles>> = [];
  try {
    articles = await listArticles({ limit: 50 });
  } catch {
    articles = [];
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Job News & Updates</h1>
      <p className="text-neutral-600 mb-8">
        Latest notifications and important updates on government job openings across India.
      </p>

      {articles.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-neutral-500">No news yet. Check back soon!</p>
        </div>
      ) : (
        <ul className="divide-y divide-black/10">
          {articles.map((article) => (
            <li key={article.id} className="py-6">
              <Link href={`/articles/${article.slug}`} className="group">
                <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">
                  {article.type?.replace(/_/g, " ")}
                </div>
                <h2 className="text-xl font-semibold group-hover:underline mb-2">
                  {article.title}
                </h2>
                {article.dek && (
                  <p className="text-neutral-600 mb-3 line-clamp-2">{article.dek}</p>
                )}
                <div className="flex items-center gap-3 text-sm text-neutral-500">
                  {article.authorName && <span>{article.authorName}</span>}
                  <span>•</span>
                  <time dateTime={article.publishedAt?.toISOString()}>
                    {article.publishedAt ? formatDate(article.publishedAt) : "Recently"}
                  </time>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
