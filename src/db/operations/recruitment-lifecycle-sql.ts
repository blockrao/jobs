/**
 * Shared SQL expression for the canonical recruitment lifecycle.
 *
 * Keep this policy aligned with src/lib/lifecycle.ts:
 * - sentinel years >= 2090 and implausible years < 1900 are unknown;
 * - CLOSED / RESULTS / ARCHIVED take precedence over deadlines;
 * - a passed exclusive deadline cutoff closes ACTIVE and UPCOMING;
 * - ACTIVE is open, UPCOMING is upcoming;
 * - unknown status falls back to a plausible deadline, as the TS helper does.
 *
 * Use only for canonical recruitments. Do not apply to legacy postings.
 */
import { sql, type SQL, type SQLWrapper } from "drizzle-orm";

export function recruitmentLifecycleStateSql(
  status: SQLWrapper,
  applicationEndDate: SQLWrapper,
  now: SQLWrapper = sql`now()`,
): SQL {
  const normalizedStatus = sql`upper(coalesce(${status}::text, ''))`;
  const utcYear = sql`extract(year from (${applicationEndDate} at time zone 'UTC'))`;
  const plausibleDeadline = sql`(
    ${applicationEndDate} is not null
    and ${utcYear} >= 1900
    and ${utcYear} < 2090
  )`;
  const deadlinePassed = sql`(${plausibleDeadline} and ${applicationEndDate} <= ${now})`;

  return sql`case
    when ${normalizedStatus} = 'ARCHIVED' then 'archived'
    when ${normalizedStatus} = 'RESULTS' then 'results'
    when ${normalizedStatus} = 'CLOSED' or ${deadlinePassed} then 'closed'
    when ${normalizedStatus} = 'ACTIVE' then 'open'
    when ${normalizedStatus} = 'UPCOMING' then 'upcoming'
    when ${plausibleDeadline} then 'open'
    else 'closed'
  end`;
}

export function recruitmentIsLiveSql(
  status: SQLWrapper,
  applicationEndDate: SQLWrapper,
  now: SQLWrapper = sql`now()`,
): SQL {
  return sql`(${recruitmentLifecycleStateSql(status, applicationEndDate, now)} in ('open', 'upcoming'))`;
}

export function recruitmentIsOpenSql(
  status: SQLWrapper,
  applicationEndDate: SQLWrapper,
  now: SQLWrapper = sql`now()`,
): SQL {
  return sql`(${recruitmentLifecycleStateSql(status, applicationEndDate, now)} = 'open')`;
}

/** SQL projection that suppresses missing, sentinel and implausible deadlines in public output. */
export function plausibleRecruitmentDeadlineSql(applicationEndDate: SQLWrapper): SQL<Date | null> {
  const utcYear = sql`extract(year from (${applicationEndDate} at time zone 'UTC'))`;
  return sql<Date | null>`case
    when ${applicationEndDate} is null
      or ${utcYear} < 1900
      or ${utcYear} >= 2090
    then null
    else ${applicationEndDate}
  end`;
}
