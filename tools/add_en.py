#!/usr/bin/env python3
"""Добавляет английские переводы из scrollmapper/bible_databases (JSON) в data/tr/<ID>/<Book>.json и index.json
(псалмы и главы приводятся к еврейской нумерации, как у остальных переводов). Дальше: align.py, split_tr.py, t2s.py, build_index.py.
Запуск: python3 tools/add_en.py <папка с JSON> ID:файл:Название:лицензия:источник ..."""
import json, os, re, sys
SRC=sys.argv[1].rstrip('/')+'/'; D=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','data')+'/'
idx=json.load(open(D+'index.json',encoding='utf-8')); books=idx['books']
hebcount={b['id']:{c:max(map(int,vs)) for c,vs in json.load(open(D+'orig/%s.json'%b['id'],encoding='utf-8'))['chapters'].items()} for b in books}
def sm(path):
    j=json.load(open(path,encoding='utf-8'))
    return {b['name']:{c['chapter']:{v['verse']:re.sub(r'\s+',' ',v['text']).strip() for v in c['verses']} for c in b['chapters']} for b in j['books']}
unresolved=[]
def align_ot(bid,tr):
    H=hebcount[bid]; hch=sorted(map(int,H)); tch=sorted(tr)
    allc=sorted(set(hch)|set(tch))
    hm={c:H.get(str(c),0) for c in allc}; tm={c:(max(tr[c]) if c in tr and tr[c] else 0) for c in allc}
    out={}; i=0
    while i<len(allc):
        c=allc[i]
        if hm[c]==tm[c]:
            if c in tr: out[c]=tr[c]
            i+=1; continue
        j=i
        while j<len(allc) and hm[allc[j]]!=tm[allc[j]]: j+=1
        grp=allc[i:j]
        if sum(hm[g]-tm[g] for g in grp)==0:
            tl=[(g,v) for g in grp for v in range(1,tm[g]+1)]; hl=[(g,v) for g in grp for v in range(1,hm[g]+1)]
            for (tg,tv),(hg,hv) in zip(tl,hl):
                t=tr.get(tg,{}).get(tv)
                if t: out.setdefault(hg,{})[hv]=t
        else:
            for g in grp:
                if g in tr: out[g]=tr[g]
            unresolved.append((bid,grp))
        i=j
    return out
for spec in sys.argv[2:]:
    tid,fn,name,lic,src=spec.split(':',4)
    E=sm(SRC+fn); out={}
    for b in books:
        s=E.get(b['scrollmapper']) or E.get('Revelation')
        if b['id']!='Ps': out[b['id']]=dict(s)
        else:
            P={}
            for c,vs in s.items():
                off=hebcount['Ps'][str(c)]-max(vs)
                P[c]={v+off:t for v,t in vs.items()} if 0<off<=3 else dict(vs)
            out[b['id']]=P
        if b['testament']=='OT': out[b['id']]=align_ot(b['id'],out[b['id']])
    os.makedirs(D+'tr/'+tid,exist_ok=True)
    for bid,chs in out.items():
        json.dump({str(c):{str(v):t for v,t in vs.items()} for c,vs in sorted(chs.items())},open(D+'tr/%s/%s.json'%(tid,bid),'w',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))
    meta={'id':tid,'name':name,'lang':'en','license':lic,'source':src,'books':[b['id'] for b in books]}
    idx['translations']=[t for t in idx['translations'] if t['id']!=tid]+[meta]
    print(tid,'ok')
json.dump(idx,open(D+'index.json','w',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))
print('unresolved',unresolved)
