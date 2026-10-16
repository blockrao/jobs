import Link from "next/link";
import { getDb } from "@/db";
import { posts, recruitments, organizations } from "@/db/schema";
import { desc, ilike, or, sql, eq } from "drizzle-orm";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

interface PostsListProps {
  searchParams: Promise<{
    q?: string;
    limit?: string;
    offset?: string;
  }>;
}

async function PostsList({ searchParams }: PostsListProps) {
  const { q = "", limit = "50", offset = "0" } = await searchParams;
  const db = getDb();

  const limitNum = Math.min(parseInt(limit) || 50, 200);
  const offsetNum = Math.max(parseInt(offset) || 0, 0);

  // Build search query with proper joins
  const baseQuery = db
    .select({
      id: posts.id,
      name: posts.name,
      slug: posts.slug,
      organizationName: organizations.name,
      recruitmentSlug: recruitments.slug,
      recruitmentName: recruitments.name,
      vacancyTotal: posts.vacancyTotal,
      updatedAt: posts.updatedAt,
    })
    .from(posts)
    .innerJoin(recruitments, eq(posts.recruitmentId, recruitments.id))
    .leftJoin(organizations, eq(recruitments.organizationId, organizations.id))
    .orderBy(desc(posts.updatedAt));

  // Apply search filter
  let query = baseQuery;
  if (q) {
    query = query.where(
      or(
        ilike(posts.name, `%${q}%`),
        ilike(posts.slug, `%${q}%`),
        ilike(recruitments.name, `%${q}%`),
        ilike(organizations.name, `%${q}%`)
      )
    );
  }

  query = query.limit(limitNum).offset(offsetNum);

  // Get total count
  let countQuery = db
    .select({ count: sql<number>`count(*)::int` })
    .from(posts)
    .innerJoin(recruitments, eq(posts.recruitmentId, recruitments.id))
    .leftJoin(organizations, eq(recruitments.organizationId, organizations.id));

  if (q) {
    countQuery = countQuery.where(
      or(
        ilike(posts.name, `%${q}%`),
        ilike(posts.slug, `%${q}%`),
        ilike(recruitments.name, `%${q}%`),
        ilike(organizations.name, `%${q}%`)
      )
    );
  }

  const countResult = await countQuery;
  const total = countResult[0]?.count ?? 0;
  const postsList = await query;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Posts ({total} total)
        </h2>
      </div>

      <div className="rounded-md border border-neutral-200 overflow-hidden">
        {postsList.length === 0 ? (
          <div className="p-6 text-center text-neutral-500">
            {q ? "No posts found matching your search." : "No posts found."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Post Name</th>
                  <th className="px-4 py-2 text-left font-semibold">Recruitment</th>
                  <th className="px-4 py-2 text-left font-semibold">Organization</th>
                  <th className="px-4 py-2 text-center font-semibold">Vacancies</th>
                  <th className="px-4 py-2 text-left font-semibold">Updated</th>
                  <th className="px-4 py-2 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {postsList.map((post) => (
                  <tr key={post.id} className="border-b hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <div className="font-medium truncate max-w-xs">{post.name || "—"}</div>
                      <div className="text-xs text-neutral-500">{post.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/posts/${post.id}`}
                        className="text-blue-600 hover:underline text-xs max-w-xs truncate block"
                      >
                        {post.recruitmentName || "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">{post.organizationName || "Unknown"}</td>
                    <td className="px-4 py-3 text-center text-sm">{post.vacancyTotal || "—"}</td>
                    <td className="px-4 py-3 text-xs text-neutral-500">
                      {post.updatedAt ? new Date(post.updatedAt).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/posts/${post.id}`}
                        className="text-blue-600 hover:underline text-xs font-medium"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-neutral-600">
          Showing {Math.min(offsetNum + 1, total)} to {Math.min(offsetNum + limitNum, total)} of {total}
        </div>
        <div className="flex gap-2">
          {offsetNum > 0 && (
            <Link
              href={`?q=${encodeURIComponent(q)}&offset=${Math.max(0, offsetNum - limitNum)}&limit=${limitNum}`}
              className="px-3 py-1 border rounded hover:bg-neutral-50"
            >
              ← Previous
            </Link>
          )}
          {offsetNum + limitNum < total && (
            <Link
              href={`?q=${encodeURIComponent(q)}&offset=${offsetNum + limitNum}&limit=${limitNum}`}
              className="px-3 py-1 border rounded hover:bg-neutral-50"
            >
              Next →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function PostsAdminPage({ searchParams }: PostsListProps) {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Posts Management</h1>
        <Link href="/admin" className="text-sm text-blue-600 hover:underline">
          ← Back to Admin
        </Link>
      </div>

      {/* Search */}
      <form method="GET" className="flex gap-2">
        <input
          type="search"
          name="q"
          placeholder="Search posts, recruitments, organizations…"
          defaultValue={await searchParams.then(p => p.q || "")}
          className="flex-1 px-4 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
        >
          Search
        </button>
      </form>

      <Suspense fallback={<div className="text-center py-8 text-neutral-500">Loading posts…</div>}>
        <PostsList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
