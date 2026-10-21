import json, os, subprocess, tempfile
from concurrent.futures import ThreadPoolExecutor
log=json.load(open('fetch_log.json'))
sc=[x for x in log if x['status']=='SCANNED_OR_EMPTY']
def ocr(x):
    n=x['rownum']; pdf=f'docs/{n}.pdf'
    with tempfile.TemporaryDirectory() as d:
        subprocess.run(['pdftoppm','-r','200','-png','-l','8',pdf,f'{d}/p'],capture_output=True,timeout=300)
        txt=''
        for f in sorted(os.listdir(d)):
            r=subprocess.run(['tesseract',f'{d}/{f}','-','--psm','6','-l','eng'],capture_output=True,text=True,timeout=300)
            txt+=r.stdout+'\n\f\n'
    open(f'text/{n}.txt','w').write(txt)
    return n,len(txt.strip())
with ThreadPoolExecutor(4) as ex: res=dict(ex.map(ocr,sc))
for x in log:
    if x['rownum'] in res: x['text_chars']=res[x['rownum']]; x['ocr']=True; x['status']='OK' if res[x['rownum']]>200 else 'SCANNED_OR_EMPTY'
json.dump(log,open('fetch_log.json','w'),indent=1)
from collections import Counter; print(Counter(x['status'] for x in log))
