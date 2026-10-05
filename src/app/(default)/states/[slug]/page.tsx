import { pageSeo } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStateBySlug, STATES } from "@/lib/states/states";
import { listStateJobs } from "@/lib/states/queries";
import { safeQuery } from "@/lib/safe-query";
import { buildBreadcrumbSchema, jsonLdGraph } from "@/lib/structured-data";
import { STAGE_LABELS, formatDate } from "@/lib/labels";

export const revalidate = 600;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return STATES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const state = getStateBySlug(slug);
  if (!state) return {};
  const jobs = await safeQuery(() => listStateJobs(slug), []);
  return {
    title: `${state.name} Government Jobs ${new Date().getFullYear()} – Latest Notifications`,
    description: `Current government job notifications in ${state.name}: state recruitment bodies, universities, courts and institutions based in ${state.name}, with vacancies, last dates and application links.`,
    // A state with nothing current is a thin page: keep it out of the index until it has jobs.
    ...pageSeo(`/states/${state.slug}`, { index: jobs.length > 0 }),
  };
}

export default async function StatePage({ params }: Props) {
  const { slug } = await params;
  const state = getStateBySlug(slug);
  if (!state) notFound();
  const jobs = await safeQuery(() => listStateJobs(slug), []);

  const schema = jsonLdGraph(
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "States", path: "/states" },
      { name: state.name, path: `/states/${state.slug}` },
    ]),
  );
  const others = STATES.filter((s) => s.slug !== state.slug);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
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
        <ul className="mt-6 divide-y divide-black/10">
          {jobs.map((j) => (
            <li key={j.id} className="py-4">
              <Link href={`/jobs/${j.slug}`} className="text-base font-semibold hover:underline">
                {j.title}
              </Link>
              <p className="text-sm text-neutral-600">
                {j.organization.name}
                {j.locationCity ? ` · ${j.locationCity}` : ""}
                {j.totalVacancies ? ` · ${j.totalVacancies} ${j.totalVacancies === 1 ? "post" : "posts"}` : ""} ·{" "}
                {STAGE_LABELS[j.currentStage] ?? j.currentStage}
              </p>
              <p className="text-xs text-neutral-400">
                {j.validThrough ? `Last date ${formatDate(j.validThrough)}` : `Posted ${formatDate(j.datePosted)}`}
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
