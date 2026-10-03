# Architecture contract tests

Automated checks for the frozen architectural invariants in the Controlled
Architecture Implementation Protocol. Introduced by change **W1A-001**
(`docs/ARCHITECTURE_CHANGELOG.md`).

A failing test here means the implementation violates an agreed invariant.
Several fail today on purpose: they were written to expose current defects,
and each goes green only when the wave that owns it lands. **Never edit an
assertion to make it pass** — fix the implementation, or raise the invariant
for review.

## Running

| Command | What runs | Needs |
| --- | --- | --- |
| `npm run test:contracts` | `unit/` and `static/` suites | nothing (no DB, no network, no server) |
| `CONTRACT_DATABASE_URL=… npm run test:contracts` | adds `db/` | a Postgres URL; a read-only role is enough |
| `CONTRACT_BASE_URL=https://www.joboye.com npm run test:contracts` | adds `http/` | a reachable deployment |
| `npm run test:contracts:typecheck` | type-checks the tests | nothing |

The `db/` suite never reads `DATABASE_URL`, so a plain test run cannot touch
production. All `db/` queries are `SELECT`-only; all `http/` requests are
plain `GET`s.

`tests/` is excluded from the root `tsconfig.json`, so test code can never
break `next build`.

## Suites

- `unit/` — calls the real `generateMetadata`, sitemap, robots and
  structured-data functions with the data layer mocked.
- `static/` — reads the repository's own source to assert structural rules
  ("exactly one place builds X").
- `db/` — live-database invariants; `db/invariants.ts` is the single list.
- `http/` — raw server responses, no JavaScript. The only place the
  server-side `<html lang>` and real status codes can be proven.

## Invariant index

`Owner` is the wave expected to turn a currently failing invariant green.

| ID | Invariant | Suite | Owner if failing |
| --- | --- | --- | --- |
| ENT-01 | Recruitment always has an Organization | static, db | — |
| ENT-02 | Exam is optional on Recruitment | static, db | — |
| ENT-03 | Post belongs to a Recruitment | static, db | — |
| ENT-04 | Post references a Position | static, db | — |
| ENT-05 | Position is evergreen | static, db | — |
| ENT-06 | Foreign keys target entity IDs, never slugs | static, db | — |
| ENT-07 | Entity resolution never uses a slug as identity | static | W1-B |
| ENT-08a–d | Duplicate canonical entities are detectable (and absent) | db | W1-B |
| ENT-09a–b | Posting → Post → Recruitment → Organization links agree | db | — |
| ENT-10 | Slugs are unique per entity type | db | — |
| CAN-01 | Canonical is absolute with no query string | unit, http | W1-D (`/jobs?kind=`) |
| CAN-02 | Canonical is self-referencing | unit, http | — |
| CAN-03 | Canonical/hreflang never point at a redirect | unit, http | — |
| CAN-04 | English and Hindi URLs address the same entity | unit | — |
| CAN-05 | One SEO layer builds canonical/hreflang/robots | static | W1-D |
| LOC-01 | Server response carries the correct `<html lang>` | static, http | W1-D |
| LOC-02 | Untranslated Hindi page is noindex | unit, http | W1-D |
| LOC-03 | Hreflang only when both versions exist, and reciprocal | unit, http | W1-D |
| LOC-04 | Translated Hindi page stays indexable | unit | — |
| LOC-05 | Sitemap lists a Hindi alternate only when translated | unit | W1-D |
| SD-01 | JobPosting only on the individual job leaf page | static, http | — |
| SD-02 | No JobPosting once a job is closed, expired or untitled | unit | — |
| SD-03 | No schema builder outside the shared library | static | W1-D |
| SD-04 | All JSON-LD goes through `jsonLdGraph` | static | W1-D |
| SD-05 | JobPosting identity sits on the canonical URL | unit | — |
| SD-06 | No JobPosting on parent/listing/utility pages | static | — |
| SD-07, SD-08 | Shared builder behaviour | unit | — |
| IDX-01 | Search is noindex | unit, http | W1-D |
| IDX-02 | Filter views are noindex | unit, http | W1-D |
| IDX-03 | Eligible canonical entity pages are indexable | unit, http | — |
| IDX-04 | Sitemap holds only canonical URLs | unit | — |
| IDX-05 | robots.txt blocks only private technical paths | unit | — |
| IDX-06 | Every indexable entity type has a sitemap source | unit | after W1-B (see test comment) |
| SCH-01 | Live columns = `src/db/schema.ts` columns | db | W2 |
| HTTP-01 | Unknown slug returns 404 | http | — |
| HTTP-02 | `/en/` prefix redirects to the canonical URL | http | — |
