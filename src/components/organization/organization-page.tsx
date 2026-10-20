/**
 * Organization entity page — server-rendered, zero client JavaScript.
 *
 * Every figure on this page comes from canonical recruitment/post records
 * (see src/lib/organizations/stats.ts). There are no typical ranges, typical
 * timelines, estimated applicants, predicted cycles or editorial FAQs: if a
 * fact is not in a notification JobOye holds, it is not on the page.
 */
import Link from "next/link";
import type { OrganizationRow } from "@/lib/organizations/resolve";
import type { OrganizationStats, OrgRecruitment } from "@/lib/organizations/stats";
import { lifecycleLabel } from "@/lib/lifecycle";
import { formatCurrencyRange, formatDate } from "@/lib/labels";
import { recruitmentHref } from "@/lib/recruitment-href";
import { SECTORS } from "@/lib/sectors";

const SECTOR_LABEL: Record<string, string> = Object.fromEntries(
  SECTORS.flatMap((s) => s.sectors.map((k) => [k, s.label])),
);

function sectorSlugFor(sector: string): string | null {
  return SECTORS.find((s) => (s.sectors as readonly string[]).includes(sector))?.slug ?? null;
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function RecruitmentList({ rows, showCountdown }: { rows: OrgRecruitment[]; showCountdown: boolean }) {
  return (
    <ul className="divide-y divide-black/10">
      {rows.map((r) => {
        const d = r.lifecycle.daysLeft;
        const lastDate = r.applicationEndDate ? formatDate(r.applicationEndDate) : null;
        return (
          <li key={r.id} className="py-3.5">
            <Link href={recruitmentHref(r)} className="font-semibold text-[17px] leading-snug text-neutral-900 hover:text-brand-700">
              {r.name}
            </Link>
            <p className="mt-0.5 text-sm text-neutral-600">
              {r.totalVacancies != null && r.totalVacancies > 0 && (
                <>{r.totalVacancies.toLocaleString("en-IN")} {r.totalVacancies === 1 ? "vacancy" : "vacancies"} · </>
              )}
              {r.postCount > 1 && <>{r.postCount} posts · </>}
              {lastDate ? <>Last date {lastDate}</> : <>Last date not stated in the notification</>}
              {showCountdown && d != null && d >= 0 && (
                <span className="ml-2 inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800">
                  {d === 0 ? "Closes today" : d === 1 ? "Closes tomorrow" : `${d} days left`}
                </span>
              )}
              {!showCountdown && (
                <span className="ml-2 inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600">
                  {lifecycleLabel(r.lifecycle.state)}
                </span>
              )}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export function OrganizationPage({ org, stats }: { org: OrganizationRow; stats: OrganizationStats }) {
  const sectorLabel = SECTOR_LABEL[org.sector];
  const sectorSlug = sectorSlugFor(org.sector);
  const rolesWithSalary = stats.roles.filter((r) => r.salaryMin || r.salaryMax);
  const recentClosed = stats.closed.slice(0, 25);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-3 text-sm text-neutral-600">
        <Link href="/" className="hover:underline">Home</Link> /{" "}
        <Link href="/organizations" className="hover:underline">Organisations</Link> / {org.name}
      </nav>

      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{org.name}</h1>
        <p className="mt-2 max-w-3xl text-neutral-600">
          {stats.live.length > 0
            ? `${stats.live.length} current recruitment${stats.live.length === 1 ? "" : "s"} from ${org.name}` +
              (stats.liveVacancies ? ` with ${stats.liveVacancies.toLocaleString("en-IN")} vacancies stated` : "") +
              `. ${stats.recruitments.length} notification${stats.recruitments.length === 1 ? "" : "s"} on record.`
            : `No recruitment from ${org.name} is currently open. ${stats.recruitments.length} notification${stats.recruitments.length === 1 ? "" : "s"} on record.`}
        </p>
      </header>

      <section aria-label="At a glance" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-black/10 p-4">
          <div className="text-2xl font-bold tabular-nums">{stats.live.length}</div>
          <div className="text-sm text-neutral-600">Open recruitments</div>
        </div>
        <div className="rounded-lg border border-black/10 p-4">
          <div className="text-2xl font-bold tabular-nums">{stats.liveVacancies != null ? stats.liveVacancies.toLocaleString("en-IN") : "—"}</div>
          <div className="text-sm text-neutral-600">Vacancies (open)</div>
        </div>
        <div className="rounded-lg border border-black/10 p-4">
          <div className="text-2xl font-bold tabular-nums">{stats.recruitments.length}</div>
          <div className="text-sm text-neutral-600">Notifications on record</div>
        </div>
        <div className="rounded-lg border border-black/10 p-4">
          <div className="text-2xl font-bold tabular-nums">{stats.nextDeadline ? formatDate(stats.nextDeadline) : "—"}</div>
          <div className="text-sm text-neutral-600">Next closing date</div>
        </div>
      </section>

      {stats.live.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Open recruitments</h2>
          <RecruitmentList rows={stats.live} showCountdown />
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold">About {org.name}</h2>
        <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-[160px_minmax(0,1fr)]">
          {sectorLabel && (
            <>
              <dt className="text-neutral-500">Sector</dt>
              <dd>{sectorSlug ? <Link href={`/categories/${sectorSlug}`} className="hover:underline">{sectorLabel}</Link> : sectorLabel}</dd>
            </>
          )}
          {org.state && (
            <>
              <dt className="text-neutral-500">State</dt>
              <dd>{org.state}</dd>
            </>
          )}
          {org.headquarters && (
            <>
              <dt className="text-neutral-500">Headquarters</dt>
              <dd>{org.headquarters}</dd>
            </>
          )}
          {org.websiteUrl && (
            <>
              <dt className="text-neutral-500">Official website</dt>
              <dd><a href={org.websiteUrl} rel="noopener noreferrer nofollow" target="_blank" className="hover:underline">{hostname(org.websiteUrl)}</a></dd>
            </>
          )}
          {stats.latestNotification && (
            <>
              <dt className="text-neutral-500">Latest notification</dt>
              <dd>{formatDate(stats.latestNotification)}</dd>
            </>
          )}
        </dl>
        {org.description && <p className="mt-4 max-w-3xl leading-relaxed text-neutral-700">{org.description}</p>}
      </section>

      {stats.roles.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Posts {org.name} recruits for</h2>
          <p className="mt-1 text-sm text-neutral-600">From the notifications on record. Pay is shown only where a notification states it.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-neutral-500">
                <tr>
                  <th className="py-2 pr-4 font-medium">Post</th>
                  <th className="py-2 pr-4 font-medium">Recruitments</th>
                  {rolesWithSalary.length > 0 && <th className="py-2 font-medium">Pay stated</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {stats.roles.map((r) => (
                  <tr key={r.name}>
                    <td className="py-2 pr-4">{r.name}</td>
                    <td className="py-2 pr-4 tabular-nums">{r.recruitmentCount}</td>
                    {rolesWithSalary.length > 0 && (
                      <td className="py-2 tabular-nums">{formatCurrencyRange(r.salaryMin, r.salaryMax, "INR", "MONTH", true) ?? "—"}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {stats.exams.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Exams used by {org.name}</h2>
          <ul className="mt-3 flex flex-wrap gap-2 text-sm">
            {stats.exams.map((e) => (
              <li key={e.slug} className="rounded-md border border-black/10 px-3 py-1.5">
                {e.name} <span className="text-neutral-500">· {e.recruitmentCount}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {recentClosed.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Recruitment history</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Closed notifications stay on record so past cycles, posts and vacancies can be checked.
            {stats.closed.length > recentClosed.length && ` Showing the latest ${recentClosed.length} of ${stats.closed.length}.`}
          </p>
          <RecruitmentList rows={recentClosed} showCountdown={false} />
        </section>
      )}

      <p className="mt-10 text-sm text-neutral-600">
        <Link href="/jobs" className="hover:underline">All current government jobs</Link> ·{" "}
        <Link href="/organizations" className="hover:underline">All organisations</Link>
      </p>
    </div>
  );
}
