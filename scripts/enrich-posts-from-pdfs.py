#!/usr/bin/env python3
"""
Enrich the `posts` table from official notification PDFs.

For each recruitment with an official_notification_url, fetches the PDF,
extracts salary range, vacancy count, and description, then writes those
fields to all posts belonging to that recruitment.

Salary strategy: government PDFs give pay scales at recruitment level (not
per post). We extract a single salary range and apply it to all posts in
the recruitment. If a post already has salary_min set, it is skipped.

Modes:
  --dry-run        Fetch PDFs, print what would be written, no DB changes (default)
  --write          Apply changes to Supabase
  --limit N        Process only N recruitments (default: all)
  --recruitment-id N  Process a single recruitment by id
  --multi-post     Also process multi-post recruitments (default: single-post only)
                   WARNING: multi-post applies recruitment-level salary to ALL posts
                   in that recruitment — only safe when all posts share the same pay scale.

Usage:
  # Dry run — single-post recruitments only (safe default)
  uv run --with requests --with pdfplumber --with supabase scripts/enrich-posts-from-pdfs.py --dry-run --limit 10

  # Write mode — single-post only (501 recruitments, zero attribution risk)
  uv run --with requests --with pdfplumber --with supabase scripts/enrich-posts-from-pdfs.py --write

  # Dry run — include multi-post recruitments (222 more, review output carefully)
  uv run --with requests --with pdfplumber --with supabase scripts/enrich-posts-from-pdfs.py --dry-run --multi-post

Requires:
  export SUPABASE_URL=https://<ref>.supabase.co
  export SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
"""

import argparse
import io
import json
import os
import re
import sys
import urllib3
from datetime import datetime
from typing import Optional

import requests
import pdfplumber

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
}

# ---------------------------------------------------------------------------
# Salary extraction  (government pay scales: ₹15,600–39,100 / Level 10 / 7CPC)
# ---------------------------------------------------------------------------

def _parse_amount(s: str) -> int:
    """Parse a salary string like '44,900.00' or '1,12,400' to int."""
    return int(float(s.replace(',', '')))


def extract_salary_range(text: str) -> tuple[Optional[int], Optional[int], Optional[str]]:
    """
    Return (salary_min, salary_max, pay_level_label).
    Handles:
      - Pay Band + Grade Pay:  "Pay Band: ₹15,600-39,100 + Grade Pay ₹6,600"
      - Level in Pay Matrix:   "Level-10" / "Level 10 of Pay Matrix"
      - Basic Pay (table):     "Basic Pay ₹ 44,900.00"
      - Fixed pay / CTC:       "Fixed Pay: ₹56,100"
      - Consolidated:          "Consolidated salary ₹35,000"
      - Plain range:           "₹35,400 to ₹1,12,400"
    """
    salary_min = salary_max = None
    pay_label = None

    # --- Pay Band + Grade Pay (6th CPC) ---
    m = re.search(
        r'pay\s+band[:\s]+(?:rs\.?|₹|inr\.?)?\s*([\d,]+)\s*[-–]\s*([\d,]+)',
        text, re.IGNORECASE
    )
    if m:
        lo = _parse_amount(m.group(1))
        hi = _parse_amount(m.group(2))
        gp_m = re.search(r'grade\s+pay[:\s]+(?:rs\.?|₹)?\s*([\d,]+)', text[m.start():m.start()+200], re.IGNORECASE)
        if gp_m:
            gp = _parse_amount(gp_m.group(1))
            salary_min = lo + gp
            salary_max = hi + gp
            pay_label = f"PB {lo}-{hi} GP {gp}"
        else:
            salary_min = lo
            salary_max = hi
            pay_label = f"PB {lo}-{hi}"

    # --- 7th CPC Pay Matrix Level ---
    if salary_min is None:
        m = re.search(r'level[:\s-]+(\d{1,2})\b(?:\s+of\s+(?:pay\s+matrix|matrix))?', text, re.IGNORECASE)
        if m:
            level = int(m.group(1))
            LEVEL_RANGES = {
                1: (18000, 56900), 2: (19900, 63200), 3: (21700, 69100),
                4: (25500, 81100), 5: (29200, 92300), 6: (35400, 112400),
                7: (44900, 142400), 8: (47600, 151100), 9: (53100, 167800),
                10: (56100, 177500), 11: (67700, 208700), 12: (78800, 209200),
                13: (123100, 215900), 14: (144200, 218200), 15: (182200, 224100),
                16: (205400, 224400), 17: (225000, 225000), 18: (250000, 250000),
            }
            if level in LEVEL_RANGES:
                salary_min, salary_max = LEVEL_RANGES[level]
                pay_label = f"Level-{level}"

    # --- Basic Pay from table (e.g. IBPS: "Basic Pay ₹ 44,900.00") ---
    if salary_min is None:
        m = re.search(
            r'basic\s+pay\s*[:\*]?\s*(?:rs\.?|₹|inr\.?)?\s*([\d,]+(?:\.\d+)?)',
            text, re.IGNORECASE
        )
        if m:
            val = _parse_amount(m.group(1))
            if 5000 <= val <= 500000:
                salary_min = val
                # Look for total emolument/CTC on same line or nearby
                ctc_m = re.search(
                    r'(?:total\s+emolument|annual\s+ctc|ctc)[*\s]*(?:rs\.?|₹|inr\.?)?\s*([\d,]+(?:\.\d+)?)\s*(?:lakhs?|lacs?)?',
                    text[max(0, m.start()-50):m.start()+300], re.IGNORECASE
                )
                if ctc_m:
                    ctc_raw = ctc_m.group(1)
                    ctc_val = _parse_amount(ctc_raw)
                    # If expressed in lakhs (e.g. 17.39 Lakhs → 1739000, cap at 500000)
                    if 'lakh' in ctc_m.group(0).lower() or 'lac' in ctc_m.group(0).lower():
                        ctc_val = int(ctc_val * 100)  # already decimal lakhs → paise? skip
                    if ctc_val > salary_min and ctc_val <= 500000:
                        salary_max = ctc_val
                    else:
                        salary_max = salary_min
                else:
                    salary_max = salary_min
                pay_label = "Basic"

    # --- Fixed / Consolidated salary ---
    if salary_min is None:
        for pattern in [
            r'(?:fixed\s+pay|consolidated\s+salary|consolidated\s+pay|emoluments?)[:\s]+(?:rs\.?|₹|inr\.?)?\s*([\d,]+)',
            r'(?:stipend|fellowship)[:\s]+(?:rs\.?|₹|inr\.?)?\s*([\d,]+)',
        ]:
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                val = _parse_amount(m.group(1))
                if 5000 <= val <= 500000:
                    salary_min = salary_max = val
                    pay_label = "Fixed"
                    break

    # --- Plain range: ₹X to/- ₹Y  or  Rs.X-Y ---
    if salary_min is None:
        for pattern in [
            r'(?:rs\.?|₹|inr\.?)\s*([\d,]+(?:\.\d+)?)\s*(?:to|-|–)\s*(?:rs\.?|₹|inr\.?)?\s*([\d,]+(?:\.\d+)?)',
            r'([\d,]+)\s*(?:to|-|–)\s*([\d,]+)\s*(?:per\s+month|p\.?m\.?|per\s+annum|p\.?a\.?)',
        ]:
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                lo = _parse_amount(m.group(1))
                hi = _parse_amount(m.group(2))
                if 5000 <= lo <= 500000 and lo < hi:
                    salary_min = lo
                    salary_max = hi
                    break

    return salary_min, salary_max, pay_label


# ---------------------------------------------------------------------------
# Vacancy extraction (recruitment level — total)
# ---------------------------------------------------------------------------

def extract_total_vacancies(text: str) -> Optional[int]:
    patterns = [
        r'total\s+(?:vacancies?|posts?|seats?)[:\s]+(\d[\d,]+)',
        r'(?:vacancies?|posts?)[:\s]+(\d[\d,]+)\s*(?:total|nos?\.?)',
        r'(\d[\d,]+)\s+(?:total\s+)?(?:vacancies?|posts?|seats?)',
        r'no\.?\s*of\s+(?:vacancies?|posts?)[:\s]+(\d[\d,]+)',
    ]
    for pattern in patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            try:
                v = int(m.group(1).replace(',', ''))
                if 1 <= v <= 100000:
                    return v
            except ValueError:
                pass
    return None


# ---------------------------------------------------------------------------
# Description extraction
# ---------------------------------------------------------------------------

def _is_garbled(text: str) -> bool:
    """Detect doubled-character artifacts from scanned PDFs (e.g. 'wwhhoollllyy')."""
    # Count consecutive repeated characters; if >5% of chars are in runs of 3+, it's garbled
    runs = re.findall(r'(.)\1{2,}', text)
    return len(''.join(runs)) > len(text) * 0.05


def extract_description(text: str, title: str) -> Optional[str]:
    lines = [l.strip() for l in text.split('\n') if len(l.strip()) > 60]
    skip_starts = ('government of', 'ministry of', 'department of', 'office of',
                   'advertisement no', 'notification no', 'advt no', 'www.',
                   'phone:', 'fax:', 'email:', 'e-mail:', '(cid:')
    candidates = [l for l in lines
                  if not l.lower().startswith(skip_starts)
                  and not _is_garbled(l)
                  and '(cid:' not in l]  # CID codes = encoding artifact
    if candidates:
        para = ' '.join(candidates[:3])
        if len(para) > 400:
            para = para[:400].rsplit(' ', 1)[0] + '.'
        return para
    return None


# ---------------------------------------------------------------------------
# PDF fetch  (reuse same logic as enrich-from-pdfs.py)
# ---------------------------------------------------------------------------

def fetch_pdf_text(url: str) -> Optional[str]:
    if not url.lower().endswith('.pdf'):
        return None
    for verify in (True, False):
        try:
            r = requests.get(url, headers=HEADERS, timeout=30, verify=verify)
            if r.status_code != 200:
                return None
            if r.content[:4] != b'%PDF':
                return None
            with pdfplumber.open(io.BytesIO(r.content)) as pdf:
                text = ''
                for page in pdf.pages[:6]:   # up to 6 pages (salary tables often on page 2-3)
                    t = page.extract_text()
                    if t:
                        text += t + '\n'
                return text if text.strip() else None
        except requests.exceptions.SSLError:
            if verify:
                continue
            return None
        except Exception:
            return None
    return None


# ---------------------------------------------------------------------------
# Main enrichment logic per recruitment
# ---------------------------------------------------------------------------

def enrich_recruitment(
    rec: dict,
    dry_run: bool,
    supabase_client,
    allow_multi_post: bool = False,
) -> dict:
    """
    Process one recruitment row. Returns a result dict:
      {id, name, post_count, status, fields, posts_updated, error}
    """
    rec_id = rec['id']
    name = rec.get('name', '')
    url = rec.get('official_notification_url', '')
    post_ids = rec.get('post_ids', [])

    result = {
        'id': rec_id,
        'name': name,
        'post_count': len(post_ids),
        'status': 'skip',
        'fields': {},
        'posts_updated': 0,
        'error': None,
    }

    if not url:
        result['status'] = 'no_url'
        return result

    # Safety gate: skip multi-post recruitments unless explicitly allowed.
    # Applying recruitment-level salary to a post in a multi-post recruitment
    # risks attributing the wrong salary to the wrong role (e.g. UPSC with 4
    # different pay scales). Single-post recruitments have no ambiguity.
    if len(post_ids) > 1 and not allow_multi_post:
        result['status'] = 'skipped_multi'
        return result

    text = fetch_pdf_text(url)
    if not text:
        result['status'] = 'fetch_failed'
        return result

    # Extract fields
    fields = {}
    salary_min, salary_max, pay_label = extract_salary_range(text)
    if salary_min is not None:
        fields['salary_min'] = salary_min
    if salary_max is not None:
        fields['salary_max'] = salary_max
    if pay_label:
        fields['pay_level'] = json.dumps({'label': pay_label, 'source': 'pdf_extract'})

    total_vac = extract_total_vacancies(text)
    if total_vac is not None:
        fields['vacancy_total'] = total_vac

    desc = extract_description(text, name)
    if desc:
        fields['description'] = desc

    if not fields:
        result['status'] = 'no_data'
        return result

    result['fields'] = fields

    if dry_run:
        result['status'] = 'dry_run'
        result['posts_updated'] = len(post_ids)
        return result

    # Write: update posts WHERE recruitment_id = rec_id AND salary_min IS NULL
    # (don't overwrite posts that already have salary)
    try:
        update_fields = {**fields, 'updated_at': datetime.utcnow().isoformat()}
        resp = (
            supabase_client.table('posts')
            .update(update_fields)
            .eq('recruitment_id', rec_id)
            .is_('salary_min', 'null')
            .execute()
        )
        updated = len(resp.data) if resp.data else 0
        result['status'] = 'written'
        result['posts_updated'] = updated
    except Exception as e:
        result['status'] = 'write_failed'
        result['error'] = str(e)

    return result


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description='Enrich posts table from official PDFs')
    parser.add_argument('--dry-run', action='store_true', default=True, help='Print what would be written (default)')
    parser.add_argument('--write', action='store_true', help='Apply changes to Supabase')
    parser.add_argument('--limit', type=int, default=None, help='Process only N recruitments')
    parser.add_argument('--recruitment-id', type=int, default=None, help='Process a single recruitment')
    parser.add_argument('--multi-post', action='store_true', help='Also process multi-post recruitments (review output carefully)')
    args = parser.parse_args()

    dry_run = not args.write
    allow_multi_post = args.multi_post

    url = os.environ.get('SUPABASE_URL')
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    if not url or not key:
        print('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
        print('  export SUPABASE_URL=https://<ref>.supabase.co')
        print('  export SUPABASE_SERVICE_ROLE_KEY=<service_role_key>')
        sys.exit(1)

    from supabase import create_client
    client = create_client(url, key)

    # Fetch recruitments that have posts with missing salary and an official URL
    # Group post IDs by recruitment so we know how many posts each covers
    if args.recruitment_id:
        q = client.rpc('noop', {})  # placeholder — we build manually
        # Simple fetch for a single recruitment
        rec_resp = (
            client.table('recruitments')
            .select('id,name,official_notification_url')
            .eq('id', args.recruitment_id)
            .not_.is_('official_notification_url', 'null')
            .execute()
        )
        recruitments = rec_resp.data or []

        # Get post ids for it
        posts_resp = (
            client.table('posts')
            .select('id,recruitment_id')
            .eq('recruitment_id', args.recruitment_id)
            .is_('salary_min', 'null')
            .execute()
        )
        post_rows = posts_resp.data or []
        for r in recruitments:
            r['post_ids'] = [p['id'] for p in post_rows if p['recruitment_id'] == r['id']]
    else:
        # Fetch all recruitments with official URL that have posts missing salary
        # Step 1: get recruitment IDs that have posts needing salary
        posts_resp = (
            client.table('posts')
            .select('id,recruitment_id')
            .is_('salary_min', 'null')
            .execute()
        )
        post_rows = posts_resp.data or []
        # Group by recruitment_id
        from collections import defaultdict
        rec_to_posts: dict[int, list[int]] = defaultdict(list)
        for p in post_rows:
            if p['recruitment_id']:
                rec_to_posts[p['recruitment_id']].append(p['id'])

        needed_rec_ids = list(rec_to_posts.keys())

        # Step 2: fetch recruitments with URL from that set
        # Supabase python client doesn't support IN natively in a nice way for large sets
        # so we fetch all with official_notification_url and filter client-side
        recs_resp = (
            client.table('recruitments')
            .select('id,name,official_notification_url')
            .not_.is_('official_notification_url', 'null')
            .neq('official_notification_url', '')
            .execute()
        )
        all_recs = recs_resp.data or []
        needed_set = set(needed_rec_ids)
        recruitments = [r for r in all_recs if r['id'] in needed_set]

        # Attach post_ids
        for r in recruitments:
            r['post_ids'] = rec_to_posts.get(r['id'], [])

        # Apply limit
        if args.limit:
            recruitments = recruitments[:args.limit]

    mode = 'DRY RUN' if dry_run else 'WRITE'
    scope = 'single + multi-post' if allow_multi_post else 'single-post only'
    print(f'\n{"="*70}')
    print(f'Posts Enrichment from PDFs — {mode} ({scope})')
    print(f'Recruitments to process: {len(recruitments)}')
    total_posts_affected = sum(len(r.get('post_ids', [])) for r in recruitments)
    print(f'Posts (missing salary) covered: {total_posts_affected}')
    if not allow_multi_post:
        print(f'NOTE: Multi-post recruitments will be skipped. Use --multi-post to include them.')
    print(f'{"="*70}\n')

    counts = {'written': 0, 'dry_run': 0, 'fetch_failed': 0, 'no_data': 0, 'no_url': 0, 'write_failed': 0, 'skipped_multi': 0}
    total_posts_updated = 0

    for i, rec in enumerate(recruitments, 1):
        result = enrich_recruitment(rec, dry_run, client, allow_multi_post)
        counts[result['status']] = counts.get(result['status'], 0) + 1
        total_posts_updated += result['posts_updated']

        status_icon = {
            'written': '✓', 'dry_run': '○', 'fetch_failed': '✗',
            'no_data': '–', 'no_url': '·', 'write_failed': '✗',
            'skipped_multi': '⤷',
        }.get(result['status'], '?')

        fields = result['fields']
        field_summary = []
        if 'salary_min' in fields:
            field_summary.append(f"salary {fields['salary_min']:,}–{fields.get('salary_max', fields['salary_min']):,}")
        if 'vacancy_total' in fields:
            field_summary.append(f"vacancies={fields['vacancy_total']}")
        if 'description' in fields:
            field_summary.append('desc')
        summary = ', '.join(field_summary) or '(none)'

        name_short = rec['name'][:48] if rec['name'] else ''
        posts_info = f"[{result['post_count']} posts]"
        print(f'{i:>4}. {status_icon} {name_short:<50} {posts_info:<12} {summary}')

        if dry_run and fields:
            for k, v in fields.items():
                if k == 'description':
                    print(f'        {k}: {str(v)[:80]}…')
                else:
                    print(f'        {k}: {v}')
        if result['error']:
            print(f'        ERROR: {result["error"]}')

    print(f'\n{"="*70}')
    print(f'Results: {counts}')
    print(f'Total posts updated: {total_posts_updated}')
    if dry_run:
        print('\nDRY RUN — no changes made. Run with --write to apply.')


if __name__ == '__main__':
    main()
