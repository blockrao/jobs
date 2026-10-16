"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { posts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function updatePostAction(formData: FormData) {
  const db = getDb();
  const id = formData.get("id") as string;

  if (!id) {
    throw new Error("Post ID is required");
  }

  const postId = parseInt(id, 10);
  if (isNaN(postId)) {
    throw new Error("Invalid post ID");
  }

  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const description = formData.get("description") as string || null;
  const salaryMin = formData.get("salaryMin") as string;
  const salaryMax = formData.get("salaryMax") as string;
  const vacancyTotal = formData.get("vacancyTotal") as string;

  if (!name || !slug) {
    throw new Error("Post name and slug are required");
  }

  try {
    await db
      .update(posts)
      .set({
        name,
        slug,
        description,
        salaryMin: salaryMin ? parseInt(salaryMin) : null,
        salaryMax: salaryMax ? parseInt(salaryMax) : null,
        vacancyTotal: vacancyTotal ? parseInt(vacancyTotal) : null,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, postId));

    redirect(`/admin/posts/${postId}?saved=1`);
  } catch (error) {
    console.error("Failed to update post:", error);
    throw new Error("Failed to update post");
  }
}
