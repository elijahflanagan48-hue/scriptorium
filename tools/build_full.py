#!/usr/bin/env python3
import json, os, re, sys, unicodedata, collections
import xml.etree.ElementTree as ET
H='/home/claude/full/'; D='/home/claude/data/'; OUT=os.environ.get('OUT','/home/claude/app/data/')
PUBLIC=os.environ.get('PUBLIC')=='1'
NS='{http://www.bibletechnologies.net/2003/OSIS/namespace}'
os.makedirs(OUT+'orig',exist_ok=True)
books=json.load(open(H+'books.json'))['books']
BI={b['id']:i for i,b in enumerate(books)}
nfc=lambda s:unicodedata.normalize('NFC',s)

# ---- lexicons (reuse prototype logic)
def strip_refs(h):
    h=re.sub(r"<ref='[^']*'>(.*?)</ref>",r'\1',h); h=re.sub(r'<BR\s*/?>','\n',h,flags=re.I)
    h=re.sub(r'</?(?!b>|i>|/b>|/i>)[a-zA-Z][^>]*>','',h); return re.sub(r'\n{2,}','\n',h).strip()
def load_lex(path,pref):
    by,gk={},{}
    for line in open(path,encoding='utf-8-sig'):
        line=line.rstrip('\n')
        if not re.match(r'^[GH]\d{4}',line): continue
        f=line.split('\t')
        if len(f)<8: continue
        ent={'lemma':f[3],'tr':f[4],'morph':f[5],'gloss':f[6],'def':strip_refs(f[7])[:1400]}
        by.setdefault(f[0],ent); by.setdefault(f[0][:5],ent)
        gk.setdefault(nfc(f[3]),f[0][:5])
    return by,gk
lexH,_=load_lex(D+'tbesh.txt','H'); lexG,gidx=load_lex(D+'tbesg.txt','G')

# ---- originals
def parse_heb(path,osis):
    out=collections.defaultdict(dict)
    for v in ET.parse(path).getroot().iter(NS+'verse'):
        oid=v.get('osisID')
        if not oid: continue
        b,c,vs=oid.split('.')
        words=[]
        for el in v:
            tag=el.tag.replace(NS,'')
            if tag=='w':
                lem=el.get('lemma','')
                mm=re.search(r'(\d+)\s*([a-z])?',lem.split('/')[-1]) or re.search(r'(\d+)\s*([a-z])?',lem)
                key=('H%04d'%int(mm.group(1))+(mm.group(2) or '')) if mm else ''
                words.append([nfc((el.text or '').replace('/','')),key,el.get('morph','')])
            elif tag=='seg' and words: words[-1][0]+=(el.text or '')
        out[int(c)][int(vs)]=words
    return out
GR=dict(zip(['Matt','Mark','Luke','John','Acts','Rom','1Cor','2Cor','Gal','Eph','Phil','Col','1Thess','2Thess','1Tim','2Tim','Titus','Phlm','Heb','Jas','1Pet','2Pet','1John','2John','3John','Jude','Rev'],
 ['Mt','Mk','Lk','Jn','Ac','Ro','1Co','2Co','Ga','Eph','Php','Col','1Th','2Th','1Ti','2Ti','Tit','Phm','Heb','Jas','1Pe','2Pe','1Jn','2Jn','3Jn','Jud','Re']))
def parse_grc(path):
    out=collections.defaultdict(lambda:collections.defaultdict(list))
    for line in open(path,encoding='utf-8'):
        f=line.split()
        if len(f)<7: continue
        r=f[0]; c,v=int(r[2:4]),int(r[4:6])
        out[c][v].append([nfc(f[3]),gidx.get(nfc(f[6]),''),f[1].strip('-')+' '+f[2]])
    return out
occ=collections.defaultdict(list); used=set(); hebcount={}
for b in books:
    i=b['id']
    if b['testament']=='OT': d=parse_heb(H+'ot/%s.xml'%i,i); kind='heb'
    else: d=parse_grc(H+'nt/%s.txt'%GR[i]); kind='grc'
    ch={str(c):{str(v):d[c][v] for v in sorted(d[c])} for c in sorted(d)}
    json.dump({'id':i,'lang':kind,'chapters':ch},open(OUT+'orig/%s.json'%i,'w',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))
    hebcount[i]={c:max(map(int,vs)) for c,vs in ch.items()}
    for c,vs in ch.items():
        for v,ws in vs.items():
            for w in ws:
                if w[1]: used.add(w[1]); occ[w[1]].append(BI[i]*1000000+int(c)*1000+int(v))
lex={}
for k in used:
    L=lexH if k[0]=='H' else lexG
    e=L.get(k) or L.get(k[:5])
    if e: lex[k]=e
json.dump({k:v for k,v in lex.items() if k[0]=='H'},open(OUT+'lex_H.json','w',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))
json.dump({k:v for k,v in lex.items() if k[0]=='G'},open(OUT+'lex_G.json','w',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))
# occurrences: dedupe consecutive, delta-friendly plain lists
json.dump({k:v for k,v in occ.items()},open(OUT+'occ.json','w'),separators=(',',':'))
print('orig done; keys',len(used),'lex',len(lex),'missing',len(used-set(lex)),file=sys.stderr)

# ---- translations
def sm(path):
    j=json.load(open(path,encoding='utf-8'))
    return {b['name']:{c['chapter']:{v['verse']:re.sub(r'\s+',' ',v['text']).strip() for v in c['verses']} for c in b['chapters']} for b in j['books']}
def tr_write(tid,name,lang,lic,src,data):
    os.makedirs(OUT+'tr/'+tid,exist_ok=True)
    for bid,chs in data.items():
        json.dump({str(c):{str(v):t for v,t in vs.items()} for c,vs in chs.items()},open(OUT+'tr/%s/%s.json'%(tid,bid),'w',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))
    return {'id':tid,'name':name,'lang':lang,'license':lic,'source':src,'books':sorted(data,key=lambda x:BI[x])}

def align_ot(bid,tr):
    """Map translation chapters to Hebrew numbering using groups of consecutive chapters with differing sizes (sum of differences 0 => flat order)."""
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
unresolved=[]
def fix(tid,data):
    for b in books:
        if b['testament']!='OT' or b['id'] not in data: continue
        i=b['id']; d=data[i]
        if tid=='RST' and i=='Job':
            d=dict(d); j39,j40,j41=d[39],d[40],d[41]
            d[39]={v:t for v,t in j39.items() if v<=30}
            d[40]={**{v-30:t for v,t in j39.items() if v>30},**{v+5:t for v,t in j40.items() if v<=19}}
            d[41]={**{v-19:t for v,t in j40.items() if v>19},**{v+8:t for v,t in j41.items()}}
        if tid=='RST' and i=='Dan':
            d=dict(d); d3,d4=d[3],d[4]
            d[3]={**{v:t for v,t in d3.items() if v<=23},**{v-67:t for v,t in d3.items() if 91<=v<=97}}
            d[4]={**{v-97:t for v,t in d3.items() if v>=98},**{v+3:t for v,t in d4.items()}}
        data[i]=align_ot(i,d)
meta=[]
# Synodal
S=sm(D+'RusSynodal.json'); RST={}
for b in books:
    src=S.get(b['scrollmapper']) or S.get('Revelation')
    if b['id']!='Ps': RST[b['id']]=dict(src); continue
    P={}
    for c in range(1,9): P[c]=src[c]
    P[9]={v:t for v,t in src[9].items() if v<=21}; P[10]={v-21:t for v,t in src[9].items() if v>21}
    for c in range(11,114): P[c]=src[c-1]
    P[114]={v:t for v,t in src[113].items() if v<=8}; P[115]={v-8:t for v,t in src[113].items() if v>8}
    P[116]=dict(src[114]); P[116].update({v+9:t for v,t in src[115].items()})
    for c in range(117,147): P[c]=src[c-1]
    P[147]=dict(src[146]); P[147].update({v+11:t for v,t in src[147].items()})
    for c in range(148,151): P[c]=src[c]
    RST[b['id']]=P
fix('RST',RST); meta.append(tr_write('RST','Синодальный перевод','ru','public-domain','scrollmapper/bible_databases RusSynodal (Псалтирь перенумерована)',RST))
if not PUBLIC:
  bt=json.load(open(H+'BTI_in.json',encoding='utf-8'))
  BT={k:{int(c):{int(v):t for v,t in vs.items()} for c,vs in cs.items()} for k,cs in bt['books'].items()}; fix('BTI',BT)
  meta.append(tr_write('BTI','Современный перевод (Кулаков, BTI)','ru','personal-use',bt.get('source','bible.com / FB2'),BT))
# English, Psalm title shift to Hebrew numbering
for tid,fn,name,lic in (('KJV','KJV.json','King James Version','public-domain'),('BSB','BSB.json','Berean Standard Bible','public-domain'),('ASV','ASV.json','American Standard Version','public-domain'),('AKJV','AKJV.json','American King James Version','public-domain'),('UKJV','UKJV.json','Updated King James Version','public-domain')):
    E=sm(D+fn); out={}
    for b in books:
        src=E.get(b['scrollmapper']) or E.get('Revelation')
        if b['id']!='Ps': out[b['id']]=dict(src); continue
        P={}
        for c,vs in src.items():
            off=hebcount['Ps'][str(c)]-max(vs)
            P[c]={v+off:t for v,t in vs.items()} if 0<off<=3 else dict(vs)
        out[b['id']]=P
    fix(tid,out); meta.append(tr_write(tid,name,'en',lic,'scrollmapper/bible_databases',out))
json.dump({'books':books,'translations':meta},open(OUT+'index.json','w',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))

print('unresolved groups:',unresolved,file=sys.stderr)
