import json,re,collections
exec(open('postvac_a1_base_rules.py').read().split("rows=[l.rstrip")[0])  # base rules
ROLEW=r"officer|engineers?|assistants?|asst|clerk|teachers?|professor|lecturer|fellow|associate|scientist|manager|director|supervisor|technician|driver|constable|inspector|consultant|analyst|specialist|librarian|registrar|dean|accountant|superintendent|operator|attendant|helper|peon|watchman|chowkidar|nurse|pharmacist|physician|doctor|surgeon|radiologist|advocate|editor|translator|counsellor|programmer|developer|trainee|apprentice|stenographer|steno|typist|sweeper|cook|guard|head|principal|secretary|member|executive|trainer|instructor|tutor|demonstrator|resident|gdmo|mechanic|electrician|fitter|welder|surveyor|draughtsman|draftsman|modeller|servant|volunteer|worker|educator|investigator|researcher|coordinator|administrator|jailor|warder|fireman|ranger|forester|patwari|lineman|tradesman|cashier|auditor|avp|ciso|dgm|agm|mts|pgt|tgt|prt|jrf|srf|professional|intensivist|pathologist|anaesthetist|anesthetist|optometrist|technologist|physiotherapist|perfusionist|librarian|physician|electrician|dietician|dietitian|pharmacist|chemist|geologist|economist|lawyer|commander|controller|warden|dietician|support|staff|personnel|sister|boy|reporter|expert|commissioner|in-charge|incharge|carpenter|faculty|keeper"
ROLE=re.compile(r"\b("+ROLEW+r")\b",re.I)
def final(name,count):
    r=classify(name,count)
    if r!='OK': return r
    if not ROLE.search(name): return 'NO_ROLE_NOUN'
    return 'OK'
if __name__=='__main__':
    rows=[l.rstrip('\n').split('\t') for l in open('lines.tsv',encoding='utf8')]
    res=[(r[0],r[2],r[3],final(r[2],r[3])) for r in rows]
    print(collections.Counter(x[3] for x in res))
    per=collections.defaultdict(list)
    for x in res: per[x[0]].append(x[3])
    print('notices',len(per),'fully-resolved',sum(all(v=='OK' for v in vs) for vs in per.values()))
    json.dump(res,open('final_res.json','w'),ensure_ascii=False)
    FP={'Plastic Surgery','Centre for Teacher Education','No of Posts','Sports Shooting','Civil Engineering'}
    S=[x for f in ('a1_sample.json','a1_sample2.json','a1_sample3.json') for x in json.load(open(f))]
    acc=[x for x in S if x[3]=='OK']  # was accepted by an earlier ruleset
    fin={(x[0],x[1],x[2]):x[3] for x in res}
    leaked=[x for x in acc if x[1] in FP and fin[(x[0],x[1],x[2])]=='OK']
    dropped=[x for x in acc if x[1] not in FP and fin[(x[0],x[1],x[2])]!='OK']
    print('sampled accepted',len(acc),'FP known',sum(x[1] in FP for x in acc),'FP still accepted',len(leaked),'genuine now dropped',[(x[1],fin[(x[0],x[1],x[2])]) for x in dropped])
