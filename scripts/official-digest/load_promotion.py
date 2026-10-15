#!/usr/bin/env python3 -I
"""Stage B2 — load work/promote_rows.json into official_digest_promote via the official_digest_load RPC.
    python3 -I scripts/official-digest/load_promotion.py --work <dir> --batch official_digest_20261015 --key <publishable key> [--rows 6,8]
The RPC must be granted to anon for the duration of the load (grant/revoke is done by the operator in SQL)."""
import argparse, json, os, urllib.request
ap = argparse.ArgumentParser(); ap.add_argument('--work', required=True); ap.add_argument('--batch', required=True)
ap.add_argument('--key', required=True); ap.add_argument('--url', default='https://cusxodjgkrttwmdmhvso.supabase.co'); ap.add_argument('--rows', default='')
a = ap.parse_args()
rows = json.load(open(os.path.join(a.work, 'promote_rows.json')))
only = {int(x) for x in a.rows.split(',') if x.strip()}
if only: rows = [r for r in rows if r['rownum'] in only]
total = 0
for k in range(0, len(rows), 50):
    body = json.dumps({'p_batch': a.batch, 'p_rows': rows[k:k + 50]}).encode()
    req = urllib.request.Request(a.url + '/rest/v1/rpc/official_digest_load', data=body,
        headers={'apikey': a.key, 'Authorization': 'Bearer ' + a.key, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=120) as r: n = int(r.read()); total += n
print('loaded', total, 'of', len(rows))
