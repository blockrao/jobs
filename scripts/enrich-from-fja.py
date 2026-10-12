#!/usr/bin/env python3
"""
Enrich recruitments and posts from FreeJobAlert article pages.

For each recruitment with a source_url pointing to freejobalert.com/articles/,
fetches the HTML, extracts structured fields, and writes them to:

  recruitments: fee_general, fee_reserved, fee_note, selection_process,
                age_note, employment_type (if missing)
  posts:        salary_min, salary_max, pay_level, vacancy_total,
                description (if missing)

Modes:
  --dry-run   Fetch pages, print what would be written, no DB changes (default)
  --write     Apply changes to Supabase
  --limit N   Process only N recruitments
  --recruitment-id N  Process a single recruitment by id

Usage:
  uv run --with requests --with beautifulsoup4 --with supabase \\
    scripts/enrich-from-fja.py --dry-run --limit 20

  uv run --with requests --with beautifulsoup4 --with supabase \\
    scripts/enrich-from-fja.py --write

Requires:
  export SUPABASE_URL=https://<ref>.supabase.co
  export SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
"""

import argparse
import os
import re
import sys
from datetime import datetime, timezone
from typing import Optional

import requests
from bs4 import BeautifulSoup
from supabase import create_client

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_amount(s: str) -> int:
    cleaned = s.replace(',', '').strip()
    if not cleaned:
        raise ValueError(f"empty salary string: {s!r}")
    return int(float(cleaned))


def _norm(text: str) -> str:
    """Collapse whitespace."""
    return re.sub(r'\s+', ' ', text).strip()


# ---------------------------------------------------------------------------
# FJA page fetch
# ---------------------------------------------------------------------------

def fetch_fja_page(url: str) -> Optional[BeautifulSoup]:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            return None
        return BeautifulSoup(resp.text, 'html.parser')
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Extractors — each returns None if not found
# ---------------------------------------------------------------------------

def extract_overview_table(soup: BeautifulSoup) -> dict:
    """Extract the overview/summary table (Company, Salary, Age Limit, etc.)."""
    data = {}
    # FJA uses a table with th/td pairs at the top of the article
    for table in soup.find_all('table'):
        rows = table.find_all('tr')
        for row in rows:
            cells = row.find_all(['th', 'td'])
            if len(cells) >= 2:
                key = _norm(cells[0].get_text()).lower()
                val = _norm(cells[1].get_text())
                if not key or not val:
                    continue
                data[key] = val
    return data


def extract_salary(overview: dict, soup: BeautifulSoup) -> tuple[Optional[int], Optional[int], Optional[str]]:
    """Return (salary_min, salary_max, pay_label)."""
    # Try overview table first
    for key in ('salary', 'pay scale', 'pay matrix', 'stipend', 'remuneration', 'emoluments'):
        val = overview.get(key, '')
        if val:
            # Match range: ₹1,20,000 - ₹2,80,000  or  Rs.56100-177500
            m = re.search(
                r'(?:rs\.?|₹|inr\.?)?\s*([\d,]+)\s*(?:to|-|–)\s*(?:rs\.?|₹|inr\.?)?\s*([\d,]+)',
                val, re.IGNORECASE
            )
            if m:
                try:
                    lo, hi = _parse_amount(m.group(1)), _parse_amount(m.group(2))
                    if 5000 <= lo <= 500000:
                        return lo, hi, "IDA/CDA"
                except ValueError:
                    pass
            # Single amount
            m = re.search(r'(?:rs\.?|₹|inr\.?)?\s*([\d,]+)', val, re.IGNORECASE)
            if m:
                try:
                    v = _parse_amount(m.group(1))
                    if 5000 <= v <= 500000:
                        return v, v, "Fixed"
                except ValueError:
                    pass

    # Fallback: search article body for pay level
    text = soup.get_text(' ', strip=True)
    m = re.search(r'pay\s+matrix\s+level[-\s]*(\d+)', text, re.IGNORECASE)
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
            lo, hi = LEVEL_RANGES[level]
            return lo, hi, f"Level-{level}"

    return None, None, None


def extract_fee(overview: dict, soup: BeautifulSoup) -> tuple[Optional[int], Optional[int], Optional[str]]:
    """Return (fee_general, fee_reserved, fee_note)."""
    text = soup.get_text(' ', strip=True)

    # Check for no-fee patterns first
    no_fee = re.search(
        r'(?:no\s+(?:application\s+)?fee|fee[:\s]*nil|fee[:\s]*no|exempt(?:ed)?\s+from\s+fee)',
        text, re.IGNORECASE
    )
    if no_fee:
        return 0, 0, "No application fee"

    fee_general = None
    fee_reserved = None
    fee_note = None

    # Overview table
    for key in ('application fee', 'fee', 'exam fee'):
        val = overview.get(key, '')
        if val:
            # Try to extract general / reserved amounts
            m_gen = re.search(r'(?:general|ur|obc|ews)[^₹\d]*([\d,]+)', val, re.IGNORECASE)
            m_res = re.search(r'(?:sc|st|pwd|ph|ex-?servicem)[^₹\d]*([\d,]+)', val, re.IGNORECASE)
            m_any = re.search(r'(?:rs\.?|₹)?\s*([\d,]+)', val, re.IGNORECASE)
            if m_gen:
                try: fee_general = _parse_amount(m_gen.group(1))
                except ValueError: pass
            if m_res:
                try: fee_reserved = _parse_amount(m_res.group(1))
                except ValueError: pass
            if fee_general is None and m_any:
                try: fee_general = _parse_amount(m_any.group(1))
                except ValueError: pass
            # Sanity: fees below ₹50 (but not 0) are likely parse errors
            if fee_general is not None and 0 < fee_general < 50:
                fee_general = None
            if fee_general is not None:
                fee_note = val[:200]
                return fee_general, fee_reserved, fee_note

    # Search body text for fee section
    fee_section = re.search(
        r'(?:application\s+fee|exam\s+fee)[^\n]{0,300}',
        text, re.IGNORECASE | re.DOTALL
    )
    if fee_section:
        snippet = fee_section.group(0)[:300]
        m_gen = re.search(r'(?:general|ur|obc|ews)[^\d]*([\d,]+)', snippet, re.IGNORECASE)
        m_res = re.search(r'(?:sc|st|pwd|ph)[^\d]*([\d,]+)', snippet, re.IGNORECASE)
        m_any = re.search(r'(?:rs\.?|₹)\s*([\d,]+)', snippet, re.IGNORECASE)
        if m_gen:
            try: fee_general = _parse_amount(m_gen.group(1))
            except ValueError: pass
        if m_res:
            try: fee_reserved = _parse_amount(m_res.group(1))
            except ValueError: pass
        if fee_general is None and m_any:
            try: fee_general = _parse_amount(m_any.group(1))
            except ValueError: pass
        # Sanity: fees below ₹50 (but not 0) are likely parse errors
        if fee_general is not None and 0 < fee_general < 50:
            fee_general = None
        if fee_general is not None:
            fee_note = _norm(snippet)[:200]

    return fee_general, fee_reserved, fee_note


def extract_selection_process(overview: dict, soup: BeautifulSoup) -> Optional[str]:
    for key in ('selection process', 'selection procedure', 'selection'):
        val = overview.get(key, '')
        if val and len(val) > 5:
            return val[:500]
    # Search only article/entry content, not full page (avoids nav/toolbar text)
    article = soup.find('article') or soup.find(class_=re.compile(r'entry.content|post.content|article.content', re.I))
    search_soup = article if article else soup
    text = search_soup.get_text(' ', strip=True)
    m = re.search(
        r'selection\s+(?:process|procedure|criteria)[:\s]+([^\n]{20,300})',
        text, re.IGNORECASE
    )
    if m:
        val = _norm(m.group(1))
        # Reject if it looks like nav text (contains multiple short tool-name words)
        tool_words = re.findall(r'\b(?:converter|resizer|compressor|tool|login|download|app|pdf|word|image)\b', val, re.I)
        if len(tool_words) >= 3:
            return None
        return val[:500]
    return None


def extract_age_note(overview: dict, soup: BeautifulSoup) -> Optional[str]:
    for key in ('age limit', 'age', 'upper age limit', 'maximum age'):
        val = overview.get(key, '')
        if val and len(val) > 2:
            return val[:300]
    text = soup.get_text(' ', strip=True)
    m = re.search(
        r'age\s+limit[:\s]+([^\n]{5,200})',
        text, re.IGNORECASE
    )
    if m:
        return _norm(m.group(1))[:300]
    return None


def extract_vacancy(overview: dict) -> Optional[int]:
    for key in ('number of posts', 'total posts', 'vacancies', 'total vacancies', 'no. of posts', 'no of posts'):
        val = overview.get(key, '')
        if val:
            m = re.search(r'(\d+)', val)
            if m:
                v = int(m.group(1))
                if 1 <= v <= 100000:
                    return v
    return None


def extract_description(soup: BeautifulSoup, title: str) -> Optional[str]:
    """Pull the first substantive paragraph from the article body."""
    # FJA articles have article or .entry-content or .post-content
    article = soup.find('article') or soup.find(class_=re.compile(r'entry-content|post-content|article-body'))
    if not article:
        article = soup

    skip_starts = (
        'advertisement', 'notification', 'important', 'www.', 'click here',
        'download', 'official', 'apply online', 'last date', 'closing date',
        'selection', 'salary', 'age limit', 'application fee', 'how to apply',
        'vacancy', 'post name', 'organization', 'freejobalert',
    )
    candidates = []
    for p in article.find_all('p'):
        text = _norm(p.get_text())
        if len(text) < 60:
            continue
        if text.lower().startswith(skip_starts):
            continue
        if re.search(r'freejobalert|subscribe|alert|notification bell', text, re.IGNORECASE):
            continue
        candidates.append(text)
        if len(candidates) >= 3:
            break

    if candidates:
        para = ' '.join(candidates[:2])
        if len(para) > 500:
            para = para[:500].rsplit(' ', 1)[0] + '.'
        return para
    return None


# ---------------------------------------------------------------------------
# Main enrichment function per recruitment
# ---------------------------------------------------------------------------

def enrich_recruitment(rec: dict, dry_run: bool, client) -> dict:
    result = {
        'id': rec['id'],
        'name': rec['name'],
        'source_url': rec['source_url'],
        'status': 'ok',
        'recruitment_fields': {},
        'post_fields': {},
        'post_count': len(rec['posts']),
    }

    soup = fetch_fja_page(rec['source_url'])
    if soup is None:
        result['status'] = 'fetch_failed'
        return result

    overview = extract_overview_table(soup)

    # --- Post-level fields (salary, vacancy, description) ---
    rec_fields = {}  # kept for dry-run summary only; actual writes go to post_enrichments
    salary_min, salary_max, pay_label = extract_salary(overview, soup)
    vacancy = extract_vacancy(overview)
    description = extract_description(soup, rec['name'])

    post_fields = {}
    if salary_min is not None:
        post_fields['salary_min'] = salary_min
        post_fields['salary_max'] = salary_max
        post_fields['pay_level'] = {'label': pay_label}
    if vacancy is not None:
        post_fields['vacancy_total'] = vacancy
    if description:
        post_fields['description'] = description

    # Build post_enrichments fields from recruitment-level data (fee, selection, age)
    # These are shared across all posts in the recruitment.
    enrichment_fields = {}
    fee_gen, fee_res, fee_note_val = extract_fee(overview, soup)
    sp = extract_selection_process(overview, soup)
    age = extract_age_note(overview, soup)

    if fee_gen is not None:
        # feesByCategory is a jsonb object: {"General": 500, "SC/ST": 0}
        fees = {}
        if fee_gen == 0:
            fees['All Categories'] = 'No Fee'
        else:
            fees['General/OBC/EWS'] = fee_gen
            if fee_res is not None:
                fees['SC/ST/PwD'] = fee_res
        enrichment_fields['feesByCategory'] = fees
        if fee_note_val:
            enrichment_fields['feeNote'] = fee_note_val

    if sp:
        # selectionProcess is jsonb; store as list of steps
        steps = [s.strip() for s in re.split(r'[→>]|\bfollowed by\b|\bthen\b', sp, flags=re.IGNORECASE) if s.strip()]
        enrichment_fields['selectionProcess'] = steps if len(steps) > 1 else [sp]

    if age:
        enrichment_fields['ageNote'] = age

    result['recruitment_fields'] = rec_fields  # kept for reference in dry-run output
    result['post_fields'] = post_fields
    result['enrichment_fields'] = enrichment_fields

    if not rec_fields and not post_fields and not enrichment_fields:
        result['status'] = 'no_data'
        return result

    if dry_run:
        result['status'] = 'dry_run'
        return result

    now = datetime.now(timezone.utc).isoformat()

    # --- Write posts table (salary, description, vacancy) ---
    if post_fields:
        for post in rec['posts']:
            fields_to_write = dict(post_fields)
            # Don't overwrite salary already set from PDF enrichment
            if post.get('salary_min') is not None and 'salary_min' in fields_to_write:
                del fields_to_write['salary_min']
                del fields_to_write['salary_max']
                fields_to_write.pop('pay_level', None)
            if post.get('description') and 'description' in fields_to_write:
                del fields_to_write['description']
            if fields_to_write:
                fields_to_write['updated_at'] = now
                client.table('posts').update(fields_to_write).eq('id', post['id']).execute()

    # --- Upsert post_enrichments (fee, selection, age, salary) ---
    # Build per-post enrichment payload combining salary and recruitment-level fields
    for post in rec['posts']:
        pe = dict(enrichment_fields)
        # Add salary to enrichment if extracted
        if salary_min is not None and post.get('salary_min') is None:
            pe['salaryMin'] = salary_min
            pe['salaryMax'] = salary_max
            if pay_label:
                pe['payLevel'] = pay_label
        if not pe:
            continue
        pe['updated_at'] = now
        # Upsert: if row exists update it, otherwise insert
        existing = client.table('post_enrichments').select('id').eq('post_id', post['id']).execute()
        if existing.data:
            client.table('post_enrichments').update(pe).eq('post_id', post['id']).execute()
        else:
            pe['post_id'] = post['id']
            client.table('post_enrichments').insert(pe).execute()

    result['status'] = 'written'
    return result


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description='Enrich from FreeJobAlert article pages')
    parser.add_argument('--dry-run', action='store_true', default=True)
    parser.add_argument('--write', action='store_true')
    parser.add_argument('--limit', type=int, default=None)
    parser.add_argument('--recruitment-id', type=int, default=None)
    args = parser.parse_args()
    dry_run = not args.write

    supabase_url = os.environ.get('SUPABASE_URL')
    supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    if not supabase_url or not supabase_key:
        sys.exit('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')

    client = create_client(supabase_url, supabase_key)

    # Fetch recruitments with FJA source URLs
    query = (
        client.table('recruitments')
        .select('id, name, slug, source_url, fee_general, fee_reserved, selection_process, age_note')
        .like('source_url', '%freejobalert.com/articles/%')
    )
    if args.recruitment_id:
        query = query.eq('id', args.recruitment_id)
    resp = query.execute()
    recruitments = resp.data

    # Attach posts for each recruitment
    rec_ids = [r['id'] for r in recruitments]
    posts_resp = (
        client.table('posts')
        .select('id, recruitment_id, salary_min, description, vacancy_total')
        .in_('recruitment_id', rec_ids)
        .execute()
    )
    posts_by_rec = {}
    for p in posts_resp.data:
        posts_by_rec.setdefault(p['recruitment_id'], []).append(p)

    for r in recruitments:
        r['posts'] = posts_by_rec.get(r['id'], [])

    if args.limit:
        recruitments = recruitments[:args.limit]

    mode = 'DRY RUN' if dry_run else 'WRITE'
    print('=' * 70)
    print(f'Enrich from FreeJobAlert — {mode}')
    print(f'Recruitments to process: {len(recruitments)}')
    print('=' * 70)

    counts = {'written': 0, 'dry_run': 0, 'fetch_failed': 0, 'no_data': 0}

    for i, rec in enumerate(recruitments, 1):
        try:
            result = enrich_recruitment(rec, dry_run, client)
        except Exception as e:
            print(f'  {i:>4}. ERROR {rec["name"][:50]}: {e}')
            counts['fetch_failed'] = counts.get('fetch_failed', 0) + 1
            continue

        status = result['status']
        counts[status] = counts.get(status, 0) + 1

        symbol = {'written': '✓', 'dry_run': '○', 'fetch_failed': '✗', 'no_data': '–'}.get(status, '?')
        rf = result['recruitment_fields']
        pf = result['post_fields']
        tags = []
        if pf.get('salary_min'):
            tags.append(f"salary {pf['salary_min']:,}–{pf['salary_max']:,}")
        if rf.get('fee_general') is not None:
            tags.append(f"fee ₹{rf['fee_general']}")
        if rf.get('selection_process'):
            tags.append('selection')
        if rf.get('age_note'):
            tags.append('age')
        if pf.get('description'):
            tags.append('desc')

        print(f"  {i:>4}. {symbol} {rec['name'][:50]:<50}  [{result['post_count']} posts]  {', '.join(tags) or '(none)'}")

    print()
    print('=' * 70)
    print(f"Results: {counts}")
    total = counts.get('written', 0) + counts.get('dry_run', 0)
    print(f"Total recruitments enriched: {total}")
    if dry_run:
        print('\nDRY RUN — no changes made. Run with --write to apply.')


if __name__ == '__main__':
    main()
