import { discoveryHubMetadata } from "@/lib/seo/discovery-hub-metadata";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStateBySlug, STATES } from "@/lib/states/states";
import { listStateJobs } from "@/lib/states/queries";
import { safeQuery } from "@/lib/safe-query";
import { recruitmentHref } from "@/lib/recruitment-href";
import { buildBreadcrumbSchema, buildDiscoveryCollectionPageSchema, buildDiscoveryItemListSchema, jsonLdGraph } from "@/lib/structured-data";
import { formatDate } from "@/lib/labels";
import { lifecycleLabel } from "@/lib/lifecycle";

export const revalidate = 86400; // Phase 1: daily revalidation

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return STATES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const state = getStateBySlug(slug);
  if (!state) return {};
  return discoveryHubMetadata({
    title: `${state.name} Government Jobs ${new Date().getFullYear()} – Latest Notifications`,
    description: `Current government job notifications in ${state.name}: state recruitment bodies, universities, courts and institutions based in ${state.name}, with vacancies, last dates and application links.`,
    canonicalPath: `/states/${state.slug}`,
    ogImageAlt: `${state.name} Government Jobs – JobOye`,
  });
}

export default async function StatePage({ params }: Props) {
  const { slug } = await params;
  const state = getStateBySlug(slug);
  if (!state) notFound();
  const jobs = await safeQuery(() => listStateJobs(slug), []);

  const stateDescription = `Current government job notifications in ${state.name}, including state recruitment bodies, universities, courts and institutions based in the state.`;
  const schema = jsonLdGraph(
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "States", path: "/states" },
      { name: state.name, path: `/states/${state.slug}` },
    ]),
    buildDiscoveryCollectionPageSchema({
      name: `${state.name} Government Jobs`,
      description: stateDescription,
      path: `/states/${state.slug}`,
      itemListPath: `/states/${state.slug}`,
    }),
  );
  const itemList = buildDiscoveryItemListSchema({
    name: `${state.name} government recruitments`,
    description: stateDescription,
    path: `/states/${state.slug}`,
    items: jobs.map((job) => ({ name: job.name, path: recruitmentHref(job) })),
  });
  const others = STATES.filter((s) => s.slug !== state.slug);

  return (
    <div className="mx-auto max-w-7xl rounded-3xl bg-slate-50/70 px-4 py-8 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      <nav className="mb-3 text-sm text-neutral-600">
        <Link href="/" className="hover:underline">Home</Link> /{" "}
        <Link href="/states" className="hover:underline">States</Link> / {state.name}
      </nav>
      <h1 className="text-2xl font-bold tracking-tight">{state.name} Government Jobs</h1>
      <p className="mt-2 max-w-3xl text-neutral-600">
        {jobs.length > 0
          ? `${jobs.length} current government job notification${jobs.length === 1 ? "" : "s"} based in ${state.name}. Each listing links to its full details, last date and official notification.`
          : `There are no current government job notifications placed in ${state.name} right now. Check the main jobs page for all-India recruitments.`}
      </p>

      {jobs.length > 0 && (
        <ul className="mt-6 space-y-3">
          {jobs.map((j) => (
            <li key={j.id} className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md sm:p-5">
              <Link href={recruitmentHref(j)} className="text-lg font-extrabold leading-7 tracking-tight text-slate-950 hover:text-indigo-700 hover:underline sm:text-xl">
                {j.name}
              </Link>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-700">
                <Link href={`/organizations/${j.orgSlug}`} className="hover:underline">{j.orgName}</Link>
                {j.totalVacancies ? ` · ${j.totalVacancies} ${j.totalVacancies === 1 ? "vacancy" : "vacancies"}` : ""}
                {j.postCount > 1 ? ` · ${j.postCount} posts` : ""} · {lifecycleLabel(j.lifecycle.state)}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-600">
                {j.applicationEndDate
                  ? `Last date ${formatDate(j.applicationEndDate)}`
                  : j.notificationDate
                    ? `Notified ${formatDate(j.notificationDate)}`
                    : "Last date not stated in the notification"}
              </p>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Other states and union territories</h2>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {others.map((s) => (
            <li key={s.slug}>
              <Link href={`/states/${s.slug}`} className="text-neutral-700 hover:underline">
                {s.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
