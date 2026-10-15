#!/usr/bin/env python3 -I
"""
Stage A2 — extract structured recruitment facts from official notification text.

Input : work/inject_rows.json  (spreadsheet rows for the INJECT batch)
        work/text/<rownum>.txt  (text of the official document; produced by fetch_docs.py)
Output: work/facts/<rownum>.json (one per document, only facts stated in the document)

Runs standalone with ANTHROPIC_API_KEY (reads .env.local in the repo root if present).
Idempotent: skips rows whose facts file already exists. Safe to re-run.

    python3 -I scripts/official-digest/extract_facts.py --work <workdir> [--model claude-sonnet-5-5] [--limit N] [--rows 1,2,3]
"""
import argparse, json, os, re, sys, time, urllib.request, urllib.error

MODEL_DEFAULT = 'claude-sonnet-5-5'
MAX_CHARS = 60000  # ~15k tokens of document text; notices longer than this are truncated after the post tables

SYSTEM = """You extract facts from Indian government recruitment notifications for a job-discovery site.
Return ONLY a JSON object. Every value must be stated in the document text you are given; if it is not stated, use null.
Never infer, estimate or fill from general knowledge. Never invent URLs, dates, salaries or vacancy counts.
Dates as YYYY-MM-DD. Money as integer rupees (monthly amount for salary; the fee amount for fees).

Schema:
{
 "is_recruitment_notice": true|false,           // false if the text is not a recruitment/vacancy notice (e.g. a results page, an index page, unreadable)
 "covers_multiple_notices": true|false,          // true if the text is an index/list page of several separate notices
 "organisation_name_official": string|null,      // the recruiting body's own name as printed (full form)
 "advertisement_number": string|null,            // Advt No. / Notification No. / Memo No.
 "notification_date": string|null,
 "application_start_date": string|null,
 "application_end_date": string|null,            // last date to apply / walk-in date if walk-in
 "exam_or_interview_date": string|null,
 "apply_mode": "Online"|"Offline"|"Email"|"Walk-in"|null,
 "apply_url": string|null,                       // only if printed in the document
 "application_email": string|null,
 "engagement_basis": string|null,                // in the document's own words, e.g. "Purely contractual", "Deputation / post-retirement contract"
 "fee_general": integer|null, "fee_reserved": integer|null, "fee_note": string|null,
 "selection_process": string|null,               // short factual summary in the document's own terms
 "age_note": string|null,                        // age limits as stated, with the reference date if given
 "location_state": string|null, "location_city": string|null,  // place of posting / institution location if stated
 "total_vacancies": integer|null,
 "posts": [
   {
    "name": string,                 // the designation / role title exactly as printed, singular, without the post code
    "post_code": string|null,
    "vacancy_total": integer|null,  // for this role across all departments/categories; null if not stated
    "vacancy_details": string|null, // category/department/discipline breakdown as text, e.g. "UR 2, OBC 1; Civil 4, S&T 2"
    "qualification_text": string|null,
    "experience_text": string|null,
    "age_min": integer|null, "age_max": integer|null,
    "salary_min": integer|null, "salary_max": integer|null, "pay_scale_text": string|null,
    "employment_type": "Regular"|"Contract"|"Deputation"|"Temporary"|"Apprentice"|"Fellowship"|null
   }
 ],
 "notes": string|null   // anything a reviewer must know (e.g. "faculty matrix: vacancies per department", "scanned, partly unreadable")
}

Rules for "posts":
- One entry per distinct designation/role title. Departmental, discipline or subject variants of the same designation are ONE post
  (e.g. "Assistant Professor" once, with the department breakdown in vacancy_details), unless the printed post name itself differs.
- Grades/levels that are printed as separate posts (e.g. "Engineer" vs "Senior Engineer", "Lab Technician Gr-II" vs "Gr-III") are separate posts.
- If the document lists no explicit table but names roles in prose, still list each named role.
- Do not merge roles with "and More"; do not output a role that is not in the document.
"""

def load_env(repo_root):
    for name in ('.env.local', '.env'):
        p = os.path.join(repo_root, name)
        if os.path.exists(p):
            for line in open(p, encoding='utf-8', errors='ignore'):
                m = re.match(r'\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$', line)
                if m and m.group(1) not in os.environ:
                    os.environ[m.group(1)] = m.group(2).strip().strip('"').strip("'")

def call_claude(model, text, key, hint):
    body = {
        'model': model, 'max_tokens': 8000, 'temperature': 0,
        'system': SYSTEM,
        'messages': [{'role': 'user', 'content':
            f"Discovery-list hint (may be wrong; the document wins): organisation='{hint['org']}', posts='{hint['post']}', vacancies={hint['vac']}, last_date={hint['last_date']}.\n\n"
            f"DOCUMENT TEXT:\n<<<\n{text}\n>>>\n\nReturn the JSON object only."}],
    }
    req = urllib.request.Request('https://api.anthropic.com/v1/messages', data=json.dumps(body).encode(),
                                 headers={'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                out = json.loads(r.read())
                content = ''.join(b.get('text', '') for b in out.get('content', []))
                usage = out.get('usage', {})
                return content, usage
        except urllib.error.HTTPError as e:
            msg = e.read().decode('utf-8', 'ignore')[:300]
            if e.code in (429, 500, 502, 503, 529):
                time.sleep(5 * (attempt + 1)); continue
            raise RuntimeError(f'HTTP {e.code}: {msg}')
        except Exception:
            time.sleep(5 * (attempt + 1))
    raise RuntimeError('API failed after retries')

def parse_json(s):
    s = s.strip()
    s = re.sub(r'^```(?:json)?\s*|\s*```$', '', s)
    i = s.find('{'); j = s.rfind('}')
    return json.loads(s[i:j + 1])

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--work', required=True)
    ap.add_argument('--model', default=MODEL_DEFAULT)
    ap.add_argument('--limit', type=int, default=0)
    ap.add_argument('--rows', default='')
    a = ap.parse_args()
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    load_env(repo_root)
    key = os.environ.get('ANTHROPIC_API_KEY')
    if not key:
        sys.exit('ANTHROPIC_API_KEY not set (export it or put it in .env.local)')
    rows = json.load(open(os.path.join(a.work, 'inject_rows.json')))
    only = {int(x) for x in a.rows.split(',') if x.strip()}
    os.makedirs(os.path.join(a.work, 'facts'), exist_ok=True)
    done = 0; tot_in = tot_out = 0
    for r in rows:
        n = r['rownum']
        if only and n not in only: continue
        out_path = os.path.join(a.work, 'facts', f'{n}.json')
        txt_path = os.path.join(a.work, 'text', f'{n}.txt')
        if os.path.exists(out_path): continue
        if not os.path.exists(txt_path): continue
        text = open(txt_path, encoding='utf-8', errors='ignore').read()
        if len(text.strip()) < 200: continue
        if len(text) > MAX_CHARS: text = text[:MAX_CHARS] + '\n[TRUNCATED]'
        try:
            raw, usage = call_claude(a.model, text, key, r)
            facts = parse_json(raw)
            facts['_meta'] = {'rownum': n, 'model': a.model, 'usage': usage, 'text_chars': len(text)}
            json.dump(facts, open(out_path, 'w'), indent=1, ensure_ascii=False)
            tot_in += usage.get('input_tokens', 0); tot_out += usage.get('output_tokens', 0)
            print(f'{n}: {len(facts.get("posts") or [])} posts  ({usage.get("input_tokens")}/{usage.get("output_tokens")} tok)', flush=True)
        except Exception as e:
            print(f'{n}: ERROR {e}', flush=True)
            json.dump({'_error': str(e), '_meta': {'rownum': n}}, open(out_path + '.err', 'w'))
        done += 1
        if a.limit and done >= a.limit: break
    print(f'done {done} docs, tokens in={tot_in} out={tot_out}')

if __name__ == '__main__':
    main()
