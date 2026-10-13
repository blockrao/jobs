/**
 * Daily Digest Ingestor — /api/ingest
 * Scheduled: 2am UTC daily (vercel.json)
 * Also callable manually: POST /api/ingest with Authorization: Bearer <CRON_SECRET>
 *
 * Fetches the FJA daily digest, parses the embedded JSON, and upserts
 * into raw_notifications. Idempotent — re-running on the same date is safe.
 */

import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDbV2 } from "@/db";

const FJA_DIGEST_URL = "https://www.freejobalert.com/govt-jobs/";

interface DigestEntry {
  o?: string;   // org short
  of?: string;  // org full
  p?: string;   // post
  v?: string | number; // vacancies
  b?: string | number; // fee
  l?: string;   // salary
  a?: string;   // last date
  x?: string;   // official PDF URL
  xl?: string;  // apply URL
  u?: string;   // FJA article URL
  c?: string;   // category
  s?: string[]; // states
  q?: string;   // qualification
}

function parseDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  // ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  // Fallback: try JS Date parse
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  } catch {}
  return null;
}

function parseVacancies(raw: string | number | undefined): number | null {
  if (raw == null) return null;
  const m = String(raw).match(/\d[\d,]*/);
  return m ? parseInt(m[0].replace(/,/g, ""), 10) : null;
}

function extractJobsJson(html: string): DigestEntry[] {
  // Find first large JSON array in a script tag
  const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRe.exec(html)) !== null) {
    const text = match[1];
    const arrMatch = text.match(/(\[{[\s\S]*)/);
    if (!arrMatch) {
      const assignMatch = text.match(/=\s*(\[[\s\S]*?\])\s*;?\s*$/);
      if (!assignMatch) continue;
      try {
        const d = JSON.parse(assignMatch[1]);
        if (Array.isArray(d) && d.length > 10) return d as DigestEntry[];
      } catch {}
      continue;
    }
    try {
      const d = JSON.parse(arrMatch[1]);
      if (Array.isArray(d) && d.length > 10) return d as DigestEntry[];
    } catch {}
  }
  return [];
}

export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  // Auth check (SEC-001 pattern)
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const db = getDbV2();
  if (!db) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const digestDate = new Date().toISOString().slice(0, 10);

  // Fetch the digest
  let html: string;
  try {
    const res = await fetch(FJA_DIGEST_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; JobOye/1.0; +https://www.joboye.com)" },
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    console.error("Digest fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch digest", detail: String(err) }, { status: 502 });
  }

  const entries = extractJobsJson(html);
  if (entries.length === 0) {
    return NextResponse.json({ error: "No job entries found in digest" }, { status: 422 });
  }

  // Batch upsert in chunks of 50 using raw SQL
  let inserted = 0;
  let skipped = 0;
  const BATCH = 50;

  for (let i = 0; i < entries.length; i += BATCH) {
    const chunk = entries.slice(i, i + BATCH);

    for (const e of chunk) {
      const states = Array.isArray(e.s) ? e.s : (e.s ? [e.s] : []);
      const stateArr = states.length > 0
        ? `{${states.map((s: string) => `"${s.replace(/"/g, '\\"')}"`).join(",")}}`
        : null;

      const srcUrl = e.u?.trim() || null;
      if (!srcUrl) { skipped++; continue; }

      try {
        await db.execute(sql`
          INSERT INTO raw_notifications (
            digest_date, org_short, org_full, post_name,
            vacancies, vacancies_raw, fee_text, salary_text,
            last_date, last_date_raw,
            official_pdf_url, apply_url, source_url,
            category, states, qualification_text
          ) VALUES (
            ${digestDate}::date,
            ${e.o?.trim() || null},
            ${e.of?.trim() || null},
            ${e.p?.trim() || null},
            ${parseVacancies(e.v)},
            ${e.v != null ? String(e.v).trim() : null},
            ${e.b != null ? String(e.b).trim() : null},
            ${e.l?.trim() || null},
            ${parseDate(e.a)}::date,
            ${e.a?.trim() || null},
            ${e.x?.trim() || null},
            ${e.xl?.trim() || null},
            ${srcUrl},
            ${e.c?.trim() || null},
            ${stateArr}::text[],
            ${e.q?.trim() || null}
          )
          ON CONFLICT (digest_date, source_url) DO NOTHING
        `);
        inserted++;
      } catch {
        skipped++;
      }
    }
  }

  return NextResponse.json({
    success: true,
    digestDate,
    totalParsed: entries.length,
    inserted,
    skipped,
  });
}
