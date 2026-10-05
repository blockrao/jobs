import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { postings, postingUpdates } from "@/db/schema";
import { updatePostingStage, linkArticleToPosting, unlinkArticleFromPosting } from "../../actions";
import { STAGE_LABELS, formatDate } from "@/lib/labels";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

export default async function AdminPostingDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const postingId = Number(id);
  const db = getDb();
  const posting = await db.query.postings.findFirst({
    where: eq(postings.id, postingId),
    with: { organization: true, postingArticles: { with: { article: true } } },
  });
  if (!posting) notFound();

  const updates = await db
    .select()
    .from(postingUpdates)
    .where(eq(postingUpdates.postingId, postingId));

  const updatePostingStageWithId = updatePostingStage.bind(null, postingId);
  const linkArticleWithId = linkArticleToPosting.bind(null, postingId);
  const linkedArticles = posting.postingArticles ?? [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/admin" className="text-sm underline">
        ← Back to Admin
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{posting.title}</h1>
      <p className="text-neutral-600">{posting.organization.name}</p>
      <p className="mt-1 text-sm">
        Current stage:{" "}
        <strong>{STAGE_LABELS[posting.currentStage] ?? posting.currentStage}</strong>
      </p>
      <Link
        href={`/jobs/${posting.slug}`}
        target="_blank"
        className="mt-1 inline-block text-sm underline"
      >
        View live page →
      </Link>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Push a Timeline Update</h2>
        <form
          action={updatePostingStageWithId}
          className="mt-3 grid grid-cols-2 gap-2 rounded-md border border-black/10 p-4"
        >
          <select name="stage" aria-label="Stage" required className="input col-span-2">
            {Object.entries(STAGE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            name="updateTitle"
            aria-label="Update title"
            placeholder="Update title (e.g. Admit card released)"
            required
            className="input col-span-2"
          />
          <input name="eventDate" type="date" aria-label="Event date" className="input" />
          <input name="updateLink" aria-label="Link" placeholder="Link (optional)" className="input" />
          <textarea
            name="updateDescription"
            aria-label="Description"
            placeholder="Description (optional)"
            className="input col-span-2"
          />
          <SubmitButton className="btn col-span-2" pendingText="Pushing…">
            Push Update
          </SubmitButton>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Linked Articles</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Articles linked here appear as related guides on the job page and emit reciprocal structured-data references for Google.
        </p>
        {linkedArticles.length > 0 && (
          <ul className="mt-3 space-y-2 text-sm">
            {linkedArticles.map((pa) => {
              const unlinkWithIds = unlinkArticleFromPosting.bind(null, postingId, pa.article.id);
              return (
                <li key={pa.article.id} className="flex items-center justify-between gap-2 rounded-md border border-black/10 px-3 py-2">
                  <div>
                    <Link
                      href={`/articles/${pa.article.slug}`}
                      target="_blank"
                      className="font-medium underline"
                    >
                      {pa.article.title}
                    </Link>
                    <span className="ml-2 text-xs text-neutral-400">
                      #{pa.article.id} · {pa.article.status}
                    </span>
                  </div>
                  <form action={unlinkWithIds}>
                    <button
                      type="submit"
                      className="text-xs text-red-600 hover:underline"
                    >
                      Unlink
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
        {linkedArticles.length === 0 && (
          <p className="mt-3 text-sm text-neutral-500">No articles linked yet.</p>
        )}
        <form action={linkArticleWithId} className="mt-3 flex gap-2">
          <input
            name="articleId"
            type="number"
            placeholder="Article ID"
            required
            className="input w-32"
          />
          <SubmitButton className="btn" pendingText="Linking…">
            Link Article
          </SubmitButton>
        </form>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Timeline History</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {updates.map((u) => (
            <li key={u.id} className="border-b border-black/10 pb-2">
              {formatDate(u.eventDate)} — {STAGE_LABELS[u.stage] ?? u.stage}:{" "}
              {u.title}
            </li>
          ))}
          {updates.length === 0 && (
            <li className="text-neutral-500">No updates yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
