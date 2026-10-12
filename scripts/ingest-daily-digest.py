#!/usr/bin/env python3 -I
"""
ingest-daily-digest.py
----------------------
Parse FJA daily digest HTML → populate raw_notifications staging table.

Usage:
    python3 -I scripts/ingest-daily-digest.py --file /path/to/digest.html [--date 2026-10-12] [--dry-run]

The digest embeds a JSON array in a <script> tag (first script with `window.__JOBS_DATA__`
or the first script containing the JSON). Each entry has:
    o   org short / acronym
    of  org full name
    p   post name
    v   vacancies (may be string like "Various")
    b   fee text
    l   salary text
    a   last date (ISO or "DD/MM/YYYY" or "DD Mon YYYY")
    x   official PDF URL
    xl  apply URL
    u   FJA article URL
    c   category ("Central" / "State" / ...)
    s   states array
    q   qualification text
"""

import argparse
import json
import os
import re
import sys
from datetime import date, datetime
from typing import Any

import psycopg2
from bs4 import BeautifulSoup


def parse_date(raw: str | None) -> tuple[date | None, str | None]:
    if not raw:
        return None, None
    raw_s = str(raw).strip()
    # ISO 2026-10-12
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", raw_s)
    if m:
        try:
            return date(int(m[1]), int(m[2]), int(m[3])), raw_s
        except ValueError:
            pass
    # DD/MM/YYYY
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})$", raw_s)
    if m:
        try:
            return date(int(m[3]), int(m[2]), int(m[1])), raw_s
        except ValueError:
            pass
    # DD Mon YYYY
    try:
        return datetime.strptime(raw_s, "%d %b %Y").date(), raw_s
    except ValueError:
        pass
    try:
        return datetime.strptime(raw_s, "%d %B %Y").date(), raw_s
    except ValueError:
        pass
    return None, raw_s


def parse_vacancies(raw: Any) -> tuple[int | None, str]:
    raw_s = str(raw).strip() if raw is not None else ""
    m = re.search(r"\d[\d,]*", raw_s)
    if m:
        try:
            return int(m.group().replace(",", "")), raw_s
        except ValueError:
            pass
    return None, raw_s


def extract_jobs_json(html_path: str) -> list[dict]:
    with open(html_path, "r", encoding="utf-8", errors="replace") as f:
        soup = BeautifulSoup(f, "html.parser")

    for tag in soup.find_all("script"):
        text = tag.string or ""
        # Look for JSON array start
        m = re.search(r"(\[{.*)", text, re.DOTALL)
        if not m:
            # Try assignment patterns: var x = [...]; or window.__X__ = [...]
            m = re.search(r"=\s*(\[[\s\S]*?\])\s*;?\s*$", text, re.DOTALL)
        if m:
            candidate = m.group(1) if m.lastindex == 1 else m.group(1)
            try:
                data = json.loads(candidate)
                if isinstance(data, list) and len(data) > 10:
                    print(f"  Found JSON array: {len(data)} entries", file=sys.stderr)
                    return data
            except json.JSONDecodeError:
                continue

    # Fallback: scan all script text for largest JSON array
    best: list = []
    for tag in soup.find_all("script"):
        text = tag.string or ""
        for m in re.finditer(r"\[{", text):
            try:
                data = json.loads(text[m.start():])
                if isinstance(data, list) and len(data) > len(best):
                    best = data
            except json.JSONDecodeError:
                # try to find end bracket
                pass
    if best:
        print(f"  Fallback: found JSON array: {len(best)} entries", file=sys.stderr)
        return best

    raise ValueError("No job JSON array found in digest HTML")


def build_rows(entries: list[dict], digest_date: date) -> list[dict]:
    rows = []
    for e in entries:
        vac, vac_raw = parse_vacancies(e.get("v"))
        ld, ld_raw = parse_date(e.get("a"))
        states_raw = e.get("s")
        if isinstance(states_raw, list):
            states = [str(s).strip() for s in states_raw if s]
        elif isinstance(states_raw, str) and states_raw.strip():
            states = [states_raw.strip()]
        else:
            states = []

        def s(v) -> str | None:
            return str(v).strip() if v is not None else None

        rows.append({
            "digest_date": digest_date,
            "digest_source": "fja_daily_digest",
            "org_short": s(e.get("o")) or None,
            "org_full": s(e.get("of")) or None,
            "post_name": s(e.get("p")) or None,
            "vacancies": vac,
            "vacancies_raw": vac_raw or None,
            "fee_text": s(e.get("b")) or None,
            "salary_text": s(e.get("l")) or None,
            "last_date": ld,
            "last_date_raw": ld_raw or None,
            "official_pdf_url": s(e.get("x")) or None,
            "apply_url": s(e.get("xl")) or None,
            "source_url": s(e.get("u")) or None,
            "category": s(e.get("c")) or None,
            "states": states or None,
            "qualification_text": s(e.get("q")) or None,
        })
    return rows


def ingest(rows: list[dict], conn) -> dict:
    inserted = 0
    skipped = 0
    with conn.cursor() as cur:
        for r in rows:
            states_val = r["states"]
            # psycopg2 needs list as Python list for text[]
            cur.execute("""
                INSERT INTO raw_notifications (
                    digest_date, digest_source,
                    org_short, org_full, post_name,
                    vacancies, vacancies_raw,
                    fee_text, salary_text,
                    last_date, last_date_raw,
                    official_pdf_url, apply_url, source_url,
                    category, states, qualification_text
                ) VALUES (
                    %(digest_date)s, %(digest_source)s,
                    %(org_short)s, %(org_full)s, %(post_name)s,
                    %(vacancies)s, %(vacancies_raw)s,
                    %(fee_text)s, %(salary_text)s,
                    %(last_date)s, %(last_date_raw)s,
                    %(official_pdf_url)s, %(apply_url)s, %(source_url)s,
                    %(category)s, %(states)s, %(qualification_text)s
                )
                ON CONFLICT (digest_date, source_url) DO NOTHING
            """, {**r, "states": states_val})
            if cur.rowcount:
                inserted += 1
            else:
                skipped += 1
    conn.commit()
    return {"inserted": inserted, "skipped": skipped}


def main():
    parser = argparse.ArgumentParser(description="Ingest FJA daily digest into raw_notifications")
    parser.add_argument("--file", required=True, help="Path to digest HTML file")
    parser.add_argument("--date", help="Digest date YYYY-MM-DD (default: today)")
    parser.add_argument("--dry-run", action="store_true", help="Parse only, do not write to DB")
    args = parser.parse_args()

    digest_date = date.fromisoformat(args.date) if args.date else date.today()
    print(f"Digest date: {digest_date}", file=sys.stderr)

    entries = extract_jobs_json(args.file)
    rows = build_rows(entries, digest_date)

    total_vac = sum(r["vacancies"] or 0 for r in rows)
    has_pdf = sum(1 for r in rows if r["official_pdf_url"])
    print(f"  Parsed: {len(rows)} entries, {total_vac:,} total vacancies, {has_pdf} with PDF URL")

    if args.dry_run:
        # Print sample
        for r in rows[:3]:
            print(json.dumps({k: str(v) if v is not None else None for k, v in r.items()}, ensure_ascii=False))
        print(f"\n[DRY RUN] Would insert up to {len(rows)} rows into raw_notifications.")
        return

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not set", file=sys.stderr)
        sys.exit(1)

    conn = psycopg2.connect(db_url)
    try:
        result = ingest(rows, conn)
        print(f"  Inserted: {result['inserted']}, Skipped (duplicate): {result['skipped']}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
