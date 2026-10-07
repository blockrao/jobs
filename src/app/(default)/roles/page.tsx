import type { Metadata } from "next";
import Link from "next/link";
import { pageSeo } from "@/lib/seo";
import { ROLE_REGISTRY } from "@/lib/roles";

export const revalidate = 3600;

const SECTOR_ORDER = [
  "Science & Research",
  "Healthcare",
  "Teaching & Education",
  "Administration",
  "Finance",
  "Technical",
  "Agriculture & Environment",
];

export async function generateMetadata(): Promise<Metadata> {
  const seo = pageSeo("/roles");
  return {
    title: "Government Job Roles — Browse by Post Name",
    description:
      "Browse all government job roles on JobOye. Find active recruitments, vacancy counts and official notifications for Junior Research Fellow, Medical Officer, Staff Nurse, Accountant and more.",
    alternates: seo.alternates,
    openGraph: {
      title: "Government Job Roles — Browse by Post Name",
      description:
        "Browse all government job roles on JobOye. Find active recruitments, vacancy counts and official notifications.",
      url: "/roles",
      type: "website",
    },
  };
}

export default function RolesIndexPage() {
  const bySector = SECTOR_ORDER.map((sector) => ({
    sector,
    roles: ROLE_REGISTRY.filter((r) => r.sector === sector),
  })).filter((g) => g.roles.length > 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-neutral-900 mb-3">
          Government Job Roles
        </h1>
        <p className="text-lg text-neutral-600">
          Browse active government recruitments by post name. Each page aggregates
          all current notifications, vacancy counts and official notification links
          for that role.
        </p>
      </div>

      <div className="space-y-8">
        {bySector.map(({ sector, roles }) => (
          <div key={sector}>
            <h2 className="text-lg font-semibold text-neutral-500 uppercase tracking-wide mb-3">
              {sector}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {roles.map((role) => (
                <Link
                  key={role.slug}
                  href={`/roles/${role.slug}`}
                  className="group flex items-center justify-between p-4 border border-neutral-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <span className="font-medium text-neutral-900 group-hover:text-blue-700">
                    {role.name}
                  </span>
                  <span className="text-neutral-400 text-sm">→</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 pt-6 border-t text-sm text-neutral-500">
        <Link href="/" className="hover:underline">Home</Link>
        {" / "}
        <span>Job Roles</span>
      </div>
    </div>
  );
}
