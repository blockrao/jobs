import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageSeo } from "@/lib/seo";
import { hasDb, listLivePostsBySector, countLivePostsBySector } from "@/lib/queries";
import { deriveLifecycle, lifecycleLabel } from "@/lib/lifecycle";
import { SECTORS, sectorHref } from "@/lib/sectors";
import { parsePage } from "@/lib/pagination";
import { formatDate } from "@/lib/labels";
import { SITE_URL } from "@/lib/site";
import { recruitmentHref } from "@/lib/recruitment-href";
import { jsonLdGraph, buildBreadcrumbSchema } from "@/lib/structured-data";

export const revalidate = 3600;
const PAGE_SIZE = 100;
const ALL_SECTORS = [...new Set(SECTORS.flatMap((sector) => sector.sectors))];

type Props = { searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const suffix = page > 1 ? ` — Page ${page}` : "";
  const path = page > 1 ? `/government-jobs?page=${page}` : "/government-jobs";
  return {
    title: `All Government Jobs in India 2026 — Latest Govt Vacancies${suffix} | JobOye`,
    description:
      "Find the latest government jobs in India across central and state departments, railways, banks, defence and PSUs. Compare vacancies, qualifications, application deadlines and available notification links.",
    ...pageSeo(path),
  };
}

const FAQ = [
  {
    q: "Where can I find all current government job vacancies?",
    a: "This page brings together open recruitment posts across central and state government departments, railways, banks, defence organisations and public-sector undertakings. Open each post to review available details and check the notification against the recruiting body's official website.",
  },
  {
    q: "How do I apply for a government job?",
    a: "Open the relevant post, read the notice issued by the recruiting body, confirm eligibility and submit your application through its official website. JobOye does not collect application fees.",
  },
  {
    q: "Are the vacancies and last dates verified?",
    a: "Job details are shown from the available recruitment records. Before applying, confirm the final vacancy count, eligibility and closing date in the official notification because recruiting bodies can issue corrigenda or extensions.",
  },
  {
    q: "Can I browse jobs by sector?",
    a: "Yes. Browse central government, state government, railway, banking, defence and PSU recruitment hubs to narrow the list.",
  },
];

export default async function AllGovernmentJobsPage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  if (!hasDb()) throw new Error("[government-jobs] DATABASE_URL is not configured");
  // Let database failures reach the route error boundary. Returning []/{} here
  // would publish a convincing but false "no jobs" page and zero sector counts.
  const [rows, counts] = await Promise.all([
    listLivePostsBySector(ALL_SECTORS, { limit: PAGE_SIZE + 1, offset: (page - 1) * PAGE_SIZE }),
    countLivePostsBySector(),
  ]);

  const hasNext = rows.length > PAGE_SIZE;
  const posts = hasNext ? rows.slice(0, PAGE_SIZE) : rows;
  const total = ALL_SECTORS.reduce((sum, sector) => sum + (counts[sector] ?? 0), 0);
  if (page > 1 && posts.length === 0) notFound();

  const schema = jsonLdGraph(
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "All Government Jobs", path: "/government-jobs" },
    ]),
  );
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "All Government Jobs in India",
    description: "Open government recruitment posts with vacancy details, deadlines and available application links.",
    numberOfItems: posts.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: posts.map((post, index) => ({
      "@type": "ListItem",
      position: (page - 1) * PAGE_SIZE + index + 1,
      name: post.postName,
      url: `${SITE_URL}/jobs/${post.recruitmentSlug}/${post.postSlug}`,
    })),
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <nav aria-label="Breadcrumb" className="text-sm text-neutral-500">
        <Link href="/" className="hover:underline">Home</Link>
        {" / "}
        <span className="text-neutral-800">All Government Jobs</span>
      </nav>

      <header className="mt-4 border-b border-black/10 pb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">India-wide recruitment directory</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">All Government Jobs in India 2026</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-neutral-600">
          Explore current central and state government vacancies, railway recruitment, bank jobs, defence opportunities and PSU careers in one place. Compare post names, vacancy counts and application deadlines, then check the available notification and application links against the recruiting body's official website before applying.
        </p>
        <p className="mt-3 text-sm text-neutral-600">
          {total.toLocaleString("en-IN")} listed posts · Page data refreshes hourly · Always confirm eligibility and dates in the official notification.
        </p>
      </header>

      <nav aria-label="Browse government jobs by category" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {SECTORS.map((sector) => (
          <Link key={sector.slug} href={sectorHref(sector)} className="rounded-xl border border-black/10 p-3 transition hover:border-brand-500 hover:bg-neutral-50">
            <span className="block text-xl" aria-hidden="true">{sector.emoji}</span>
            <span className="mt-1 block font-semibold">{sector.label} Jobs</span>
            <span className="mt-1 block text-sm text-neutral-500">{(sector.sectors.reduce((sum, s) => sum + (counts[s] ?? 0), 0)).toLocaleString("en-IN")} posts</span>
          </Link>
        ))}
      </nav>

      <section aria-labelledby="browse-more-government-jobs" className="mt-8 rounded-xl border border-black/10 bg-neutral-50 p-5">
        <h2 id="browse-more-government-jobs" className="text-lg font-bold tracking-tight">Find government jobs that fit you</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-600">
          Start with your education level or location, or prioritise vacancies with approaching deadlines. These browse pages help narrow the national list without replacing the official recruitment notice.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {[
            { href: "/qualifications", label: "Jobs by qualification" },
            { href: "/states", label: "State-wise government jobs" },
            { href: "/categories/central-government", label: "Central government jobs" },
            { href: "/categories/state-government", label: "State government jobs" },
            { href: "/categories/railway", label: "Railway jobs" },
            { href: "/categories/banking", label: "Bank jobs" },
            { href: "/categories/defence", label: "Defence jobs" },
            { href: "/categories/psu", label: "PSU jobs" },
            { href: "/closing-soon", label: "Jobs closing soon" },
            { href: "/jobs", label: "Browse all job listings" },
          ].map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="inline-flex rounded-full border border-black/10 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:border-brand-500 hover:text-brand-700">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8" aria-labelledby="all-open-jobs">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="all-open-jobs" className="text-2xl font-bold tracking-tight">Open Government Vacancies</h2>
            <p className="mt-1 text-sm text-neutral-600">Ordered by application deadline, with undated deadlines later in the list.</p>
          </div>
          <p className="text-sm text-neutral-500">Page {page}</p>
        </div>

        {posts.length === 0 ? (
          <p className="mt-5 rounded-xl border border-black/10 p-5 text-neutral-600">No open posts are available in this view right now. Please check the category pages for the latest listings.</p>
        ) : (
          <ul className="mt-3 divide-y divide-black/10">
            {posts.map((post) => {
              const lifecycle = deriveLifecycle(post.recruitmentStatus, post.applicationEndDate);
              const end = lifecycle.deadline;
              const days = lifecycle.daysLeft;
              const deadline = end ? formatDate(end, "en-IN") : "Closing date not listed";
              return (
                <li key={post.postId} className="py-4">
                  <Link href={`/jobs/${post.recruitmentSlug}/${post.postSlug}`} className="font-semibold leading-6 hover:underline">
                    {post.postName}
                  </Link>
                  <p className="mt-1 text-sm text-neutral-600">
                    <Link href={`/organizations/${post.orgSlug}`} className="hover:underline">{post.orgName}</Link>
                    {" · "}
                    <Link href={recruitmentHref({ slug: post.recruitmentSlug })} className="hover:underline">{post.recruitmentName}</Link>
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <span className={lifecycle.state === "open" ? "font-medium text-green-700" : "font-medium text-blue-700"}>
                      {lifecycleLabel(lifecycle.state)}
                    </span>
                    {post.vacancyTotal != null && <span className="text-neutral-700">{post.vacancyTotal.toLocaleString("en-IN")} vacancies</span>}
                    <span className={days !== null && days <= 7 ? "font-medium text-red-700" : "text-neutral-600"}>
                      Last date: {deadline}{lifecycle.state === "open" && days !== null && days > 0 && days <= 14 ? ` · ${days} days left` : ""}
                    </span>
                    {post.locationStateCode && <span className="text-neutral-500">Location: {post.locationStateCode}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <nav aria-label="Pagination" className="mt-8 flex items-center justify-between border-t border-black/10 pt-5">
          {page > 1 ? <Link href={`/government-jobs?page=${page - 1}`} rel="prev" className="font-semibold hover:underline">← Previous page</Link> : <span />}
          {hasNext && <Link href={`/government-jobs?page=${page + 1}`} rel="next" className="font-semibold hover:underline">Next page →</Link>}
        </nav>
      </section>

      <section className="mt-12 border-t border-black/10 pt-8">
        <h2 className="text-2xl font-bold tracking-tight">How to use this government jobs list</h2>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <article><h3 className="font-semibold">1. Check eligibility first</h3><p className="mt-1 text-sm leading-6 text-neutral-600">Review age limits, educational qualifications, category relaxations, fees and required documents in the official notice.</p></article>
          <article><h3 className="font-semibold">2. Check the deadline</h3><p className="mt-1 text-sm leading-6 text-neutral-600">Prioritise posts closing soon. A deadline may change if the recruiting body publishes an extension or corrigendum.</p></article>
          <article><h3 className="font-semibold">3. Apply through the recruiting body</h3><p className="mt-1 text-sm leading-6 text-neutral-600">Use the available notification and application links, and confirm each one on the recruiting body's official website. Never pay an intermediary to submit an application.</p></article>
          <article><h3 className="font-semibold">4. Browse by recruitment sector</h3><p className="mt-1 text-sm leading-6 text-neutral-600">Use the category hubs above to focus on central government, state government, railways, banking, defence or PSU vacancies.</p></article>
        </div>
      </section>

      <section className="mt-10 border-t border-black/10 pt-8">
        <h2 className="text-2xl font-bold tracking-tight">Frequently asked questions</h2>
        <div className="mt-4 space-y-5">
          {FAQ.map(({ q, a }) => <article key={q}><h3 className="font-semibold">{q}</h3><p className="mt-1 leading-6 text-neutral-600">{a}</p></article>)}
        </div>
      </section>
    </main>
  );
}
