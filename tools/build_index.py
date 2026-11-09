#!/usr/bin/env python3
"""Готовый поисковый индекс на каждый перевод: data/ix/<TR>.json
{ids:[номер стиха], txt:[текст], tok:{слово:[дельты индексов стихов]}}.
Правила нормализации — те же, что nrm() в search.js."""
import json, os, unicodedata
D='data/'
idx=json.load(open(D+'index.json'))
books=[b['id'] for b in idx['books']]
def nrm(w):
    w=w.lower().replace('ё','е')
    return ''.join(c for c in w if unicodedata.category(c).startswith('L'))
os.makedirs(D+'ix',exist_ok=True)
for t in idx['translations']:
    rows=[]
    for bi,b in enumerate(books):
        p=f"{D}tr/{t['id']}/{b}.json"
        if not os.path.exists(p): continue
        for c,vs in json.load(open(p)).items():
            for v,txt in vs.items(): rows.append((bi*10**6+int(c)*1000+int(v),txt))
    rows.sort()
    tok={}
    for k,(n,txt) in enumerate(rows):
        seen=set()
        for w in txt.split():
            x=nrm(w)
            if x and x not in seen:
                seen.add(x); tok.setdefault(x,[]).append(k)
    dt={}
    for w,a in tok.items():
        dt[w]=[a[0]]+[a[i]-a[i-1] for i in range(1,len(a))]
    out={'ids':[r[0] for r in rows],'txt':[r[1] for r in rows],'tok':dt}
    json.dump(out,open(f"{D}ix/{t['id']}.json",'w',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))
    print(t['id'],len(rows),len(tok))
