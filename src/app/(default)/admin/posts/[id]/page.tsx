import { notFound } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/db";
import { posts, recruitments, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { updatePostAction } from "../actions";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

interface EditPostPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}

export default async function EditPostPage({ params, searchParams }: EditPostPageProps) {
  const { id: idParam } = await params;
  const { saved } = await searchParams;
  const db = getDb();

  const postId = parseInt(idParam, 10);
  if (isNaN(postId)) notFound();

  // Fetch post with related data
  const postData = await db
    .select({
      id: posts.id,
      name: posts.name,
      slug: posts.slug,
      description: posts.description,
      vacancyTotal: posts.vacancyTotal,
      salaryMin: posts.salaryMin,
      salaryMax: posts.salaryMax,
      recruitmentId: posts.recruitmentId,
      positionId: posts.positionId,
      recruitmentName: recruitments.name,
      recruitmentSlug: recruitments.slug,
      organizationId: organizations.id,
      orgName: organizations.name,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
    })
    .from(posts)
    .innerJoin(recruitments, eq(posts.recruitmentId, recruitments.id))
    .leftJoin(organizations, eq(recruitments.organizationId, organizations.id))
    .where(eq(posts.id, postId))
    .limit(1);

  if (postData.length === 0) {
    notFound();
  }

  const post = postData[0];

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      {saved && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
          ✓ Post updated successfully
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{post.name || "Untitled Post"}</h1>
          <p className="text-sm text-neutral-600 mt-1">ID: {postId}</p>
        </div>
        <Link href="/admin/posts" className="text-sm text-blue-600 hover:underline">
          ← Back to Posts
        </Link>
      </div>

      {/* Post Info Card */}
      <div className="rounded-md border border-neutral-200 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs font-semibold text-neutral-600">Recruitment</span>
            <p className="text-sm mt-1">{post.recruitmentName}</p>
            <p className="text-xs text-neutral-500">{post.recruitmentSlug}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-neutral-600">Organization</span>
            <p className="text-sm mt-1">{post.orgName || post.organizationName || "Unknown"}</p>
            <p className="text-xs text-neutral-500">Sector: {post.organizationSector}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-neutral-600">Status</span>
            <p className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${
              post.isLive
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}>
              {post.isLive ? "Live" : "Inactive"}
            </p>
          </div>
          <div>
            <span className="text-xs font-semibold text-neutral-600">Vacancies</span>
            <p className="text-sm mt-1">{post.vacancyTotal || "—"}</p>
          </div>
        </div>

        {post.officialSourceUrl && (
          <div>
            <span className="text-xs font-semibold text-neutral-600">Official Source</span>
            <a
              href={post.officialSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline mt-1 block truncate"
            >
              {post.officialSourceUrl}
            </a>
          </div>
        )}
      </div>

      {/* Edit Form */}
      <form action={updatePostAction} className="rounded-md border border-neutral-200 p-6 space-y-4">
        <input type="hidden" name="id" value={postId} />

        <div>
          <label className="block text-sm font-semibold text-neutral-700 mb-2">
            Post Name *
          </label>
          <input
            type="text"
            name="name"
            defaultValue={post.name || ""}
            required
            className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-neutral-700 mb-2">
            Slug *
          </label>
          <input
            type="text"
            name="slug"
            defaultValue={post.slug || ""}
            required
            className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-neutral-700 mb-2">
            Description
          </label>
          <textarea
            name="description"
            defaultValue={post.description || ""}
            rows={4}
            className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-2">
              Salary Min (₹)
            </label>
            <input
              type="number"
              name="salaryMin"
              defaultValue={post.salaryMin || ""}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-2">
              Salary Max (₹)
            </label>
            <input
              type="number"
              name="salaryMax"
              defaultValue={post.salaryMax || ""}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-neutral-700 mb-2">
            Vacancies
          </label>
          <input
            type="number"
            name="vacancyTotal"
            defaultValue={post.vacancyTotal || ""}
            className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2 pt-4">
          <SubmitButton className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700">
            Save Changes
          </SubmitButton>
          <Link
            href="/admin/posts"
            className="px-4 py-2 border border-neutral-300 rounded-md text-sm font-medium hover:bg-neutral-50"
          >
            Cancel
          </Link>
        </div>
      </form>

      {/* Debug Info */}
      <div className="rounded-md bg-neutral-50 border border-neutral-200 p-4">
        <h3 className="text-sm font-semibold text-neutral-700 mb-2">Debug Info</h3>
        <div className="text-xs text-neutral-600 space-y-1 font-mono">
          <div>Post ID: {postId}</div>
          <div>Recruitment ID: {post.recruitmentId}</div>
          <div>Position ID: {post.positionId}</div>
          <div>Created: {post.createdAt.toLocaleDateString("en-IN")}</div>
          <div>Updated: {post.updatedAt.toLocaleDateString("en-IN")}</div>
        </div>
      </div>
    </div>
  );
}
