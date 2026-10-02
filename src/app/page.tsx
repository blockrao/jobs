import { listArticles, listCategories, listPostings } from "@/lib/queries";
import { HomeContent } from "@/components/home-content";

export const revalidate = 120;

export default async function Home() {
  let govtJobs: Awaited<ReturnType<typeof listPostings>> = [];
  let privateJobs: Awaited<ReturnType<typeof listPostings>> = [];
  let categories: Awaited<ReturnType<typeof listCategories>> = [];
  let articles: Awaited<ReturnType<typeof listArticles>> = [];
  try {
    const results = await Promise.all([
      listPostings({ kind: "GOVERNMENT", limit: 8 }).catch(() => []),
      listPostings({ kind: "PRIVATE", limit: 8 }).catch(() => []),
      listCategories().catch(() => []),
      listArticles({ limit: 6 }).catch(() => []),
    ]);
    [govtJobs, privateJobs, categories, articles] = results;
  } catch {
    govtJobs = [];
    privateJobs = [];
    categories = [];
    articles = [];
  }

  // All the actual rendering — including which language to show — lives in
  // HomeContent, a client component that reads the visitor's saved
  // language cookie. Doing it there instead of here keeps this page a
  // plain static/ISR server component (○ Static per `next build`, same as
  // before): the data fetched above already includes every row's Hindi
  // fields regardless of locale, so there's nothing locale-specific about
  // the fetch itself, only about how it's displayed.
  return (
    <HomeContent
      govtJobs={govtJobs}
      privateJobs={privateJobs}
      categories={categories}
      articles={articles}
    />
  );
}
