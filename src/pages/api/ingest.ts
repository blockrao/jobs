import type { NextApiRequest, NextApiResponse } from "next";

export const config = {
  maxDuration: 300, // 5 min timeout for crawl
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Fail closed (SEC-001): with no configured secret this endpoint refuses
  // every request. Previously an unset secret compared equal to a missing
  // Authorization header (undefined === undefined) and let anyone in.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    console.log("🚀 Cron: Starting ingestion pipeline...");
    const { main } = await import("../../ingest/run");
    await main();
    res.status(200).json({ success: true, message: "Ingestion complete" });
  } catch (err) {
    console.error("❌ Cron: Ingestion failed:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
