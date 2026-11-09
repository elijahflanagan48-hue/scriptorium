#!/usr/bin/env python3
"""Предрасчёт для панели слова. Запуск из корня репозитория: python3 tools/build_insight.py
 data/wf/<G|H><сотня>.json      формы:    {strong: [[форма, морфология, [стихи]], ...]}  (по убыванию частоты)
 data/wr/<TR>/<G|H><сотня>.json переводы: {strong: [[перевод, [стихи]], ...]}            (по убыванию частоты)
Стихи — номера book*1e6+ch*1000+v по возрастанию, в виде разностей (первый — как есть); повтор в стихе = 0.
Нарезка по 100 номеров Стронга — как в tools/shard.py. Края фраз очищаются от служебных слов (STOP)
так же, как в insight.js (trimEdges)."""
import json, os, re, shutil, collections
D = 'data/'
idx = json.load(open(D + 'index.json'))
books = [b['id'] for b in idx['books']]
trs = [t['id'] for t in idx['translations']]
PUNCT = re.compile(r'[.,;:!?«»"“”‘’()\[\]—–·]')
clean = lambda s: PUNCT.sub('', s.lower()).strip()
STOP = set('и а но же да ибо в во на с со к ко от из у о об по за для при над под до the a an and of to in on at by for with from as or'.split())
def trim_edges(toks):
    a, b = 0, len(toks)
    while a < b - 1 and toks[a] in STOP: a += 1
    while b - 1 > a and toks[b - 1] in STOP: b -= 1
    return toks[a:b]
CANT = re.compile('[\u0591-\u05AF\u05BD\u05C0\u05C3]')   # знаки кантилляции: формы, различающиеся только ими, считаем одной
def fkey(k, f): return CANT.sub('', f) if k[0] == 'H' else f
def shard_of(k):
    m = re.match(r'^([GH])(\d+)', k)
    return f'{m[1]}{int(m[2]) // 100:03d}'
def enc(ids):
    out, prev = [], 0
    for n in sorted(ids): out.append(n - prev); prev = n
    return out

forms = collections.defaultdict(lambda: collections.defaultdict(list))
rend = {t: collections.defaultdict(lambda: collections.defaultdict(list)) for t in trs}
for bi, b in enumerate(books):
    o = json.load(open(f'{D}orig/{b}.json'))['chapters']
    data = {}
    for t in trs:
        try: data[t] = (json.load(open(f'{D}tr/{t}/{b}.json')), json.load(open(f'{D}align/{t}/{b}.json')))
        except FileNotFoundError: pass
    for c, vs in o.items():
        for v, ws in vs.items():
            n = bi * 10**6 + int(c) * 1000 + int(v)
            for w in ws:
                if w[1]: forms[w[1]][(fkey(w[1], w[0]), w[2])].append(n)
            for t, (tr, al) in data.items():
                txt = tr.get(c, {}).get(v); a = al.get(c, {}).get(v)
                if not txt or not a: continue
                ch = txt.split()
                if len(a) != len(ch): continue
                for i, w in enumerate(ws):
                    k = w[1]
                    if not k: continue
                    toks = [x for x in (clean(ch[j]) for j in range(len(ch)) if a[j] == i) if x]
                    r = ' '.join(trim_edges(toks)) or '—'
                    rend[t][k][r].append(n)

def write(root, table, fmt):
    if os.path.isdir(root): shutil.rmtree(root)
    os.makedirs(root)
    parts = collections.defaultdict(dict)
    for k, d in table.items():
        rows = sorted(d.items(), key=lambda kv: (-len(kv[1]), str(kv[0])))
        parts[shard_of(k)][k] = [fmt(key, ids) for key, ids in rows]
    for p, d in parts.items():
        json.dump(d, open(f'{root}/{p}.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    return len(parts)

for old in ('rend', 'forms_H.json', 'forms_G.json'):
    p = D + old
    if os.path.isdir(p): shutil.rmtree(p)
    elif os.path.exists(p): os.remove(p)
print('wf', write(D + 'wf', forms, lambda key, ids: [key[0], key[1], enc(ids)]))
for t in trs:
    print('wr', t, write(f'{D}wr/{t}', rend[t], lambda key, ids: [key, enc(ids)]))
