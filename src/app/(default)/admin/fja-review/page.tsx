import Link from "next/link";
import { asc, eq, ne, or } from "drizzle-orm";
import { getDb } from "@/db";
import { fjaJobInventory, fjaPostInventory } from "@/db/schema";
import { saveFjaCandidate, verifyFjaPostAgainstOfficialSource } from "./actions";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 25;
const periods = ["HOUR", "DAY", "WEEK", "MONTH", "YEAR"];
const salaryTypes = ["FIXED", "RANGE", "PAY_SCALE", "STIPEND", "CONSOLIDATED", "CTC", "OTHER"];

function fieldValue(value: string | number | null | undefined) {
  return value == null ? "" : String(value);
}
function errorMessage(code?: string) {
  const messages: Record<string, string> = {
    "invalid-id": "The selected inventory row was invalid.",
    "salary-range": "Salary minimum must not exceed salary maximum.",
    "age-range": "Minimum age must not exceed maximum age.",
    currency: "Only an explicitly supported currency (INR) can be saved.",
    period: "Choose a valid salary period.",
    "salary-type": "Choose a valid salary type.",
    "reference-date": "Enter the age reference date as a valid ISO date.",
    "verification-evidence": "To verify, enter a source page, a meaningful note, and tick the confirmation box.",
    "missing-official-url": "This recruitment has no official notification URL; it cannot be marked verified.",
    "invalid-official-url": "The official notification URL is invalid.",
    "aggregator-url": "The notification link points to FreeJobAlert, not the official source.",
  };
  return code ? messages[code] ?? "The requested action could not be completed." : null;
}

export default async function FjaReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; verified?: string; offset?: string }>;
}) {
  const params = await searchParams;
  const parsedOffset = Number(params.offset ?? 0);
  const offset = Number.isInteger(parsedOffset) && parsedOffset >= 0 ? Math.floor(parsedOffset / PAGE_SIZE) * PAGE_SIZE : 0;
  const db = getDb();
  const fetched = await db.select({
    post: fjaPostInventory,
    parent: fjaJobInventory,
  }).from(fjaPostInventory)
    .innerJoin(fjaJobInventory, eq(fjaPostInventory.recruitmentInventoryId, fjaJobInventory.id))
    .where(or(
      ne(fjaPostInventory.salaryNormalizationStatus, "MANUALLY_REVIEWED"),
      ne(fjaPostInventory.ageNormalizationStatus, "MANUALLY_REVIEWED"),
      ne(fjaPostInventory.officialVerificationStatus, "VERIFIED"),
    ))
    .orderBy(asc(fjaPostInventory.id))
    .limit(PAGE_SIZE + 1)
    .offset(offset);
  const rows = fetched.slice(0, PAGE_SIZE);
  const hasNext = fetched.length > PAGE_SIZE;
  const message = errorMessage(params.error);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-neutral-500"><Link href="/admin" className="underline">Admin</Link> / FJA review</p>
          <h1 className="mt-1 text-2xl font-bold">FJA candidate review</h1>
          <p className="mt-2 max-w-3xl text-sm text-neutral-600">
            Internal discovery data only. Review raw wording, normalize values, and verify against the linked official notice.
            Saving candidates does not publish or promote them to canonical JobOye records.
          </p>
        </div>
        <Link href="/admin" className="rounded border px-3 py-2 text-sm">Back to Admin</Link>
      </header>

      {message && <p role="alert" className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{message}</p>}
      {params.saved && <p role="status" className="rounded border px-3 py-2 text-sm">Normalized candidate values saved.</p>}
      {params.verified && <p role="status" className="rounded border px-3 py-2 text-sm">Official-source verification recorded for this candidate.</p>}

      <div className="flex items-center justify-between text-sm text-neutral-500">
        <span>Showing candidate rows {offset + 1}–{offset + rows.length}</span>
        <div className="flex gap-3">
          {offset > 0 && <Link className="underline" href={"/admin/fja-review?offset=" + Math.max(0, offset - PAGE_SIZE)}>Previous</Link>}
          {hasNext && <Link className="underline" href={"/admin/fja-review?offset=" + (offset + PAGE_SIZE)}>Next</Link>}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded border p-6 text-sm text-neutral-500">No candidate rows match this review queue.</p>
      ) : rows.map(({ post, parent }) => (
        <article key={post.id} className="space-y-4 rounded-lg border border-black/15 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">{post.postNameRaw || "Unnamed post candidate"}</h2>
              <p className="text-sm text-neutral-500">Candidate ID {post.id} · FJA article {post.externalId} · {post.officialVerificationStatus}</p>
              <p className="mt-1 text-sm">{parent.title}</p>
              <p className="mt-1 break-all text-xs"><a className="underline" href={parent.sourceUrl} target="_blank" rel="noreferrer">Open FreeJobAlert source article</a></p>
              {parent.officialNotificationUrl ? (
                <p className="mt-1 break-all text-xs"><a className="underline" href={parent.officialNotificationUrl} target="_blank" rel="noreferrer">Open official notification URL</a></p>
              ) : <p className="mt-1 text-xs text-red-700">No official notification URL stored for this recruitment.</p>}
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded bg-neutral-100 px-2 py-1">Salary: {post.salaryNormalizationStatus}</span>
              <span className="rounded bg-neutral-100 px-2 py-1">Age: {post.ageNormalizationStatus}</span>
              <span className="rounded bg-neutral-100 px-2 py-1">Verification: {post.officialVerificationStatus}</span>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded bg-neutral-50 p-3">
              <h3 className="text-sm font-semibold">Raw salary evidence</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm">{post.salaryRaw || "No salary wording captured"}</p>
              {post.payLevelRaw && <p className="mt-1 text-sm">Pay level: {post.payLevelRaw}</p>}
            </div>
            <div className="rounded bg-neutral-50 p-3">
              <h3 className="text-sm font-semibold">Raw age evidence</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm">{post.ageLimitRaw || "No age wording captured"}</p>
              {post.ageReferenceDateRaw && <p className="mt-1 text-sm">Reference wording: {post.ageReferenceDateRaw}</p>}
            </div>
          </div>

          <form action={saveFjaCandidate} className="space-y-3 border-t pt-4">
            <input type="hidden" name="postInventoryId" value={post.id} />
            <h3 className="font-semibold">Normalized candidate values</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="space-y-1 text-xs">Salary minimum (INR amount)
                <input name="salaryMin" type="number" min="0" step="0.01" defaultValue={fieldValue(post.salaryMinCandidate)} className="w-full rounded border px-2 py-2 text-sm" />
              </label>
              <label className="space-y-1 text-xs">Salary maximum (INR amount)
                <input name="salaryMax" type="number" min="0" step="0.01" defaultValue={fieldValue(post.salaryMaxCandidate)} className="w-full rounded border px-2 py-2 text-sm" />
              </label>
              <label className="space-y-1 text-xs">Currency
                <select name="salaryCurrency" defaultValue={fieldValue(post.salaryCurrencyCandidate)} className="w-full rounded border px-2 py-2 text-sm">
                  <option value="">Unknown / not explicit</option><option value="INR">INR</option>
                </select>
              </label>
              <label className="space-y-1 text-xs">Pay period
                <select name="salaryPeriod" defaultValue={fieldValue(post.salaryPeriodCandidate)} className="w-full rounded border px-2 py-2 text-sm">
                  <option value="">Unknown / not explicit</option>{periods.map((period) => <option key={period} value={period}>{period}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-xs">Salary structure
                <select name="salaryType" defaultValue={fieldValue(post.salaryTypeCandidate)} className="w-full rounded border px-2 py-2 text-sm">
                  <option value="">Unknown / needs review</option>{salaryTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-xs">Minimum age (years)
                <input name="minAge" type="number" min="14" max="100" step="1" defaultValue={fieldValue(post.minAgeYearsCandidate)} className="w-full rounded border px-2 py-2 text-sm" />
              </label>
              <label className="space-y-1 text-xs">Maximum age (years)
                <input name="maxAge" type="number" min="14" max="100" step="1" defaultValue={fieldValue(post.maxAgeYearsCandidate)} className="w-full rounded border px-2 py-2 text-sm" />
              </label>
              <label className="space-y-1 text-xs">Age reference date
                <input name="ageReferenceDate" type="date" defaultValue={fieldValue(post.ageReferenceDateCandidate)} className="w-full rounded border px-2 py-2 text-sm" />
              </label>
            </div>
            <button type="submit" className="rounded bg-neutral-900 px-4 py-2 text-sm font-semibold text-white">Save normalized values</button>
            <p className="text-xs text-neutral-500">Saving marks the salary and age fields as manually reviewed, including an intentional decision that a field is not present. It does not mark the official source as verified.</p>
          </form>

          <form action={verifyFjaPostAgainstOfficialSource} className="space-y-3 border-t pt-4">
            <input type="hidden" name="postInventoryId" value={post.id} />
            <h3 className="font-semibold">Official-source verification</h3>
            <p className="text-sm text-neutral-600">Open the official notification above and compare this post's facts with the document. An official URL, source page, written note, and explicit confirmation are required.</p>
            <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
              <label className="space-y-1 text-xs">Official PDF/page number
                <input name="officialSourcePage" type="number" min="1" step="1" required defaultValue={fieldValue(post.officialSourcePage)} className="w-full rounded border px-2 py-2 text-sm" />
              </label>
              <label className="space-y-1 text-xs">Verification note
                <textarea name="verificationNotes" required minLength={12} defaultValue={post.verificationNotes ?? ""} placeholder="What did you compare and what matched?" className="min-h-20 w-full rounded border px-2 py-2 text-sm" />
              </label>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="confirmOfficialSource" value="yes" required className="mt-1" />
              I personally checked this post against the linked official notification; this is not an inference from FreeJobAlert.
            </label>
            <button type="submit" className="rounded border border-neutral-900 px-4 py-2 text-sm font-semibold">Record official verification</button>
          </form>
        </article>
      ))}
    </main>
  );
}
