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

  const title = formData.get("title") as string;
  const slug = formData.get("slug") as string;
  const description = formData.get("description") as string || null;
  const organizationName = formData.get("organizationName") as string || null;
  const employmentType = formData.get("employmentType") as string || null;
  const locationCity = formData.get("locationCity") as string || null;
  const locationState = formData.get("locationState") as string || null;
  const locationCountry = formData.get("locationCountry") as string || null;
  const vacancyTotal = formData.get("vacancyTotal") as string;
  const isLive = formData.get("isLive") === "true";
  const officialSourceUrl = formData.get("officialSourceUrl") as string || null;

  if (!title || !slug) {
    throw new Error("Title and slug are required");
  }

  try {
    await db
      .update(posts)
      .set({
        title,
        slug,
        description,
        organizationName,
        employmentType,
        locationCity,
        locationState,
        locationCountry,
        vacancyTotal: vacancyTotal ? parseInt(vacancyTotal) : null,
        isLive,
        officialSourceUrl,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, id));

    redirect(`/admin/posts/${id}?saved=1`);
  } catch (error) {
    console.error("Failed to update post:", error);
    throw new Error("Failed to update post");
  }
}
