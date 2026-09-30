import Link from "next/link";
import { listArticles, listCategories, listPostings } from "@/lib/queries";
import { STAGE_LABELS, formatDate } from "@/lib/labels";

export const revalidate = 120;

export default async function Home() {
  const [govtJobs, privateJobs, categories, articles] = await Promise.all([
    listPostings({ kind: "GOVERNMENT", limit: 8 }),
    listPostings({ kind: "PRIVATE", limit: 8 }),
    listCategories(),
    listArticles({ limit: 6 }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <section className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Govt & Private Job Notifications, Results, and Guides
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-neutral-600">
          One permanent page per notification — from announcement to admit
          card to result — plus in-depth guides on syllabus, exam pattern,
          and salary.
        </p>
        <form action="/jobs" method="get" className="mx-auto mt-6 flex max-w-lg gap-2">
          <input
            type="search"
            name="q"
            placeholder="Search jobs, exams, departments..."
            className="w-full rounded-md border border-black/20 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Search
          </button>
        </form>
      </section>

      <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <JobColumn
          title="Latest Government Jobs"
          href="/jobs?kind=GOVERNMENT"
          postings={govtJobs}
        />
        <JobColumn
          title="Latest Private Jobs"
          href="/jobs?kind=PRIVATE"
          postings={privateJobs}
        />
      </div>

      {categories.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-semibold">Browse by Category</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="rounded-full border border-black/10 px-3 py-1.5 text-sm hover:border-black/30"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {articles.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-semibold">Guides & Articles</h2>
          <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {articles.map((article) => (
              <li key={article.id}>
                <Link
                  href={`/articles/${article.slug}`}
                  className="block rounded-md border border-black/10 px-4 py-3 hover:border-black/30"
                >
                  <span className="font-medium">{article.title}</span>
                  {article.dek && (
                    <p className="text-sm text-neutral-600">{article.dek}</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function JobColumn({
  title,
  href,
  postings,
}: {
  title: string;
  href: string;
  postings: Awaited<ReturnType<typeof listPostings>>;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Link href={href} className="text-sm underline">
          View all
        </Link>
      </div>
      <ul className="mt-3 divide-y divide-black/10">
        {postings.map((posting) => (
          <li key={posting.id} className="py-3">
            <Link
              href={`/jobs/${posting.slug}`}
              className="font-medium hover:underline"
            >
              {posting.title}
            </Link>
            <p className="text-sm text-neutral-600">
              {posting.organization.name} ·{" "}
              {STAGE_LABELS[posting.currentStage] ?? posting.currentStage}
            </p>
            <p className="text-xs text-neutral-400">
              {formatDate(posting.datePosted)}
            </p>
          </li>
        ))}
        {postings.length === 0 && (
          <li className="py-6 text-sm text-neutral-500">
            No postings yet — check back soon.
          </li>
        )}
      </ul>
    </section>
  );
}
