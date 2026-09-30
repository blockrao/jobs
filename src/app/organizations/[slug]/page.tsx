import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrganizationBySlug } from "@/lib/queries";
import { buildBreadcrumbSchema, buildOrganizationSchema, jsonLdGraph } from "@/lib/structured-data";
import { STAGE_LABELS, formatDate } from "@/lib/labels";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getOrganizationBySlug(slug);
  if (!result) return {};
  return {
    title: `${result.org.name} — Jobs & Recruitment Notifications`,
    description:
      result.org.description ??
      `Latest recruitment notifications and job openings from ${result.org.name}.`,
    alternates: { canonical: `/organizations/${result.org.slug}` },
  };
}

export default async function OrganizationPage({ params }: Props) {
  const { slug } = await params;
  const result = await getOrganizationBySlug(slug);
  if (!result) notFound();
  const { org, postings } = result;

  const schema = jsonLdGraph(
    buildOrganizationSchema(org),
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: org.name, path: `/organizations/${org.slug}` },
    ]),
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <h1 className="text-2xl font-bold tracking-tight">{org.name}</h1>
      {org.description && (
        <p className="mt-2 max-w-2xl text-neutral-600">{org.description}</p>
      )}
      {org.websiteUrl && (
        <a
          href={org.websiteUrl}
          target="_blank"
          rel="noopener nofollow"
          className="mt-2 inline-block text-sm underline"
        >
          Official Website
        </a>
      )}

      <h2 className="mt-8 text-lg font-semibold">
        Recruitment Notifications ({postings.length})
      </h2>
      <ul className="mt-3 divide-y divide-black/10">
        {postings.map((posting) => (
          <li key={posting.id} className="py-4">
            <Link
              href={`/jobs/${posting.slug}`}
              className="font-semibold hover:underline"
            >
              {posting.title}
            </Link>
            <p className="text-sm text-neutral-600">
              {STAGE_LABELS[posting.currentStage] ?? posting.currentStage} ·
              Posted {formatDate(posting.datePosted)}
            </p>
          </li>
        ))}
        {postings.length === 0 && (
          <li className="py-8 text-center text-sm text-neutral-500">
            No postings yet.
          </li>
        )}
      </ul>
    </div>
  );
}
