import type { NextApiRequest, NextApiResponse } from "next";

export const config = {
  maxDuration: 300, // 5 min timeout for crawl
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Validate cron secret
  const secret = req.headers.authorization?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
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
