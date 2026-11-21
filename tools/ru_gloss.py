#!/usr/bin/env python3
"""Русский перевод слов оригинала: Стронг -> до 3 русских слов (леммы), по выравниванию синодального перевода (data/align/RST).
Результат: data/ru_gloss.json {"G3874":"утешение, призыв"}. Запуск: python3 tools/ru_gloss.py"""
import json, os, re, collections
import pymorphy3
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
idx = json.load(open(f'{D}/index.json', encoding='utf-8'))
morph = pymorphy3.MorphAnalyzer()
STRIP = re.compile(r"^[^\w]+|[^\w]+$", re.U)
cache = {}
def lem(w):
    r = cache.get(w)
    if r is None:
        ps = morph.parse(w)
        p = ps[0]
        r = (p.normal_form.replace('ё', 'е'), str(p.tag.POS or ''))
        cache[w] = r
    return r
STOP = set('и в во на с со а но что же ли бы не ни он она оно они я ты мы вы мой твой наш ваш свой его ее их этот тот весь сам как так то от до по к ко из за о об у для при про над под перед между через это быть который кто тот такой там тогда вот да нет или если чтобы когда'.split())
C = collections.defaultdict(collections.Counter); N = collections.Counter()
for b in idx['books']:
    bid = b['id']
    try:
        tr = json.load(open(f'{D}/tr/RST/{bid}.json', encoding='utf-8')); al = json.load(open(f'{D}/align/RST/{bid}.json', encoding='utf-8'))
    except FileNotFoundError: continue
    orig = json.load(open(f'{D}/orig/{bid}.json', encoding='utf-8'))['chapters']
    for c, vs in al.items():
        for v, a in vs.items():
            txt = tr.get(c, {}).get(v); ws = orig.get(c, {}).get(v)
            if not txt or not ws: continue
            ch = txt.split()
            if len(ch) != len(a): continue
            for w, i in zip(ch, a):
                if i < 0 or i >= len(ws) or not ws[i][1]: continue
                n = STRIP.sub('', w).lower().replace('ё', 'е')
                if not n or not re.search(r'[а-я]', n): continue
                k = ws[i][1]; N[k] += 1
                l, pos = lem(n)
                C[k][l] += 1
out = {}
for k, cnt in C.items():
    tot = N[k]
    items = cnt.most_common(12)
    content = [(l, n) for l, n in items if l not in STOP and len(l) > 1]
    pick = content if content and content[0][1] / tot >= 0.12 else items
    res = []
    for l, n in pick:
        if len(res) >= 3: break
        if n >= (2 if tot >= 6 else 1) and (n / tot >= 0.12 or not res): res.append(l)
    if res: out[k] = ', '.join(res)
json.dump(out, open(f'{D}/ru_gloss.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(len(out), 'strongs;', os.path.getsize(f'{D}/ru_gloss.json') // 1024, 'KB')
for k in ('G3874', 'G0025', 'G3056', 'H0430', 'H1254', 'G3588', 'G2316', 'H7225'): print(k, out.get(k))
