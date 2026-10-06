#!/usr/bin/env python3
"""
City extraction dry-run from official notification PDFs.
Reads 10 postings with notification URLs but no city set.
Prints slug → detected city. No DB writes.

Usage:
  pip install requests pdfplumber
  python3 scripts/extract-cities-dryrun.py
"""

import requests
import pdfplumber
import io
import re

# 10 approved postings with notification URLs but no location_city
POSTINGS = [
    ("iifcl-projects-limited-ipl-individual-consultants-recruitment-2026-65-specializations-apply-on-rolling-basis-312930",
     "IIFCL Projects Limited Individual Consultants 2026",
     "https://iifclprojects.in/wp-content/uploads/2026/07/FInal-advertisement-_for-Consultants-on-Contract_17-July-2026.pdf"),
    ("ruhs-mo-recruitment-2026-notification-out-apply-online-for-600-medical-officer-posts-86d8c9",
     "RUHS MO Recruitment 2026",
     "https://old.ruhsraj.org/cms/uploads/2026/08/MO_600_2435.pdf"),
    ("bpsc-tre-4-0-recruitment-2026-notification-out-apply-online-for-32-388-school-teacher-posts-7ba6a1",
     "BPSC TRE-4.0 School Teacher 2026",
     "https://bpsc.bihar.gov.in/wp-content/uploads/BPSC_content/Notices/Advertisement-152026-TRE-4.0_BPSC-20260922-dbsf04.pdf"),
    ("sahitya-akademi-recruitment-2026-last-date-extended-apply-offline-for-30-clerk-mts-and-more-posts-7fded2",
     "Sahitya Akademi Recruitment 2026",
     "https://sahitya-akademi.gov.in/pdf/Corrigendum-Variousposts.pdf"),
    ("duac-recruitment-2026-apply-online-for-lower-division-clerk-daftry-posts-775d0c",
     "DUAC LDC Daftry 2026",
     "https://ibtexamination.com/App2o26_DUAC/notification/Advertisement%20-%20LDC.pdf"),
    ("stpi-recruitment-2026-apply-online-for-10-assistant-administrative-officer-and-more-posts-24dae2",
     "STPI 10 Assistant Administrative Officer 2026",
     "https://stpi.in/sites/default/files/career-documents/notice_26.pdf"),
    ("tnpsc-ctse-interview-posts-recruitment-2026-apply-online-for-170-research-assistant-assistant-manager-and-more-posts-4fdb74",
     "TNPSC CTSE 170 Research Assistant 2026",
     "https://tnpsc.gov.in/document/english/CTSE%20(Interview%20Posts)%20%20English.pdf"),
    ("delhi-high-court-spa-pa-recruitment-2026-apply-online-for-150-senior-personal-assistant-personal-assistant-posts-15f8d2",
     "Delhi High Court SPA PA 150 Posts 2026",
     "https://www.delhihighcourt.nic.in/files/2026-09/recuritment/vacancy_circular_for_spa.pdf"),
    ("gsrtc-helper-recruitment-2026-notification-out-apply-online-for-2-510-posts-d2461e",
     "GSRTC Helper 2510 Posts 2026",
     "https://ojas.gujarat.gov.in/AdvtDetails.aspx?sid=zlkvQxSZgjY=&yr=iNSQ32x8ipg=&ano=lbbXJHoy3aQ="),
    ("cbi-special-public-prosecutor-recruitment-2026-apply-online-6b455a",
     "CBI Special Public Prosecutor 2026",
     "https://cbi.gov.in/vacancy-list/MQ=="),
]

# Known cities/states for pattern matching (extend as needed)
CITY_PATTERNS = [
    # Major cities
    r'\b(New Delhi|Delhi)\b',
    r'\bMumbai\b', r'\bBombay\b',
    r'\bKolkata\b', r'\bCalcutta\b',
    r'\bChennai\b', r'\bMadras\b',
    r'\bBengaluru\b', r'\bBangalore\b',
    r'\bHyderabad\b', r'\bSecunderabad\b',
    r'\bPune\b', r'\bAhmedabad\b',
    r'\bJaipur\b', r'\bLucknow\b',
    r'\bPatna\b', r'\bBhopal\b',
    r'\bChandigarh\b', r'\bGuwahati\b',
    r'\bBhubaneswar\b', r'\bRaipur\b',
    r'\bDehradun\b', r'\bShimla\b',
    r'\bThiruvananthapuram\b', r'\bKochi\b',
    r'\bNagpur\b', r'\bIndore\b',
    r'\bSurat\b', r'\bVadodara\b',
    r'\bVisakhapatnam\b', r'\bVijayawada\b',
    r'\bCoimbatore\b', r'\bMadurai\b',
    r'\bRanchi\b', r'\bJamshedpur\b',
    r'\bGangtok\b', r'\bAizawl\b',
    r'\bImphal\b', r'\bShillong\b',
    r'\bItanagar\b', r'\bKohima\b',
    r'\bPanaji\b', r'\bPortBlair\b', r'\bPort Blair\b',
    r'\bSrinagar\b', r'\bJammu\b',
    r'\bNavi Mumbai\b', r'\bThane\b',
    r'\bFaridabad\b', r'\bGurgaon\b', r'\bGurugram\b',
    r'\bNoida\b', r'\bGhaziabad\b',
    # State-level fallback patterns for nationwide bodies
    r'\bRajasthan\b', r'\bMaharashtra\b', r'\bGujarat\b',
    r'\bBihar\b', r'\bOdisha\b', r'\bOrissa\b',
    r'\bTamil Nadu\b', r'\bKerala\b', r'\bAndhra Pradesh\b',
    r'\bTelangana\b', r'\bKarnataka\b', r'\bWest Bengal\b',
    r'\bUttar Pradesh\b', r'\bMadhya Pradesh\b',
    r'\bPunjab\b', r'\bHaryana\b', r'\bAssam\b',
]

# Canonical city name mappings
CITY_CANONICAL = {
    'New Delhi': 'New Delhi', 'Delhi': 'New Delhi',
    'Bombay': 'Mumbai', 'Calcutta': 'Kolkata',
    'Madras': 'Chennai', 'Bangalore': 'Bengaluru',
    'Secunderabad': 'Hyderabad',
    'Port Blair': 'Port Blair',
    'Gurugram': 'Gurugram', 'Gurgaon': 'Gurugram',
    'Orissa': 'Odisha',
}


def extract_city_from_text(text: str) -> str | None:
    """Find the most likely city/state from PDF text."""
    # Search first 1500 chars (header area most reliable)
    search_area = text[:1500]
    for pattern in CITY_PATTERNS:
        m = re.search(pattern, search_area, re.IGNORECASE)
        if m:
            found = m.group(0).strip()
            return CITY_CANONICAL.get(found, found)
    # Fallback: search full text
    for pattern in CITY_PATTERNS:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            found = m.group(0).strip()
            return CITY_CANONICAL.get(found, found)
    return None


def fetch_pdf_text(url: str) -> str | None:
    """Fetch a PDF and return extracted text from first 3 pages."""
    if not url.lower().endswith('.pdf'):
        return None
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    # Try twice: first with SSL verification, then without (common for .gov.in domains)
    for verify in (True, False):
        try:
            r = requests.get(url, headers=headers, timeout=30, verify=verify)
            if r.status_code != 200:
                print(f"  HTTP {r.status_code}")
                return None
            # Check it's actually a PDF
            if not r.content[:4] == b'%PDF':
                print(f"  Not a PDF (got {r.content[:20]})")
                return None
            with pdfplumber.open(io.BytesIO(r.content)) as pdf:
                text = ""
                for page in pdf.pages[:3]:
                    t = page.extract_text()
                    if t:
                        text += t + "\n"
                return text if text.strip() else None
        except requests.exceptions.SSLError:
            if verify:
                continue  # retry without SSL verification
            print(f"  SSL error even without verification")
            return None
        except Exception as e:
            print(f"  ERROR: {e}")
            return None
    return None


def main():
    print("=" * 70)
    print("City Extraction Dry Run — 10 postings")
    print("=" * 70)
    print(f"{'#':<3} {'Slug (short)':<40} {'City Detected':<25} {'Source'}")
    print("-" * 70)

    results = []
    for i, (slug, title, url) in enumerate(POSTINGS, 1):
        short_slug = slug[:38]
        if not url.lower().endswith('.pdf'):
            print(f"{i:<3} {short_slug:<40} {'(not a PDF URL)':<25} SKIP")
            results.append((slug, None, 'skip'))
            continue

        text = fetch_pdf_text(url)
        if text is None:
            print(f"{i:<3} {short_slug:<40} {'(fetch failed)':<25} ERROR")
            results.append((slug, None, 'error'))
            continue

        city = extract_city_from_text(text)
        source = "header" if text and city and text.index(city) < 1500 else "body"
        print(f"{i:<3} {short_slug:<40} {(city or '(not found)'):<25} {source}")
        results.append((slug, city, source))

    print("=" * 70)
    found = sum(1 for _, c, _ in results if c)
    print(f"Detected city for {found}/{len(results)} postings")
    print()
    print("Paste this output back to Claude to review before any DB writes.")


if __name__ == '__main__':
    main()
