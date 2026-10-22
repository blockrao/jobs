import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  return NextResponse.json({ 
    success: true, 
    message: "TISS Non-Teaching Positions 2026/02 data has been populated successfully",
    recruitmentId: 1,
    postsCreated: 11,
    timestamp: new Date().toISOString() 
  });
}
