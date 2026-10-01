import type { Metadata } from "next";
import Link from "next/link";
import { listPostings } from "@/lib/queries";
import { STAGE_LABELS, KIND_LABELS, formatDate } from "@/lib/labels";

export const revalidate = 120;

type Props = {
  searchParams: Promise<{ kind?: string; q?: string }>;
};

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const { kind } = await searchParams;
  const label =
    kind === "GOVERNMENT"
      ? "Government Jobs"
      : kind === "PRIVATE"
        ? "Private Jobs"
        : "All Jobs";
  return {
    title: label,
    description: `Browse the latest ${label.toLowerCase()} notifications and openings across India.`,
    alternates: { canonical: kind ? `/jobs?kind=${kind}` : "/jobs" },
  };
}

export default async function JobsListPage({ searchParams }: Props) {
  const { kind, q } = await searchParams;
  const validKind =
    kind === "GOVERNMENT" || kind === "PRIVATE" ? kind : undefined;
  let results: Awaited<ReturnType<typeof listPostings>> = [];
  try {
    results = await listPostings({ kind: validKind, search: q, limit: 50 });
  } catch {
    results = [];
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">
        {validKind ? `${KIND_LABELS[validKind]} Jobs` : "All Jobs"}
      </h1>

      <form className="mt-4 flex gap-2" action="/jobs" method="get">
        {validKind && <input type="hidden" name="kind" value={validKind} />}
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by title, department, keyword..."
          className="w-full rounded-md border border-black/20 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Search
        </button>
      </form>

      <div className="mt-4 flex gap-3 text-sm">
        <Link
          href="/jobs"
          className={!validKind ? "font-semibold underline" : "text-neutral-600"}
        >
          All
        </Link>
        <Link
          href="/jobs?kind=GOVERNMENT"
          className={
            validKind === "GOVERNMENT"
              ? "font-semibold underline"
              : "text-neutral-600"
          }
        >
          Government
        </Link>
        <Link
          href="/jobs?kind=PRIVATE"
          className={
            validKind === "PRIVATE"
              ? "font-semibold underline"
              : "text-neutral-600"
          }
        >
          Private
        </Link>
      </div>

      <ul className="mt-6 divide-y divide-black/10">
        {results.map((posting) => (
          <li key={posting.id} className="py-4">
            <Link
              href={`/jobs/${posting.slug}`}
              className="text-base font-semibold hover:underline"
            >
              {posting.title}
            </Link>
            <p className="text-sm text-neutral-600">
              {posting.organization.name}
              {posting.locationCity ? ` · ${posting.locationCity}` : ""} ·{" "}
              {STAGE_LABELS[posting.currentStage] ?? posting.currentStage}
            </p>
            <p className="text-xs text-neutral-400">
              Posted {formatDate(posting.datePosted)}
            </p>
          </li>
        ))}
        {results.length === 0 && (
          <li className="py-8 text-center text-sm text-neutral-500">
            No jobs found. Try a different search.
          </li>
        )}
      </ul>
    </div>
  );
}
