import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * On-demand revalidation endpoint.
 * Clears the ISR/CDN cache for a given path so a fresh render is served.
 *
 * Usage:
 *   POST /api/revalidate
 *   Authorization: Bearer <REVALIDATION_SECRET>
 *   Content-Type: application/json
 *   { "path": "/jobs/some-recruitment/some-post" }
 *
 * Or revalidate all job paths:
 *   { "tag": "jobs" }
 */
export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATION_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { path?: string; tag?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.path) {
    revalidatePath(body.path);
    return NextResponse.json({ revalidated: true, path: body.path });
  }

  return NextResponse.json({ error: "Provide path or tag" }, { status: 400 });
}
