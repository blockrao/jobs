#!/usr/bin/env python3 -I
"""Stage A1: fetch every official notification for the INJECT batch and extract text.
Writes docs/<rownum>.<ext>, text/<rownum>.txt and fetch_log.json."""
import json, os, re, subprocess, sys, time, hashlib
from concurrent.futures import ThreadPoolExecutor
import urllib.request, urllib.error, ssl

BASE = os.path.dirname(os.path.abspath(__file__))
rows = json.load(open(os.path.join(BASE, 'inject_rows.json')))
os.makedirs(os.path.join(BASE, 'docs'), exist_ok=True)
os.makedirs(os.path.join(BASE, 'text'), exist_ok=True)
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36'
ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE

def fetch(url):
    last = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': '*/*'})
            with urllib.request.urlopen(req, timeout=45, context=ctx) as r:
                data = r.read(); ct = r.headers.get('Content-Type', '')
                return data, ct, r.status, None
        except urllib.error.HTTPError as e:
            return None, None, e.code, str(e)
        except Exception as e:
            last = str(e); time.sleep(2 * (attempt + 1))
    return None, None, None, last

def html_to_text(data):
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(data, 'html.parser')
        for t in soup(['script', 'style', 'nav', 'footer', 'header']): t.decompose()
        return re.sub(r'\n{3,}', '\n\n', soup.get_text('\n'))
    except Exception as e:
        return ''

def work(r):
    n = r['rownum']; url = r['url']; out = {'rownum': n, 'url': url}
    if not url:
        out['status'] = 'NO_URL'; return out
    data, ct, code, err = fetch(url)
    out['http'] = code; out['error'] = err
    if data is None:
        out['status'] = 'FETCH_FAIL'; return out
    out['bytes'] = len(data); out['content_type'] = ct
    is_pdf = data[:5] == b'%PDF-' or 'pdf' in (ct or '').lower()
    ext = 'pdf' if is_pdf else 'html'
    path = os.path.join(BASE, 'docs', f'{n}.{ext}')
    open(path, 'wb').write(data)
    out['doc_type'] = ext
    txt = ''
    if is_pdf:
        try:
            txt = subprocess.run(['pdftotext', '-layout', path, '-'], capture_output=True, text=True, timeout=120).stdout
        except Exception as e:
            out['error'] = f'pdftotext: {e}'
        try:
            pages = subprocess.run(['pdfinfo', path], capture_output=True, text=True, timeout=30).stdout
            m = re.search(r'Pages:\s+(\d+)', pages); out['pages'] = int(m.group(1)) if m else None
        except Exception: pass
    else:
        txt = html_to_text(data)
        # if the HTML page links to PDFs, record them (candidate notification docs)
        links = re.findall(r'href=["\']([^"\']+\.pdf[^"\']*)["\']', data.decode('utf-8', 'ignore'), re.I)
        out['pdf_links'] = list(dict.fromkeys(links))[:30]
    open(os.path.join(BASE, 'text', f'{n}.txt'), 'w').write(txt)
    out['text_chars'] = len(txt.strip())
    out['status'] = 'OK' if len(txt.strip()) > 200 else ('SCANNED_OR_EMPTY' if is_pdf else 'THIN_HTML')
    return out

if __name__ == '__main__':
    with ThreadPoolExecutor(max_workers=8) as ex:
        results = list(ex.map(work, rows))
    json.dump(results, open(os.path.join(BASE, 'fetch_log.json'), 'w'), indent=1)
    from collections import Counter
    print(Counter(x['status'] for x in results))
