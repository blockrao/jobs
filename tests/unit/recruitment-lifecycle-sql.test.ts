import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import {
  recruitmentIsLiveSql,
  recruitmentIsOpenSql,
  recruitmentLifecycleStateSql,
} from "../../src/db/operations/recruitment-lifecycle-sql";

const dialect = new PgDialect();
const status = sql`r.status`;
const deadline = sql`r.application_end_date`;

describe("shared canonical recruitment lifecycle SQL", () => {
  it("uses the TypeScript lifecycle's plausible UTC-year range and exclusive cutoff", () => {
    const query = dialect.sqlToQuery(recruitmentLifecycleStateSql(status, deadline));
    expect(query.sql).toContain("extract(year from (r.application_end_date at time zone 'UTC'))");
    expect(query.sql).toContain(">= 1900");
    expect(query.sql).toContain("< 2090");
    expect(query.sql).toContain("r.application_end_date <= now()");
  });

  it("treats status overrides and unknown-status fallback consistently", () => {
    const query = dialect.sqlToQuery(recruitmentLifecycleStateSql(status, deadline)).sql;
    expect(query.indexOf("= 'ARCHIVED'")).toBeLessThan(query.indexOf("= 'RESULTS'"));
    expect(query).toContain("= 'CLOSED' or");
    expect(query).toContain("= 'ACTIVE' then 'open'");
    expect(query).toContain("= 'UPCOMING' then 'upcoming'");
    expect(query).toContain("when (");
    expect(query).toContain("else 'closed'");
  });

  it("exposes separate live and open filters while sharing the same state expression", () => {
    const live = dialect.sqlToQuery(recruitmentIsLiveSql(status, deadline)).sql;
    const open = dialect.sqlToQuery(recruitmentIsOpenSql(status, deadline)).sql;
    expect(live).toContain("in ('open', 'upcoming')");
    expect(open).toContain("= 'open'");
    expect(live).toContain("<= now()");
    expect(open).toContain("<= now()");
  });
});
