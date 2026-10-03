import Link from "next/link";
import { getDb } from "@/db";
import { articles, categories, organizations, postings } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import {
  createArticle,
  createCategory,
  createOrganization,
  createPosting,
  logoutAction,
  approvePosting,
  rejectPosting,
} from "./actions";
import { STAGE_LABELS } from "@/lib/labels";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const db = getDb();
  const [orgs, cats, postingRows, pendingRows, articleRows] = await Promise.all([
    db.select().from(organizations).orderBy(desc(organizations.createdAt)),
    db.select().from(categories).orderBy(desc(categories.createdAt)),
    db.select().from(postings).orderBy(desc(postings.createdAt)).limit(50),
    db.select().from(postings).where(eq(postings.reviewStatus, "PENDING")).orderBy(desc(postings.createdAt)).limit(100),
    db.select().from(articles).orderBy(desc(articles.createdAt)).limit(50),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-12 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin</h1>
        <form action={logoutAction}>
          <SubmitButton className="text-sm underline" pendingText="Logging out…">
            Log out
          </SubmitButton>
        </form>
      </div>

      <section>
        <h2 className="text-lg font-semibold">Review Queue ({pendingRows.length} pending)</h2>
        {pendingRows.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">All postings approved! ✓</p>
        ) : (
          <div className="mt-3 space-y-3 max-h-96 overflow-y-auto border border-black/10 rounded-md p-4">
            {pendingRows.map((p) => (
              <div key={p.id} className="flex items-start justify-between gap-4 rounded-md border border-black/10 bg-neutral-900/30 p-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{p.title}</div>
                  <div className="text-xs text-neutral-500 mt-1">
                    ID: {p.id} | Score: {p.confidence}% | Source: {p.source}
                  </div>
                  {p.description && (
                    <div className="mt-1 text-xs text-neutral-600 line-clamp-1">{p.description}</div>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <form action={approvePosting}>
                    <input type="hidden" name="postingId" value={p.id} />
                    <SubmitButton
                      className="btn text-xs px-2 py-1 bg-green-600 hover:bg-green-700"
                      pendingText="…"
                    >
                      ✓
                    </SubmitButton>
                  </form>
                  <form action={rejectPosting}>
                    <input type="hidden" name="postingId" value={p.id} />
                    <SubmitButton
                      className="btn text-xs px-2 py-1 bg-red-600 hover:bg-red-700"
                      pendingText="…"
                    >
                      ✕
                    </SubmitButton>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Organizations</h2>
        <form action={createOrganization} className="mt-3 grid grid-cols-2 gap-2 rounded-md border border-black/10 p-4 sm:grid-cols-3">
          <input name="name" aria-label="Name" placeholder="Name *" required className="input" />
          <input name="slug" aria-label="Slug" placeholder="Slug (auto if blank)" className="input" />
          <select name="sector" aria-label="Sector" className="input">
            <option value="GOVERNMENT_CENTRAL">Govt — Central</option>
            <option value="GOVERNMENT_STATE">Govt — State</option>
            <option value="PSU">PSU</option>
            <option value="BANKING">Banking</option>
            <option value="DEFENCE">Defence</option>
            <option value="RAILWAY">Railway</option>
            <option value="PRIVATE">Private</option>
          </select>
          <input name="state" aria-label="State (if state govt)" placeholder="State (if state govt)" className="input" />
          <input name="websiteUrl" aria-label="Website URL" placeholder="Website URL" className="input col-span-2" />
          <textarea name="description" aria-label="Description" placeholder="Description" className="input col-span-3" />
          <SubmitButton className="btn col-span-3 sm:col-span-1" pendingText="Adding…">
            Add Organization
          </SubmitButton>
        </form>
        <ul className="mt-3 divide-y divide-black/10 text-sm">
          {orgs.map((o) => (
            <li key={o.id} className="py-2">
              #{o.id} {o.name} — <span className="text-neutral-500">{o.slug}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Categories</h2>
        <form action={createCategory} className="mt-3 grid grid-cols-2 gap-2 rounded-md border border-black/10 p-4 sm:grid-cols-3">
          <input name="name" aria-label="Name" placeholder="Name *" required className="input" />
          <input name="slug" aria-label="Slug" placeholder="Slug (auto if blank)" className="input" />
          <input name="description" aria-label="Description" placeholder="Description" className="input" />
          <SubmitButton className="btn col-span-3 sm:col-span-1" pendingText="Adding…">
            Add Category
          </SubmitButton>
        </form>
        <ul className="mt-3 divide-y divide-black/10 text-sm">
          {cats.map((c) => (
            <li key={c.id} className="py-2">
              #{c.id} {c.name} — <span className="text-neutral-500">{c.slug}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Postings</h2>
        <form action={createPosting} className="mt-3 grid grid-cols-2 gap-2 rounded-md border border-black/10 p-4 sm:grid-cols-3">
          <input name="title" aria-label="Title" placeholder="Title *" required className="input col-span-2" />
          <select name="organizationId" aria-label="Organization" required className="input">
            <option value="">Organization *</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <select name="kind" aria-label="Kind" className="input">
            <option value="GOVERNMENT">Government</option>
            <option value="PRIVATE">Private</option>
          </select>
          <select name="currentStage" aria-label="Current stage" className="input">
            {Object.entries(STAGE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input name="totalVacancies" type="number" aria-label="Vacancies" placeholder="Vacancies" className="input" />
          <input name="locationCity" aria-label="City" placeholder="City" className="input" />
          <input name="locationRegion" aria-label="State/Region" placeholder="State/Region" className="input" />
          <input name="ageLimitMin" type="number" aria-label="Min age" placeholder="Min Age" className="input" />
          <input name="ageLimitMax" type="number" aria-label="Max age" placeholder="Max Age" className="input" />
          <input name="applicationFeeGeneral" type="number" aria-label="Fee (general)" placeholder="Fee (General)" className="input" />
          <input name="applicationFeeReserved" type="number" aria-label="Fee (reserved)" placeholder="Fee (Reserved)" className="input" />
          <input name="salaryMin" type="number" aria-label="Salary/pay min" placeholder="Salary/Pay Min" className="input" />
          <input name="salaryMax" type="number" aria-label="Salary/pay max" placeholder="Salary/Pay Max" className="input" />
          <input name="validThrough" type="date" aria-label="Last date" placeholder="Last Date" className="input" />
          <input name="examDate" type="date" aria-label="Exam date" placeholder="Exam Date" className="input" />
          <input name="officialNotificationUrl" aria-label="Official notification URL" placeholder="Official Notification URL" className="input col-span-2" />
          <input name="applyUrl" aria-label="Apply URL" placeholder="Apply URL" className="input" />
          <textarea name="eligibility" aria-label="Eligibility" placeholder="Eligibility" className="input col-span-3" />
          <textarea name="description" aria-label="Description" placeholder="Description *" required className="input col-span-3" rows={4} />
          <SubmitButton className="btn col-span-3 sm:col-span-1" pendingText="Creating…">
            Create Posting
          </SubmitButton>
        </form>
        <ul className="mt-3 divide-y divide-black/10 text-sm">
          {postingRows.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2">
              <span>
                #{p.id} {p.title} —{" "}
                <span className="text-neutral-500">
                  {STAGE_LABELS[p.currentStage] ?? p.currentStage}
                </span>
              </span>
              <Link href={`/admin/postings/${p.id}`} className="underline">
                Edit
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Articles</h2>
        <form action={createArticle} className="mt-3 grid grid-cols-2 gap-2 rounded-md border border-black/10 p-4 sm:grid-cols-3">
          <input name="title" aria-label="Title" placeholder="Title *" required className="input col-span-2" />
          <select name="type" aria-label="Type" className="input">
            <option value="GUIDE">Guide</option>
            <option value="SYLLABUS">Syllabus</option>
            <option value="EXAM_PATTERN">Exam Pattern</option>
            <option value="PREVIOUS_PAPERS">Previous Papers</option>
            <option value="ADMIT_CARD_GUIDE">Admit Card Guide</option>
            <option value="RESULT_GUIDE">Result Guide</option>
            <option value="CUTOFF">Cutoff</option>
            <option value="SALARY_REPORT">Salary Report</option>
            <option value="INTERVIEW_PREP">Interview Prep</option>
            <option value="COMPARISON">Comparison</option>
            <option value="NEWS">News</option>
            <option value="COMPANY_REVIEW">Company Review</option>
          </select>
          <select name="postingId" aria-label="Link to posting" className="input">
            <option value="">Link to posting (optional)</option>
            {postingRows.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <input name="authorName" aria-label="Author" placeholder="Author" className="input" />
          <input name="dek" aria-label="Short summary" placeholder="Short summary (dek)" className="input col-span-3" />
          <textarea name="body" aria-label="Body" placeholder="Body *" required className="input col-span-3" rows={6} />
          <SubmitButton className="btn col-span-3 sm:col-span-1" pendingText="Publishing…">
            Publish Article
          </SubmitButton>
        </form>
        <ul className="mt-3 divide-y divide-black/10 text-sm">
          {articleRows.map((a) => (
            <li key={a.id} className="py-2">
              #{a.id} {a.title}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
