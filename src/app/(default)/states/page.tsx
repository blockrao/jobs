import { pageSeo } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { STATES } from "@/lib/states/states";
import { countCurrentByState } from "@/lib/states/queries";
import { safeQuery } from "@/lib/safe-query";
import { buildBreadcrumbSchema, jsonLdGraph } from "@/lib/structured-data";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Government Jobs by State and Union Territory",
  description:
    "Browse current government job notifications for every Indian state and union territory: state commissions, boards, universities, courts and central institutions located in each state.",
  ...pageSeo("/states"),
};

export default async function StatesIndexPage() {
  const counts = await safeQuery(() => countCurrentByState(), {} as Record<string, number>);
  const schema = jsonLdGraph(
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "States", path: "/states" },
    ]),
  );
  const group = (type: "state" | "union_territory") => STATES.filter((s) => s.type === type);

  const Section = ({ title, items }: { title: string; items: typeof STATES }) => (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">{title}</h2>
      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((s) => (
          <li key={s.slug}>
            <Link
              href={`/states/${s.slug}`}
              className="flex items-center justify-between rounded-md border border-black/10 px-3 py-2 hover:bg-neutral-50"
            >
              <span>{s.name}</span>
              <span className="text-sm text-neutral-500">
                {counts[s.slug] ? `${counts[s.slug]} open` : "—"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <nav className="mb-3 text-sm text-neutral-600">
        <Link href="/" className="hover:underline">Home</Link> / States
      </nav>
      <h1 className="text-2xl font-bold tracking-tight">Government Jobs by State</h1>
      <p className="mt-2 max-w-3xl text-neutral-600">
        Current government recruitment notifications grouped by the state or union territory where the job is
        based. A job appears under a state only when the notification or the recruiting body clearly places it
        there; all-India recruitments are listed on the main jobs page.
      </p>
      <Section title="States" items={group("state")} />
      <Section title="Union territories" items={group("union_territory")} />
    </div>
  );
}
