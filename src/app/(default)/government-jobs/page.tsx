import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { discoveryHubMetadata } from "@/lib/seo/discovery-hub-metadata";
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

const FAQ = [
  {
    q: "Where can I find government jobs in India?",
    a: "Browse current and upcoming government recruitment posts on this page, including central and state departments, railways, banks, defence organisations and public-sector undertakings. Open an individual post to review its details and check the recruiting body's official notification before applying.",
  },
  {
    q: "How do I apply for a government job?",
    a: "Open the relevant job post, read the notification issued by the recruiting body, confirm eligibility and submit your application through the recruiting body's official application process. JobOye does not collect application fees.",
  },
  {
    q: "How should I confirm a vacancy or application deadline?",
    a: "Recruiting bodies can revise vacancy details, eligibility and application dates through corrigenda or extensions. Always use the latest notice on the recruiting body's official website as the final reference before applying.",
  },
  {
    q: "Can I find government jobs by sector?",
    a: "Yes. Use the sector pages to browse central government, state government, railway, banking, defence and public-sector undertaking recruitment.",
  },
];

function formatCount(value: number) {
  return value.toLocaleString("en-IN");
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const suffix = page > 1 ? ` — Page ${page}` : "";
  const year = new Date().getFullYear();
  const title = `Government Jobs in India: Current & Upcoming Vacancies ${year}${suffix}`;
  const description =
    "Explore current and upcoming government jobs in India across central and state departments, railways, banks, defence and PSUs. Browse recruitment posts, vacancy details and application deadlines.";

  return discoveryHubMetadata({
    title,
    description,
    // Page-number query views are alternate representations of this discovery
    // hub, not separate canonical entities.
    canonicalPath: "/government-jobs",
    indexable: page === 1,
    ogImageAlt: `Government Jobs in India — Current and Upcoming Vacancies ${year}`,
  });
}

export default async function AllGovernmentJobsPage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const year = new Date().getFullYear();

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

  const pagePath = page > 1 ? `/government-jobs?page=${page}` : "/government-jobs";
  const schema = jsonLdGraph(
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Government Jobs in India", path: "/government-jobs" },
    ]),
    {
      "@type": "CollectionPage",
      "@id": `${SITE_URL}${pagePath}#collection`,
      name: `Government Jobs in India — Current and Upcoming Vacancies`,
      description:
        "A directory of current and upcoming government recruitment posts across central and state departments, railways, banking, defence and public-sector undertakings in India.",
      url: `${SITE_URL}${pagePath}`,
      inLanguage: "en-IN",
      isPartOf: { "@id": `${SITE_URL}#website` },
      mainEntity: { "@id": `${SITE_URL}${pagePath}#job-list` },
    },
  );

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${SITE_URL}${pagePath}#job-list`,
    name: "Government job vacancies",
    description: "Current and upcoming government recruitment posts listed on JobOye.",
    numberOfItems: posts.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: posts.map((post, index) => ({
      "@type": "ListItem",
      position: (page - 1) * PAGE_SIZE + index + 1,
      name: post.postName,
      url: `${SITE_URL}/jobs/${post.recruitmentSlug}/${post.postSlug}`,
    })),
  };

  return (
    <div className="bg-slate-50/70">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />

      <div className="mx-auto max-w-7xl px-2 pb-14 pt-4 sm:px-6 sm:pt-5 lg:px-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Link href="/" className="transition hover:text-indigo-700">Home</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="text-slate-700">Government Jobs in India</span>
        </nav>

        <header className="relative isolate mt-5 overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-9 text-white shadow-xl shadow-slate-900/10 sm:px-10 sm:py-12 lg:px-12">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-32 -z-10 h-96 w-96 rounded-full bg-indigo-500/25 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 right-1/3 -z-10 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              India-wide recruitment directory
            </p>
            <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Government Jobs in India
              <span className="mt-2 block text-2xl font-semibold tracking-tight text-indigo-200 sm:text-3xl">
                Current and upcoming vacancies · {year}
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Discover government recruitment opportunities across India. Browse central and state departments, railways, banks, defence organisations and PSUs, then review each post and confirm the latest details in the recruiting body&apos;s official notification.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/search" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                Search jobs <span aria-hidden="true" className="ml-2">→</span>
              </Link>
              <Link href="/closing-soon" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                View jobs closing soon
              </Link>
            </div>
          </div>
          <div className="mt-9 grid max-w-xl grid-cols-2 gap-3 border-t border-white/10 pt-6 sm:mt-10 sm:gap-6">
            <div>
              <p className="text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">{formatCount(total)}</p>
              <p className="mt-1 text-xs font-medium text-slate-400 sm:text-sm">Current and upcoming posts listed</p>
            </div>
            <div>
              <p className="text-3xl font-bold tracking-tight sm:text-4xl">{SECTORS.length}</p>
              <p className="mt-1 text-xs font-medium text-slate-400 sm:text-sm">Major recruitment sectors</p>
            </div>
          </div>
        </header>

        <section className="mt-10" aria-labelledby="browse-by-sector">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">Explore opportunities</p>
              <h2 id="browse-by-sector" className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Browse government jobs by sector
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Choose a recruitment sector to narrow your search and explore its dedicated job listings.
              </p>
            </div>
            <Link href="/categories" className="text-sm font-semibold text-indigo-700 transition hover:text-indigo-900">
              View all categories <span aria-hidden="true">→</span>
            </Link>
          </div>

          <nav aria-label="Government jobs by sector" className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {SECTORS.map((sector) => {
              const count = sector.sectors.reduce((sum, item) => sum + (counts[item] ?? 0), 0);
              return (
                <Link
                  key={sector.slug}
                  href={sectorHref(sector)}
                  className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/[0.02] transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-950/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-2xl transition group-hover:bg-indigo-100" aria-hidden="true">
                    {sector.emoji}
                  </span>
                  <span className="mt-4 block text-sm font-bold text-slate-900">{sector.label} Jobs</span>
                  <span className="mt-1 block text-xs font-medium text-slate-500">{formatCount(count)} posts</span>
                </Link>
              );
            })}
          </nav>
        </section>

        <div className="mt-12 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-10">
          <section aria-labelledby="government-job-list">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">Recruitment opportunities</p>
                <h2 id="government-job-list" className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  Current and upcoming government jobs
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Browse individual posts, their recruiting organisations and available application deadlines.
                </p>
              </div>
              <p className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                Page {page} of listings
              </p>
            </div>

            {posts.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-8 text-center">
                <p className="text-base font-semibold text-slate-900">No current posts in this view</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">Explore a sector page or check back for newly published recruitment opportunities.</p>
                <Link href="/categories" className="mt-4 inline-flex font-semibold text-indigo-700 hover:text-indigo-900">Browse sectors <span aria-hidden="true" className="ml-1">→</span></Link>
              </div>
            ) : (
              <ul className="mt-5 space-y-3">
                {posts.map((post) => {
                  const lifecycle = deriveLifecycle(post.recruitmentStatus, post.applicationEndDate);
                  const deadline = lifecycle.deadline ? formatDate(lifecycle.deadline, "en-IN") : "Not listed";
                  const statusText = lifecycle.state === "open" ? "Applications open" : lifecycle.state === "upcoming" ? "Upcoming" : lifecycleLabel(lifecycle.state);
                  const urgent = lifecycle.state === "open" && lifecycle.daysLeft !== null && lifecycle.daysLeft >= 0 && lifecycle.daysLeft <= 7;
                  const detailHref = `/jobs/${post.recruitmentSlug}/${post.postSlug}`;

                  return (
                    <li key={post.postId}>
                      <article className="group overflow-hidden rounded-[1.35rem] border border-slate-200/90 bg-white p-3.5 shadow-sm shadow-slate-900/[0.025] transition duration-200 hover:border-indigo-200 hover:shadow-lg hover:shadow-slate-900/[0.06] sm:rounded-2xl sm:p-5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2.5 sm:gap-4">
                            <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-sm font-bold tracking-wide text-indigo-700 sm:h-12 sm:w-12">
                              {initials(post.orgName) || "GO"}
                            </span>
                            <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
                              <span className={urgent
                                ? "inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700"
                                : lifecycle.state === "open"
                                  ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700"
                                  : "inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700"
                              }>
                                {urgent ? "Closing soon" : statusText}
                              </span>
                              {post.vacancyTotal != null && post.vacancyTotal > 0 && (
                                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                                  {formatCount(post.vacancyTotal)} vacancies
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 min-w-0 sm:mt-2">
                            <h3 className="text-lg font-bold leading-6 tracking-tight text-slate-950 sm:text-lg">
                              <Link href={detailHref} className="rounded-sm decoration-2 underline-offset-4 transition group-hover:text-indigo-700 group-hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                                {post.postName}
                              </Link>
                            </h3>

                            <div className="mt-1.5 space-y-1 text-[15px] leading-5 text-slate-600 sm:flex sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-1 sm:space-y-0 sm:text-sm">
                              <Link href={`/organizations/${post.orgSlug}`} className="font-semibold text-slate-700 hover:text-indigo-700 hover:underline">
                                {post.orgName}
                              </Link>
                              <span aria-hidden="true" className="hidden text-slate-300 sm:inline">·</span>
                              <Link href={recruitmentHref({ slug: post.recruitmentSlug })} className="min-w-0 hover:text-indigo-700 hover:underline">
                                {post.recruitmentName}
                              </Link>
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                              <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-slate-600 sm:text-sm">
                                <span aria-hidden="true" className="text-slate-400">◷</span>
                                <span className="font-medium text-slate-500">Deadline</span>
                                <span className={urgent ? "font-bold text-rose-700" : "font-semibold text-slate-800"}>{deadline}</span>
                              </span>
                              {urgent && <span className="shrink-0 rounded-full bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700">{lifecycle.daysLeft === 0 ? "Last day" : `${lifecycle.daysLeft} days left`}</span>}
                            </div>

                            <div className="mt-3">
                              <Link href={detailHref} className="flex min-h-11 w-full items-center justify-center gap-1 rounded-xl bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 hover:text-indigo-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:w-auto sm:justify-start sm:bg-transparent sm:px-2 sm:py-1 sm:hover:bg-indigo-50">
                                View job details <span aria-hidden="true" className="transition group-hover:translate-x-0.5">→</span>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            )}

            <nav aria-label="Government job listing pages" className="mt-7 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4">
              {page > 1 ? (
                <Link href={`/government-jobs?page=${page - 1}`} rel="prev" className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-indigo-700">
                  <span aria-hidden="true" className="mr-2">←</span> Previous
                </Link>
              ) : <span />}
              <span className="text-xs font-medium text-slate-500">Page {page}</span>
              {hasNext ? (
                <Link href={`/government-jobs?page=${page + 1}`} rel="next" className="inline-flex min-h-10 items-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700">
                  Next page <span aria-hidden="true" className="ml-2">→</span>
                </Link>
              ) : <span />}
            </nav>
          </section>

          <aside className="space-y-5 lg:sticky lg:top-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.025]" aria-labelledby="find-your-jobs">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-indigo-700">Explore by intent</p>
              <h2 id="find-your-jobs" className="mt-2 text-lg font-bold tracking-tight text-slate-950">Find jobs that fit your search</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Use dedicated browse pages to narrow government opportunities by education, location or recruitment type.</p>
              <ul className="mt-4 space-y-1">
                {[
                  { href: "/qualifications", label: "Government jobs by qualification" },
                  { href: "/states", label: "State-wise government jobs" },
                  { href: "/categories/central-government", label: "Central government jobs" },
                  { href: "/categories/state-government", label: "State government jobs" },
                  { href: "/categories/railway", label: "Railway recruitment" },
                  { href: "/categories/banking", label: "Bank jobs" },
                  { href: "/categories/defence", label: "Defence jobs" },
                  { href: "/categories/psu", label: "PSU recruitment" },
                  { href: "/closing-soon", label: "Government jobs closing soon" },
                ].map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="flex min-h-10 items-center justify-between gap-3 rounded-lg px-2 text-sm font-medium text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-800">
                      <span>{item.label}</span><span aria-hidden="true" className="text-slate-400">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5" aria-labelledby="apply-safely">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg text-indigo-700 shadow-sm" aria-hidden="true">✓</div>
              <h2 id="apply-safely" className="mt-3 text-lg font-bold tracking-tight text-slate-950">Before you apply</h2>
              <ol className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
                <li><span className="mr-2 font-bold text-indigo-700">01</span>Read the latest recruitment notification.</li>
                <li><span className="mr-2 font-bold text-indigo-700">02</span>Confirm eligibility, vacancies, fees and dates.</li>
                <li><span className="mr-2 font-bold text-indigo-700">03</span>Apply through the recruiting body&apos;s official process.</li>
              </ol>
              <p className="mt-4 border-t border-indigo-200/70 pt-3 text-xs leading-5 text-slate-600">
                Official notices and corrigenda are the final authority. Details on listing pages are a starting point for your review.
              </p>
            </section>
          </aside>
        </div>

        <section className="mt-14 border-t border-slate-200 pt-9" aria-labelledby="using-government-jobs">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">A better way to shortlist</p>
            <h2 id="using-government-jobs" className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              How to use the government jobs directory
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Start with the sector or state that matches your interests, open the individual post that fits your profile, and use the original recruitment notice to make your final decision. Each job detail page connects the post to its parent recruitment and recruiting organisation.
            </p>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "01", title: "Choose a sector", body: "Explore central government, state services, railways, banking, defence and PSU opportunities." },
              { n: "02", title: "Review the post", body: "Open the individual job page to understand the role and available recruitment information." },
              { n: "03", title: "Check the notice", body: "Confirm eligibility, vacancy count, application fee and deadline in the latest official notice." },
              { n: "04", title: "Apply at source", body: "Use the recruiting body's official application process and keep your submission confirmation." },
            ].map((step) => (
              <article key={step.n} className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-extrabold tracking-[0.15em] text-indigo-700">{step.n}</p>
                <h3 className="mt-3 text-base font-bold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 border-t border-slate-200 pt-9" aria-labelledby="government-jobs-faq">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">Helpful information</p>
            <h2 id="government-jobs-faq" className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Government jobs in India: FAQs
            </h2>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {FAQ.map(({ q, a }) => (
              <article key={q} className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-base font-bold text-slate-900">{q}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{a}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
