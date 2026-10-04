import re,json,collections
CAT={'ur','gen','general','obc','sc','st','ews','pwbd','pwd','total','others','other'}
GENERIC=re.compile(r'^(no\.? ?of|number of|sl\.? ?no|s\.? ?no|various|other posts?|misc|total|grand total|posts?$|vacanc)',re.I)
SPORTS=set('athletics archery boxing wrestling hockey kabaddi football volleyball basketball judo swimming shooting weightlifting gymnastics handball cycling rowing kayaking canoeing fencing taekwondo wushu cricket badminton tennis'.split())
DISC=set('''plastic neurosurgery cardiothoracic vascular dentistry dental venereology leprosy transfusion immunology genetics emergency critical care community family sports rehabilitation nuclear preventive journalism education punjabi bengali tamil telugu kannada malayalam marathi gujarati odia assamese anatomy physiology biochemistry pathology microbiology pharmacology paediatrics pediatrics medicine surgery orthopaedics orthopedics ophthalmology ent dermatology psychiatry radiology anaesthesia anesthesiology obstetrics gynaecology gynecology forensic cardiology neurology nephrology urology oncology physics chemistry mathematics maths botany zoology english hindi history geography economics sociology philosophy commerce management law biology statistics geology psychology sanskrit urdu political science'''.split())
COMB=re.compile(r'/|\s(and|&)\s|\bor\b',re.I)
def classify(name,count):
    n=(name or '').strip(); l=n.lower()
    if not 3<=len(n)<=200: return 'LEN'
    if re.fullmatch(r'[\d\s.,()-]+',n): return 'NUMERIC_NAME'
    if re.match(r'(department|dept\.?|faculty|school|college|centre|center|institute|division|unit) (of|for)\b',l): return 'DEPARTMENT_LINE'
    if l in CAT: return 'CATEGORY_LABEL'
    if GENERIC.match(l): return 'GENERIC'
    toks=re.findall(r'[a-z]+',l)
    if toks and all(t in SPORTS or t in ('sports','sport') for t in toks) and any(t in SPORTS for t in toks): return 'SPORT_DISCIPLINE'
    if toks and len(toks)<=3 and all(t in DISC for t in toks): return 'ACADEMIC_DISCIPLINE'
    if COMB.search(re.sub(r'\([^)]*\)','',n)): return 'COMBINED'
    try: c=int(count)
    except: return 'BAD_COUNT'
    if c<=0: return 'BAD_COUNT'
    return 'OK'
rows=[l.rstrip('\n').split('\t') for l in open('lines.tsv',encoding='utf8')]
res=[(r[0],r[2],r[3],classify(r[2],r[3])) for r in rows]
c=collections.Counter(x[3] for x in res); print(c, len(res))
per=collections.defaultdict(list)
for x in res: per[x[0]].append(x[3])
print('notices',len(per),'all-ok',sum(all(v=='OK' for v in vs) for vs in per.values()),'some-reject',sum(any(v!='OK' for v in vs) for vs in per.values()))
json.dump(res,open('a1_res.json','w'),ensure_ascii=False)
