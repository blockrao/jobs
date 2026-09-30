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
          <button className="text-sm underline">Log out</button>
        </form>
      </div>

      <section>
        <h2 className="text-lg font-semibold">Organizations</h2>
        <form action={createOrganization} className="mt-3 grid grid-cols-2 gap-2 rounded-md border border-black/10 p-4 sm:grid-cols-3">
          <input name="name" placeholder="Name *" required className="input" />
          <input name="slug" placeholder="Slug (auto if blank)" className="input" />
          <select name="sector" className="input">
            <option value="GOVERNMENT_CENTRAL">Govt — Central</option>
            <option value="GOVERNMENT_STATE">Govt — State</option>
            <option value="PSU">PSU</option>
            <option value="BANKING">Banking</option>
            <option value="DEFENCE">Defence</option>
            <option value="RAILWAY">Railway</option>
            <option value="PRIVATE">Private</option>
          </select>
          <input name="state" placeholder="State (if state govt)" className="input" />
          <input name="websiteUrl" placeholder="Website URL" className="input col-span-2" />
          <textarea name="description" placeholder="Description" className="input col-span-3" />
          <button className="btn col-span-3 sm:col-span-1">Add Organization</button>
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
          <input name="name" placeholder="Name *" required className="input" />
          <input name="slug" placeholder="Slug (auto if blank)" className="input" />
          <input name="description" placeholder="Description" className="input" />
          <button className="btn col-span-3 sm:col-span-1">Add Category</button>
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
        <h2 className="text-lg font-semibold">Review Queue ({pendingRows.length} pending)</h2>
        {pendingRows.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">All postings approved! ✓</p>
        ) : (
          <div className="mt-3 space-y-3">
            {pendingRows.map((p) => (
              <div key={p.id} className="flex items-start justify-between gap-4 rounded-md border border-black/10 p-4">
                <div className="flex-1">
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-xs text-neutral-500">
                    ID: {p.id} | Confidence: {p.confidence}% | Source: {p.source}
                  </div>
                  {p.description && (
                    <div className="mt-2 text-xs text-neutral-600 line-clamp-2">{p.description}</div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <form action={approvePosting}>
                    <input type="hidden" name="postingId" value={p.id} />
                    <button className="btn w-20 bg-green-600 hover:bg-green-700">Approve</button>
                  </form>
                  <form action={rejectPosting}>
                    <input type="hidden" name="postingId" value={p.id} />
                    <button className="btn w-20 bg-red-600 hover:bg-red-700">Reject</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Postings</h2>
        <form action={createPosting} className="mt-3 grid grid-cols-2 gap-2 rounded-md border border-black/10 p-4 sm:grid-cols-3">
          <input name="title" placeholder="Title *" required className="input col-span-2" />
          <select name="organizationId" required className="input">
            <option value="">Organization *</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <select name="kind" className="input">
            <option value="GOVERNMENT">Government</option>
            <option value="PRIVATE">Private</option>
          </select>
          <select name="currentStage" className="input">
            {Object.entries(STAGE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input name="totalVacancies" type="number" placeholder="Vacancies" className="input" />
          <input name="locationCity" placeholder="City" className="input" />
          <input name="locationRegion" placeholder="State/Region" className="input" />
          <input name="ageLimitMin" type="number" placeholder="Min Age" className="input" />
          <input name="ageLimitMax" type="number" placeholder="Max Age" className="input" />
          <input name="applicationFeeGeneral" type="number" placeholder="Fee (General)" className="input" />
          <input name="applicationFeeReserved" type="number" placeholder="Fee (Reserved)" className="input" />
          <input name="salaryMin" type="number" placeholder="Salary/Pay Min" className="input" />
          <input name="salaryMax" type="number" placeholder="Salary/Pay Max" className="input" />
          <input name="validThrough" type="date" placeholder="Last Date" className="input" />
          <input name="examDate" type="date" placeholder="Exam Date" className="input" />
          <input name="officialNotificationUrl" placeholder="Official Notification URL" className="input col-span-2" />
          <input name="applyUrl" placeholder="Apply URL" className="input" />
          <textarea name="eligibility" placeholder="Eligibility" className="input col-span-3" />
          <textarea name="description" placeholder="Description *" required className="input col-span-3" rows={4} />
          <button className="btn col-span-3 sm:col-span-1">Create Posting</button>
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
          <input name="title" placeholder="Title *" required className="input col-span-2" />
          <select name="type" className="input">
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
          <select name="postingId" className="input">
            <option value="">Link to posting (optional)</option>
            {postingRows.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <input name="authorName" placeholder="Author" className="input" />
          <input name="dek" placeholder="Short summary (dek)" className="input col-span-3" />
          <textarea name="body" placeholder="Body *" required className="input col-span-3" rows={6} />
          <button className="btn col-span-3 sm:col-span-1">Publish Article</button>
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
