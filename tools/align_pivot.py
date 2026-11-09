#!/usr/bin/env python3
"""Улучшенное выравнивание «перевод -> оригинал» через размеченный KJV.
Запуск: python3 tools/align_pivot.py <data_dir> <каталог kaiserlik/kjv> [ID ...]
Что делает:
 1. Прямое выравнивание перевод<->оригинал (IBM-2 с диагональным приором, по начальным формам слов), как tools/align.py.
 2. «Опорный» перевод — KJV: там, где его текст совпал с KJV со Стронгом (github.com/kaiserlik/kjv, общественное достояние),
    слова KJV жёстко привязаны к словам оригинала по номерам Стронга (эталон, ~97% точности на содержательных словах);
    в остальных местах берётся прямое выравнивание KJV.
 3. Для каждого перевода считается выравнивание перевод<->KJV (по одним и тем же стихам) и переносится на оригинал:
    S(j,i) = sum_l P(слово j ~ слово l KJV) * M_KJV(l,i). Итог: F = (1-W)*F_прямое + W*S.
 4. Для самого KJV эталон подмешивается к прямому выравниванию (W_KJV).
Результат записывается в <data_dir>/align/<ID>/<Книга>.json (список индексов слов оригинала или -1 на каждое слово стиха).
Замер: на KJV прямое выравнивание даёт ~97% точности/84% полноты по размеченным словам; для русского эталона нет,
качество проверено выборочным просмотром (в спорных местах опорный перевод чаще исправляет ошибки, чем вносит)."""
import sys, os, json, collections, time
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import alignlib as L

D = sys.argv[1].rstrip('/') + '/'; KDIR = sys.argv[2]
idx = json.load(open(D + 'index.json', encoding='utf-8'))
ALL = [t['id'] for t in idx['translations']]
IDS = sys.argv[3:] or ALL
W, W_KJV, THRESH, ONEHOT = 0.5, 0.4, 0.12, 0.9
t0 = time.time(); log = lambda *a: print(*a, round(time.time() - t0), 's', file=sys.stderr, flush=True)

cps = {t: L.Corpus(D, t) for t in set(IDS) | {'KJV'}}
tagged = L.load_tagged(KDIR, [b['id'] for b in cps['KJV'].books])
gold = L.gold_for(cps['KJV'], tagged)
log('KJV эталон: стихов', len(gold), 'слов', sum(1 for r in gold.values() for x in r if x))

def direct_all(cp):
    out = {}
    for test in ('OT', 'NT'): out.update(L.direct(cp, test))
    return out
DR = {}
def drect(t):
    if t not in DR: DR[t] = direct_all(cps[t]); log('прямое', t)
    return DR[t]

# --- опорная матрица KJV: эталон по Стронгу + прямое выравнивание ---
def kjv_matrices():
    out = {}
    for key, (js, F, _) in drect('KJV').items():
        if F is None: continue
        M = F.copy(); g = gold.get(key)
        if g:
            for r, j in enumerate(js):
                if g[j]:
                    M[r] = 0
                    for i in g[j]: M[r, i] = ONEHOT / len(g[j])
        out[key] = (js, M)
    return out
KM = kjv_matrices()

def decode(js, F, nch):
    res = [-1] * nch
    if F is None: return res
    a = F.argmax(1); m = F.max(1)
    for k, j in enumerate(js):
        if m[k] >= THRESH: res[j] = int(a[k])
    for _ in range(3):   # растим связи к соседям (<=2 слова) того же слова оригинала
        for k, j in enumerate(js):
            if res[j] >= 0 or m[k] < THRESH * 0.5: continue
            i = int(a[k])
            if any(res[j2] == i for j2 in range(max(0, j - 2), min(nch, j + 3))): res[j] = i
    return res

for t in IDS:
    cp = cps[t]; dr = drect(t)
    if t == 'KJV':
        comb = {key: (js, (1 - W_KJV) * dr[key][1] + W_KJV * KM[key][1]) if key in KM and dr[key][1] is not None else (js, dr[key][1]) for key, (js, _, _) in dr.items()}
    else:
        pr = L.pair(cp, cps['KJV']); log('пара', t, 'KJV')
        comb = {}
        for key, (js, F, _) in dr.items():
            if F is not None and key in pr and key in KM:
                ja, jb, P = pr[key]; jk, M = KM[key]
                if P.shape == (M.shape[0], F.shape[0]):
                    comb[key] = (js, (1 - W) * F + W * (P.T @ M)); continue
            comb[key] = (js, F)
    out = collections.defaultdict(lambda: collections.defaultdict(dict)); n = tot = 0
    for key, _, ws, chunks in cp.verses:
        js, F = comb[key]
        res = decode(js, F, len(chunks))
        out[key[0]][key[1]][key[2]] = res
        n += sum(1 for x in res if x >= 0); tot += len(js)
    os.makedirs(D + 'align/' + t, exist_ok=True)
    for bk, chs in out.items():
        json.dump(chs, open(D + 'align/%s/%s.json' % (t, bk), 'w'), separators=(',', ':'))
    log(t, 'готово: связано %.1f%% слов' % (100 * n / max(tot, 1)))
