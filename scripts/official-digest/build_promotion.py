#!/usr/bin/env python3 -I
"""
Stage B1 — merge discovery rows + extracted facts into promotion rows (one recruitment hub + N posts each).

Input : work/inject_rows.json, work/facts/<rownum>.json (optional per row), work/fetch_log.json (optional)
Output: work/promote_rows.json   -> loaded into official_digest_promote_<batch> by load_promotion.py
        work/review.csv          -> rows a human may want to glance at (flags)

The hub is the official notification. Every post inherits the hub's dates, organisation, location,
official notification URL and apply URL; per-post facts (vacancies, qualification, pay, age) come from
the document. No aggregator name or URL is carried anywhere.
"""
import argparse, csv, json, os, re
from datetime import date, timedelta

STATE_CODES = {
 'Andhra Pradesh':'IN-AP','Arunachal Pradesh':'IN-AR','Assam':'IN-AS','Bihar':'IN-BR','Chhattisgarh':'IN-CT','Goa':'IN-GA','Gujarat':'IN-GJ',
 'Haryana':'IN-HR','Himachal Pradesh':'IN-HP','Jharkhand':'IN-JH','Karnataka':'IN-KA','Kerala':'IN-KL','Madhya Pradesh':'IN-MP','Maharashtra':'IN-MH',
 'Manipur':'IN-MN','Meghalaya':'IN-ML','Mizoram':'IN-MZ','Nagaland':'IN-NL','Odisha':'IN-OR','Punjab':'IN-PB','Rajasthan':'IN-RJ','Sikkim':'IN-SK',
 'Tamil Nadu':'IN-TN','Telangana':'IN-TG','Tripura':'IN-TR','Uttar Pradesh':'IN-UP','Uttarakhand':'IN-UT','West Bengal':'IN-WB',
 'Delhi':'IN-DL','Jammu and Kashmir':'IN-JK','Ladakh':'IN-LA','Chandigarh':'IN-CH','Puducherry':'IN-PY','Andaman and Nicobar Islands':'IN-AN',
 'Dadra and Nagar Haveli and Daman and Diu':'IN-DH','Lakshadweep':'IN-LD',
}
CATEGORY_SECTOR = {
 'Banking & Insurance':'BANKING','Defence & Police':'DEFENCE','Railways & Metro':'RAILWAY','PSU':'PSU',
 'Central Govt Departments':'GOVERNMENT_CENTRAL','UPSC / SSC':'GOVERNMENT_CENTRAL','Research & Science':'GOVERNMENT_CENTRAL',
}
EMP_TYPE = {'regular':'PERMANENT','permanent':'PERMANENT','contract':'CONTRACTOR','contractual':'CONTRACTOR','deputation':'DEPUTATION',
            'temporary':'TEMPORARY','apprentice':'APPRENTICESHIP','apprenticeship':'APPRENTICESHIP','fellowship':'FELLOWSHIP','intern':'INTERNSHIP'}

def emp_type(s):
    if not s: return None
    s = s.lower()
    for k, v in EMP_TYPE.items():
        if k in s: return v
    return None

def split_org(s):
    """'DMRC - Delhi Metro Rail Corporation' -> ('DMRC', 'Delhi Metro Rail Corporation'); no dash -> (None, s)."""
    s = (s or '').strip()
    m = re.match(r'^(.{2,40}?)\s+-\s+(.{4,})$', s)
    if m and len(m.group(1)) <= len(m.group(2)):
        return m.group(1).strip(), m.group(2).strip()
    return None, s

def split_post_string(s):
    """Fallback decomposition of the discovery string when the document gave nothing."""
    s = (s or '').strip()
    more = bool(re.search(r'\band\s+more\b', s, re.I))
    s = re.sub(r',?\s*\band\s+more\b\.?', '', s, flags=re.I)
    s = re.sub(r'\s+and\s+', ', ', s)
    parts = [p.strip(' .;') for p in re.split(r',|;', s) if p.strip(' .;')]
    # don't split on '/' — "Supervisor (Civil)/(Track)" or "JRF/SRF" are single printed designations
    return [p for p in parts if len(p) > 1], more

def days_from_raw(raw, posted):
    if not raw or not posted: return None, None
    m = re.search(r'(\d{1,3})\s*days', raw, re.I)
    if m:
        d = date.fromisoformat(posted) + timedelta(days=int(m.group(1)))
        return d.isoformat(), f'{m.group(1)} days from publication ({posted})'
    return None, None

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--work', required=True); ap.add_argument('--batch', default='official_digest_20261015')
    a = ap.parse_args()
    rows = json.load(open(os.path.join(a.work, 'inject_rows.json')))
    log = {x['rownum']: x for x in json.load(open(os.path.join(a.work, 'fetch_log.json')))} if os.path.exists(os.path.join(a.work, 'fetch_log.json')) else {}
    out = []; review = []
    for r in rows:
        n = r['rownum']; flags = []
        fp = os.path.join(a.work, 'facts', f'{n}.json')
        f = json.load(open(fp)) if os.path.exists(fp) else None
        if f and f.get('is_recruitment_notice') is False: flags.append('doc_not_a_notice'); f = None
        if f and f.get('covers_multiple_notices'): flags.append('doc_is_index_page')
        short, full = split_org(r['org'])
        org_official = (f or {}).get('organisation_name_official')
        # posts
        posts = []
        if f and f.get('posts'):
            for i, p in enumerate(f['posts']):
                if not p.get('name'): continue
                posts.append({
                    'name': p['name'].strip(), 'post_code': p.get('post_code'), 'vacancy_total': p.get('vacancy_total'),
                    'vacancy_details': p.get('vacancy_details'), 'qualification_text': p.get('qualification_text'),
                    'experience_text': p.get('experience_text'), 'age_min': p.get('age_min'), 'age_max': p.get('age_max'),
                    'salary_min': p.get('salary_min'), 'salary_max': p.get('salary_max'), 'pay_scale_text': p.get('pay_scale_text'),
                    'employment_type': emp_type(p.get('employment_type')) or emp_type((f or {}).get('engagement_basis')),
                })
            src = 'document'
        else:
            names, more = split_post_string(r['post'])
            for nm in names:
                posts.append({'name': nm, 'vacancy_total': r['vac'] if len(names) == 1 else None, 'employment_type': None})
            if more: flags.append('and_more_unresolved')
            flags.append('posts_from_discovery_string')
            src = 'discovery_string'
        if not posts: flags.append('no_posts'); continue
        # dates
        end = (f or {}).get('application_end_date') or r['last_date']
        end_note = None
        if not end and r.get('last_date_raw'):
            end, end_note = days_from_raw(r['last_date_raw'], r['posted'])
            if not end: flags.append('no_end_date:' + r['last_date_raw'])
        start = (f or {}).get('application_start_date')
        notif = (f or {}).get('notification_date') or r['posted']
        if end and r['last_date'] and end != r['last_date']: flags.append(f'end_date_differs doc={end} list={r["last_date"]}')
        total = (f or {}).get('total_vacancies')
        if total is None:
            s = [p['vacancy_total'] for p in posts if p.get('vacancy_total') is not None]
            total = sum(s) if s and len(s) == len(posts) else r['vac']
        if total and r['vac'] and total != r['vac']: flags.append(f'vacancies_differ doc={total} list={r["vac"]}')
        state = (f or {}).get('location_state') or r['state']
        state = state if state in STATE_CODES else (r['state'] if r['state'] in STATE_CODES else None)
        apply_url = r.get('apply_url') or (f or {}).get('apply_url')
        apply_mode = (f or {}).get('apply_mode')
        sector = CATEGORY_SECTOR.get(r['category']) or ('GOVERNMENT_STATE' if state else 'GOVERNMENT_CENTRAL')
        hub = {
            'rownum': n, 'batch': a.batch, 'flags': flags, 'posts_source': src,
            'org_short': short, 'org_full': full, 'org_official': org_official, 'org_sector': sector, 'org_state': state,
            'org_website': r.get('website'),
            'category': r['category'], 'state_name': state, 'state_code': STATE_CODES.get(state),
            'official_url': r['url'], 'apply_url': apply_url, 'apply_mode': apply_mode,
            'application_email': (f or {}).get('application_email'),
            'advertisement_number': (f or {}).get('advertisement_number'),
            'notification_date': notif, 'application_start_date': start, 'application_end_date': end, 'end_date_note': end_note,
            'exam_or_interview_date': (f or {}).get('exam_or_interview_date'),
            'total_vacancies': total, 'engagement_basis': (f or {}).get('engagement_basis'),
            'employment_type': emp_type((f or {}).get('engagement_basis')),
            'fee_general': (f or {}).get('fee_general'), 'fee_reserved': (f or {}).get('fee_reserved'), 'fee_note': (f or {}).get('fee_note'),
            'selection_process': (f or {}).get('selection_process'), 'age_note': (f or {}).get('age_note'),
            'location_city': (f or {}).get('location_city'),
            'doc_notes': (f or {}).get('notes'), 'doc_status': log.get(n, {}).get('status'),
            'discovery_post_string': r['post'], 'posts': posts,
        }
        out.append(hub)
        if flags: review.append({'rownum': n, 'org': r['org'], 'post': r['post'], 'flags': '; '.join(flags), 'n_posts': len(posts)})
    json.dump(out, open(os.path.join(a.work, 'promote_rows.json'), 'w'), indent=1, ensure_ascii=False)
    with open(os.path.join(a.work, 'review.csv'), 'w', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=['rownum', 'org', 'post', 'n_posts', 'flags']); w.writeheader(); w.writerows(review)
    from collections import Counter
    print(f'hubs={len(out)} posts={sum(len(h["posts"]) for h in out)} from_document={sum(1 for h in out if h["posts_source"]=="document")} flagged={len(review)}')
    print(Counter(fl.split(':')[0].split(' ')[0] for h in out for fl in h['flags']))

if __name__ == '__main__':
    main()
