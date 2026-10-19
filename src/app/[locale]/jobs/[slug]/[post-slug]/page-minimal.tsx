/**
 * Minimal test page - just verify post data can be fetched
 */
import { notFound } from "next/navigation";
import { getPostBySlug } from "@/db/operations/get-posts";

interface Props {
  params: Promise<{
    locale: string;
    slug: string;
    "post-slug": string;
  }>;
}

export const revalidate = 60;

export default async function TestPage({ params }: Props) {
  const { slug: recruitmentSlug, "post-slug": postSlug } = await params;

  console.log(`[TestPage] Starting for ${recruitmentSlug}/${postSlug}`);
  
  try {
    const post = await getPostBySlug(recruitmentSlug, postSlug);
    console.log(`[TestPage] Post fetch completed`, post ? `Found: ${post.id}` : "Not found");
    
    if (!post) {
      return (
        <div style={{padding: '20px', fontFamily: 'monospace'}}>
          <h1>Post Not Found</h1>
          <p>Could not find post: {recruitmentSlug}/{postSlug}</p>
        </div>
      );
    }
    
    return (
      <div style={{padding: '20px', fontFamily: 'monospace'}}>
        <h1>✅ Post Loaded Successfully</h1>
        <p><strong>Post ID:</strong> {post.id}</p>
        <p><strong>Title:</strong> {post.title}</p>
        <p><strong>Recruitment Slug:</strong> {post.recruitmentSlug}</p>
        <p><strong>Is Live:</strong> {post.isLive ? 'Yes' : 'No'}</p>
        <p><strong>Posted At:</strong> {post.postedAt?.toString()}</p>
        <pre style={{background: '#f0f0f0', padding: '10px', overflowX: 'auto'}}>
          {JSON.stringify(post, null, 2).slice(0, 1000)}
        </pre>
      </div>
    );
  } catch (err) {
    console.error(`[TestPage] Error:`, err);
    return (
      <div style={{padding: '20px', fontFamily: 'monospace', color: 'red'}}>
        <h1>❌ Error Loading Post</h1>
        <p><strong>Error:</strong> {err instanceof Error ? err.message : String(err)}</p>
        <pre style={{background: '#ffe0e0', padding: '10px', whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>
          {err instanceof Error ? err.stack : String(err)}
        </pre>
      </div>
    );
  }
}
