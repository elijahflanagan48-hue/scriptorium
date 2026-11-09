#!/usr/bin/env python3
"""Предрасчёт для панели слова: «Как переводят» (data/rend/<TR>.json) и «Формы» (data/forms_H.json, forms_G.json: {strong:[число_стихов,[форма,морфология,n],...]}).
Считает по ВСЕМ вхождениям слова, а не по выборке. Запуск из корня репозитория."""
import json, os, re, collections
D='data/'
idx=json.load(open(D+'index.json'))
books=[b['id'] for b in idx['books']]
clean=lambda s: re.sub(r'[.,;:!?«»"“”‘’()\[\]—–·]','',s.lower()).strip()
trs=[t['id'] for t in idx['translations']]
forms=collections.defaultdict(collections.Counter)
rend={t:collections.defaultdict(collections.Counter) for t in trs}
nverse=collections.defaultdict(int)
for b in books:
    o=json.load(open(f'{D}orig/{b}.json'))['chapters']
    data={}
    for t in trs:
        try: data[t]=(json.load(open(f'{D}tr/{t}/{b}.json')),json.load(open(f'{D}align/{t}/{b}.json')))
        except FileNotFoundError: pass
    for c,vs in o.items():
        for v,ws in vs.items():
            seen=set()
            for i,w in enumerate(ws):
                k=w[1]
                if not k: continue
                forms[k][(w[0],w[2])]+=1; seen.add(k)
            for k in seen: nverse[k]+=1
            for t,(tr,al) in data.items():
                txt=tr.get(c,{}).get(v); a=al.get(c,{}).get(v)
                if not txt or not a: continue
                ch=txt.split()
                if len(a)!=len(ch): continue
                for i,w in enumerate(ws):
                    k=w[1]
                    if not k: continue
                    r=' '.join(x for x in (clean(ch[j]) for j in range(len(ch)) if a[j]==i) if x) or '—'
                    rend[t][k][r]+=1
os.makedirs(D+'rend',exist_ok=True)
for t in trs:
    out={k:[[r,n] for r,n in c.most_common(6)] for k,c in rend[t].items()}
    json.dump(out,open(f'{D}rend/{t}.json','w',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))
for L in 'HG':
    fo={k:[nverse[k]]+[[f,m,n] for (f,m),n in c.most_common(12)] for k,c in forms.items() if k[0]==L}
    json.dump(fo,open(f'{D}forms_{L}.json','w',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))
