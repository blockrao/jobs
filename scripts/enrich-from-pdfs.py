#!/usr/bin/env python3
"""
Full enrichment of postings from official notification PDFs.
Extracts: location_city, total_vacancies, post_names, age_limit_min/max,
application_fee_general, date_posted, valid_through, description.

Modes:
  --dry-run   Print what would be written, no DB changes (default)
  --write     Apply changes to Supabase (requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
  --limit N   Process only N postings (default: all)
  --slug X    Process a single posting by slug

Usage:
  uv run --with requests --with pdfplumber --with supabase scripts/enrich-from-pdfs.py --dry-run --limit 20
  uv run --with requests --with pdfplumber --with supabase scripts/enrich-from-pdfs.py --write
"""

import argparse
import io
import json
import os
import re
import sys
import urllib3
from datetime import datetime, date
from typing import Optional

import requests
import pdfplumber

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
}

# ---------------------------------------------------------------------------
# City / state patterns
# ---------------------------------------------------------------------------
CITY_PATTERNS = [
    (r'\bNew Delhi\b', 'New Delhi'), (r'\bDelhi\b', 'New Delhi'),
    (r'\bMumbai\b', 'Mumbai'), (r'\bBombay\b', 'Mumbai'),
    (r'\bKolkata\b', 'Kolkata'), (r'\bCalcutta\b', 'Kolkata'),
    (r'\bChennai\b', 'Chennai'), (r'\bMadras\b', 'Chennai'),
    (r'\bBengaluru\b', 'Bengaluru'), (r'\bBangalore\b', 'Bengaluru'),
    (r'\bHyderabad\b', 'Hyderabad'), (r'\bSecunderabad\b', 'Hyderabad'),
    (r'\bPune\b', 'Pune'), (r'\bAhmedabad\b', 'Ahmedabad'),
    (r'\bJaipur\b', 'Jaipur'), (r'\bLucknow\b', 'Lucknow'),
    (r'\bPatna\b', 'Patna'), (r'\bBhopal\b', 'Bhopal'),
    (r'\bChandigarh\b', 'Chandigarh'), (r'\bGuwahati\b', 'Guwahati'),
    (r'\bBhubaneswar\b', 'Bhubaneswar'), (r'\bRaipur\b', 'Raipur'),
    (r'\bDehradun\b', 'Dehradun'), (r'\bShimla\b', 'Shimla'),
    (r'\bThiruvananthapuram\b', 'Thiruvananthapuram'), (r'\bKochi\b', 'Kochi'),
    (r'\bNagpur\b', 'Nagpur'), (r'\bIndore\b', 'Indore'),
    (r'\bSurat\b', 'Surat'), (r'\bVadodara\b', 'Vadodara'),
    (r'\bVisakhapatnam\b', 'Visakhapatnam'), (r'\bVijayawada\b', 'Vijayawada'),
    (r'\bCoimbatore\b', 'Coimbatore'), (r'\bMadurai\b', 'Madurai'),
    (r'\bRanchi\b', 'Ranchi'), (r'\bJamshedpur\b', 'Jamshedpur'),
    (r'\bGangtok\b', 'Gangtok'), (r'\bImphal\b', 'Imphal'),
    (r'\bShillong\b', 'Shillong'), (r'\bKohima\b', 'Kohima'),
    (r'\bPanaji\b', 'Panaji'), (r'\bPort Blair\b', 'Port Blair'),
    (r'\bSrinagar\b', 'Srinagar'), (r'\bJammu\b', 'Jammu'),
    (r'\bNavi Mumbai\b', 'Navi Mumbai'), (r'\bThane\b', 'Thane'),
    (r'\bFaridabad\b', 'Faridabad'), (r'\bGurugram\b', 'Gurugram'),
    (r'\bGurgaon\b', 'Gurugram'), (r'\bNoida\b', 'Noida'),
    (r'\bGhaziabad\b', 'Ghaziabad'), (r'\bAgra\b', 'Agra'),
    (r'\bVaranasi\b', 'Varanasi'), (r'\bAllahabad\b', 'Prayagraj'),
    (r'\bPrayagraj\b', 'Prayagraj'), (r'\bKanpur\b', 'Kanpur'),
    (r'\bNagaland\b', 'Kohima'), (r'\bMizoram\b', 'Aizawl'),
    (r'\bSikkim\b', 'Gangtok'), (r'\bTripura\b', 'Agartala'),
    (r'\bAgartala\b', 'Agartala'), (r'\bAizawl\b', 'Aizawl'),
    # State-level fallback (for nationwide bodies)
    (r'\bRajasthan\b', 'Jaipur'), (r'\bMaharashtra\b', 'Mumbai'),
    (r'\bGujarat\b', 'Ahmedabad'), (r'\bBihar\b', 'Patna'),
    (r'\bOdisha\b', 'Bhubaneswar'), (r'\bOrissa\b', 'Bhubaneswar'),
    (r'\bTamil Nadu\b', 'Chennai'), (r'\bKerala\b', 'Thiruvananthapuram'),
    (r'\bAndhra Pradesh\b', 'Hyderabad'), (r'\bTelangana\b', 'Hyderabad'),
    (r'\bKarnataka\b', 'Bengaluru'), (r'\bWest Bengal\b', 'Kolkata'),
    (r'\bUttar Pradesh\b', 'Lucknow'), (r'\bMadhya Pradesh\b', 'Bhopal'),
    (r'\bPunjab\b', 'Chandigarh'), (r'\bHaryana\b', 'Chandigarh'),
    (r'\bAssam\b', 'Guwahati'), (r'\bJharkhand\b', 'Ranchi'),
    (r'\bChhattisgarh\b', 'Raipur'), (r'\bUttarakhand\b', 'Dehradun'),
    (r'\bHimachal Pradesh\b', 'Shimla'), (r'\bGoa\b', 'Panaji'),
]

# ---------------------------------------------------------------------------
# Date patterns (DD/MM/YYYY, DD-MM-YYYY, DD Month YYYY)
# ---------------------------------------------------------------------------
MONTHS = {
    'january': 1, 'february': 2, 'march': 3, 'april': 4,
    'may': 5, 'june': 6, 'july': 7, 'august': 8,
    'september': 9, 'october': 10, 'november': 11, 'december': 12,
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
}

def parse_date(text: str) -> Optional[str]:
    """Try to parse various date formats, return ISO string or None."""
    # DD/MM/YYYY or DD-MM-YYYY
    m = re.search(r'\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b', text)
    if m:
        try:
            d = date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
            return d.isoformat()
        except ValueError:
            pass
    # DD Month YYYY
    m = re.search(r'\b(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(20\d{2})\b', text, re.IGNORECASE)
    if m:
        try:
            d = date(int(m.group(3)), MONTHS[m.group(2).lower()], int(m.group(1)))
            return d.isoformat()
        except ValueError:
            pass
    return None

# ---------------------------------------------------------------------------
# Extractors
# ---------------------------------------------------------------------------

def extract_city(text: str) -> Optional[str]:
    # Only search the first 800 chars (header/letterhead area) to avoid
    # picking up cities mentioned in posting locations or eligibility text
    header = text[:800]
    for pattern, canonical in CITY_PATTERNS:
        if re.search(pattern, header, re.IGNORECASE):
            return canonical
    # Fallback: first 2000 chars, but only city-level patterns (not state fallbacks)
    city_only = CITY_PATTERNS[:-14]  # excludes the state-level fallbacks at the end
    search_area = text[:2000]
    for pattern, canonical in city_only:
        if re.search(pattern, search_area, re.IGNORECASE):
            return canonical
    return None


def extract_vacancies(text: str) -> Optional[int]:
    """Extract total vacancy count."""
    patterns = [
        r'total\s+(?:vacancies?|posts?|seats?)[:\s]+(\d[\d,]+)',
        r'(?:vacancies?|posts?)[:\s]+(\d[\d,]+)\s*(?:total|nos?\.?)',
        r'(\d[\d,]+)\s+(?:total\s+)?(?:vacancies?|posts?|seats?)',
        r'no\.?\s*of\s+(?:vacancies?|posts?)[:\s]+(\d[\d,]+)',
        r'(\d[\d,]+)\s+(?:nos?\.?\s+)?(?:of\s+)?(?:vacancies?|posts?)',
    ]
    for pattern in patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            try:
                return int(m.group(1).replace(',', ''))
            except ValueError:
                pass
    return None


def extract_post_names(text: str) -> list[dict]:
    """Extract post names with vacancy counts as [{name, count}]."""
    results = []
    seen = set()

    # Known post/job title keywords — must appear in the name to qualify
    JOB_KEYWORDS = re.compile(
        r'\b(officer|engineer|manager|assistant|clerk|inspector|constable|'
        r'teacher|professor|lecturer|director|scientist|analyst|technician|'
        r'operator|supervisor|executive|consultant|nurse|doctor|pharmacist|'
        r'accountant|auditor|registrar|librarian|driver|guard|helper|'
        r'researcher|fellow|associate|specialist|coordinator|advisor|'
        r'superintendent|commissioner|secretary|peon|sepoy|havaldar|'
        r'sub-inspector|head constable|junior|senior|deputy|chief|principal|'
        r'post graduate|graduate|diploma)\b',
        re.IGNORECASE
    )

    # Words that indicate a line is NOT a post name
    SKIP_WORDS = {
        'total', 'category', 'general', 'obc', 'sc', 'st', 'ews', 'pwd', 'pwbd',
        'male', 'female', 'age', 'fee', 'date', 'salary', 'pay', 'india', 'indian',
        'punjab', 'sector', 'phone', 'email', 'terms', 'conditions', 'annexure',
        'enclosure', 'important', 'note', 'signature', 'applicant', 'candidate',
        'address', 'post', 'box', 'pin', 'code', 'website', 'www',
    }

    # Sanity bounds for vacancy counts
    MAX_REASONABLE_VACANCIES = 100000

    # Patterns that reliably indicate a post listing line:
    # "Post Name: N posts" or "N posts of Post Name" or tabular "Post Name | N"
    patterns = [
        # "Post Name : 5" or "Post Name – 05 Posts"
        r'^([A-Z][A-Za-z\s/().-]{4,55}?)\s*[:\-–|]\s*(\d{1,5})\s*(?:posts?|vacancies?|nos?\.?|seats?)?\s*$',
        # "05 Posts of Post Name" or "5 Post Name"
        r'^\s*(\d{1,5})\s+(?:posts?\s+of\s+)?([A-Z][A-Za-z\s/().-]{4,55})\s*$',
    ]

    for line in text.split('\n'):
        line = line.strip()
        if not line or len(line) > 120:
            continue
        for pattern in patterns:
            m = re.match(pattern, line, re.IGNORECASE)
            if not m:
                continue
            if pattern.startswith(r'^\s*(\d'):
                count_str, name = m.group(1), m.group(2).strip()
            else:
                name, count_str = m.group(1).strip(), m.group(2)

            name = re.sub(r'\s+', ' ', name).strip(' -–:|')
            if len(name) < 5 or len(name) > 60:
                continue

            first_word = name.lower().split()[0]
            if first_word in SKIP_WORDS:
                continue

            # Must contain a job-related keyword
            if not JOB_KEYWORDS.search(name):
                continue

            try:
                count = int(count_str.replace(',', ''))
            except ValueError:
                continue

            # Reject obviously wrong counts (years, phone numbers, PINs)
            if count > MAX_REASONABLE_VACANCIES or count == 0:
                continue

            key = name.lower()
            if key not in seen:
                seen.add(key)
                results.append({'name': name, 'count': count})

            if len(results) >= 15:
                break
        if len(results) >= 15:
            break

    return results


def extract_age_limits(text: str) -> tuple[Optional[int], Optional[int]]:
    """Return (min_age, max_age)."""
    # Age between X and Y / X to Y years
    m = re.search(r'age\s+(?:limit\s+)?(?:between\s+)?(\d{2})\s+(?:to|-|and)\s+(\d{2})\s+years?', text, re.IGNORECASE)
    if m:
        return int(m.group(1)), int(m.group(2))
    # Minimum age X / Maximum age Y
    min_age = max_age = None
    m = re.search(r'(?:minimum|min\.?)\s+age[:\s]+(\d{2})', text, re.IGNORECASE)
    if m:
        min_age = int(m.group(1))
    m = re.search(r'(?:maximum|max\.?)\s+age[:\s]+(\d{2})', text, re.IGNORECASE)
    if m:
        max_age = int(m.group(1))
    if min_age or max_age:
        return min_age, max_age
    # Age limit: X years
    m = re.search(r'age\s+(?:limit|not\s+exceeding)[:\s]+(\d{2})\s+years?', text, re.IGNORECASE)
    if m:
        return None, int(m.group(1))
    # Upper age limit
    m = re.search(r'upper\s+age\s+limit[:\s]+(\d{2})', text, re.IGNORECASE)
    if m:
        return None, int(m.group(1))
    return None, None


def extract_fee(text: str) -> Optional[int]:
    """Extract general/UR category application fee in INR."""
    patterns = [
        r'(?:general|ur|unreserved|open)[^.]{0,60}?(?:fee|fees)[:\s]+(?:rs\.?|inr\.?|₹)?\s*(\d+)',
        r'(?:application\s+fee)[^.]{0,60}?(?:general|ur)[^.]{0,30}?(?:rs\.?|inr\.?|₹)?\s*(\d+)',
        r'(?:rs\.?|inr\.?|₹)\s*(\d+)[^.]{0,40}?(?:general|ur|unreserved)',
        r'application\s+fee[:\s]+(?:rs\.?|inr\.?|₹)?\s*(\d+)',
        r'(?:rs\.?|₹)\s*(\d+)\s*(?:for\s+(?:general|ur|open))',
    ]
    for pattern in patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            try:
                fee = int(m.group(1).replace(',', ''))
                # Realistic fee range: ₹25 to ₹2000
                # Rejects: 1, 2 (version/list numbers), 50000 (salary figures)
                if 25 <= fee <= 2000:
                    return fee
            except ValueError:
                pass
    return None


def extract_dates(text: str) -> tuple[Optional[str], Optional[str]]:
    """Return (date_posted, valid_through) as ISO strings."""
    date_posted = None
    valid_through = None

    # Notification/advertisement date
    for pattern in [
        r'(?:notification|advertisement|advt\.?)\s+date[:\s]+(.{5,25})',
        r'date\s+of\s+(?:notification|advertisement)[:\s]+(.{5,25})',
        r'(?:issued|published)\s+on[:\s]+(.{5,25})',
    ]:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            date_posted = parse_date(m.group(1))
            if date_posted:
                break

    # Last date to apply
    for pattern in [
        r'last\s+date\s+(?:for\s+)?(?:submission|applying|application|receipt)[:\s]+(.{5,25})',
        r'closing\s+date[:\s]+(.{5,25})',
        r'last\s+date[:\s]+(.{5,25})',
        r'apply\s+(?:on\s+)?(?:or\s+)?before[:\s]+(.{5,25})',
    ]:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            valid_through = parse_date(m.group(1))
            if valid_through:
                break

    return date_posted, valid_through


def extract_description(text: str, title: str) -> Optional[str]:
    """Build a clean 2-3 sentence description from PDF text."""
    # Find the first substantive paragraph after the title/header area
    lines = [l.strip() for l in text.split('\n') if len(l.strip()) > 60]
    # Skip boilerplate header lines
    skip_starts = ('government of', 'ministry of', 'department of', 'office of',
                   'advertisement no', 'notification no', 'advt no', 'www.',
                   'phone:', 'fax:', 'email:', 'e-mail:')
    candidates = [l for l in lines if not l.lower().startswith(skip_starts)]
    if candidates:
        # Take up to 2 sentences
        para = ' '.join(candidates[:3])
        # Truncate at ~400 chars
        if len(para) > 400:
            para = para[:400].rsplit(' ', 1)[0] + '.'
        return para
    return None


# ---------------------------------------------------------------------------
# PDF fetch
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
                for page in pdf.pages[:4]:
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
# Main
# ---------------------------------------------------------------------------

def enrich_posting(slug: str, title: str, url: str, dry_run: bool, supabase_client=None) -> dict:
    result = {'slug': slug, 'status': 'skip', 'fields': {}, 'error': None}

    text = fetch_pdf_text(url)
    if not text:
        result['status'] = 'fetch_failed'
        return result

    fields = {}
    city = extract_city(text)
    if city:
        fields['location_city'] = city

    vacancies = extract_vacancies(text)
    if vacancies:
        fields['total_vacancies'] = vacancies

    post_names = extract_post_names(text)
    if post_names:
        fields['post_names'] = json.dumps(post_names)

    min_age, max_age = extract_age_limits(text)
    if min_age:
        fields['age_limit_min'] = min_age
    if max_age:
        fields['age_limit_max'] = max_age

    fee = extract_fee(text)
    if fee is not None:
        fields['application_fee_general'] = fee

    date_posted, valid_through = extract_dates(text)
    if date_posted:
        fields['date_posted'] = date_posted
    if valid_through:
        fields['valid_through'] = valid_through

    description = extract_description(text, title)
    if description:
        fields['description'] = description

    fields['last_verified_at'] = datetime.utcnow().isoformat()

    result['fields'] = fields

    if not fields:
        result['status'] = 'no_data'
        return result

    if dry_run:
        result['status'] = 'dry_run'
        return result

    # Write to Supabase
    try:
        resp = supabase_client.table('postings').update(fields).eq('slug', slug).execute()
        result['status'] = 'written'
    except Exception as e:
        result['status'] = 'write_failed'
        result['error'] = str(e)

    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true', default=True)
    parser.add_argument('--write', action='store_true')
    parser.add_argument('--limit', type=int, default=None)
    parser.add_argument('--slug', type=str, default=None)
    args = parser.parse_args()

    dry_run = not args.write

    supabase_client = None
    if not dry_run:
        url = os.environ.get('SUPABASE_URL')
        key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
        if not url or not key:
            print('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for --write mode')
            sys.exit(1)
        from supabase import create_client
        supabase_client = create_client(url, key)
        # Fetch postings from DB
        query = supabase_client.table('postings').select('slug,title,official_notification_url').not_.is_('official_notification_url', 'null').neq('official_notification_url', '')
        if args.slug:
            query = query.eq('slug', args.slug)
        if args.limit:
            query = query.limit(args.limit)
        rows = query.execute().data
    else:
        # Dry run: use hardcoded sample of 10 for now
        # When running --write, this branch is skipped
        from supabase import create_client
        url = os.environ.get('SUPABASE_URL')
        key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
        if not url or not key:
            print('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
            print('Export them first:')
            print('  export SUPABASE_URL=https://<ref>.supabase.co')
            print('  export SUPABASE_SERVICE_ROLE_KEY=<service_role_key>')
            sys.exit(1)
        supabase_client = create_client(url, key)
        query = supabase_client.table('postings').select('slug,title,official_notification_url').not_.is_('official_notification_url', 'null').neq('official_notification_url', '').eq('review_status', 'APPROVED')
        if args.slug:
            query = query.eq('slug', args.slug)
        if args.limit:
            query = query.limit(args.limit)
        else:
            query = query.limit(20)
        rows = query.execute().data

    mode = 'DRY RUN' if dry_run else 'WRITE'
    print(f'\n{"="*70}')
    print(f'PDF Enrichment — {mode} — {len(rows)} postings')
    print(f'{"="*70}')

    counts = {'written': 0, 'dry_run': 0, 'fetch_failed': 0, 'no_data': 0, 'write_failed': 0, 'skip': 0}
    field_counts = {}

    for i, row in enumerate(rows, 1):
        slug = row['slug']
        title = row.get('title', '')
        url = row.get('official_notification_url', '')
        short = slug[:42]

        result = enrich_posting(slug, title, url, dry_run, supabase_client)
        counts[result['status']] = counts.get(result['status'], 0) + 1

        fields = result['fields']
        for k in fields:
            if k != 'last_verified_at':
                field_counts[k] = field_counts.get(k, 0) + 1

        status_icon = {'written': '✓', 'dry_run': '○', 'fetch_failed': '✗', 'no_data': '–', 'skip': '·'}.get(result['status'], '?')
        field_summary = ', '.join(f for f in fields if f != 'last_verified_at' and f != 'description') or '(none)'
        print(f'{i:>3}. {status_icon} {short:<44} {field_summary}')

        if dry_run and fields:
            for k, v in fields.items():
                if k == 'last_verified_at':
                    continue
                display = str(v)[:80] if not isinstance(v, str) else v[:80]
                print(f'        {k}: {display}')

    print(f'\n{"="*70}')
    print(f'Results: {counts}')
    print(f'Fields extracted across postings:')
    for k, v in sorted(field_counts.items(), key=lambda x: -x[1]):
        print(f'  {k}: {v}')
    if dry_run:
        print('\nThis was a DRY RUN — no changes made.')
        print('Run with --write to apply.')


if __name__ == '__main__':
    main()
