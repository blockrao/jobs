import { getPostBySlug } from "@/db/operations/get-posts";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Support both slug/postSlug and recruitment/post params
  const recruitmentSlug = searchParams.get("slug") || searchParams.get("recruitment") || "tata-institute-of-social-sciences-2026-07";
  const postSlug = searchParams.get("postSlug") || searchParams.get("post") || "professor-social-work-tuljapur-campus-709-jobs";

  try {
    console.log(`[test-post] Fetching post: ${recruitmentSlug}/${postSlug}`);
    const post = await getPostBySlug(recruitmentSlug, postSlug);
    console.log(`[test-post] Result:`, post ? `Found (id=${post.id})` : "NOT FOUND");

    return Response.json({
      success: true,
      recruitment: recruitmentSlug,
      post: postSlug,
      found: post !== null,
      postId: post?.id || null,
      postTitle: post?.title || null,
      enrichment: post?.enrichment || null,
    });
  } catch (err) {
    console.error(`[test-post] Error:`, err);
    return Response.json({
      success: false,
      recruitment: recruitmentSlug,
      post: postSlug,
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
