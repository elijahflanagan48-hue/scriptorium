#!/usr/bin/env python3
"""Автоматическое пословное выравнивание перевод -> оригинал (IBM Model 2 с диагональным приором, как fast_align).
Запуск: python3 align.py <data_dir> <translation_id> ...   Результат: <data_dir>/align/<ID>/<Book>.json
Для каждого стиха: список из len(text.split()) чисел — индекс слова оригинала или -1."""
import json, os, re, sys, math, collections
import numpy as np

D = sys.argv[1].rstrip('/') + '/'
IDS = sys.argv[2:]
idx = json.load(open(D + 'index.json', encoding='utf-8'))
BOOKS = idx['books']
LAMBDA, P0, ITERS, THRESH, REVW = 4.0, 0.08, 7, 0.12, 0.8

import pymorphy3, simplemma
morph = pymorphy3.MorphAnalyzer()
lem_cache = {}
def lemma(w, lang):
    k = (w, lang)
    r = lem_cache.get(k)
    if r is None:
        if lang == 'ru':
            r = morph.parse(w)[0].normal_form.replace('ё', 'е')
        else:
            r = simplemma.lemmatize(w, 'en')
        lem_cache[k] = r
    return r
STRIP = re.compile(r"^[^\w]+|[^\w]+$", re.U)
def norm(chunk):
    w = STRIP.sub('', chunk).lower().replace('’', "'")
    return w

def run(tid, testament):
    t = next(x for x in idx['translations'] if x['id'] == tid)
    lang = t['lang']
    src_vocab, tgt_vocab = {'<NULL>': 0}, {}
    verses = []  # (book, ch, v, src_ids, tgt_ids(-1 for none), nchunks)
    for b in BOOKS:
        if b['testament'] != testament or b['id'] not in t['books']: continue
        o = json.load(open(D + 'orig/%s.json' % b['id'], encoding='utf-8'))['chapters']
        tr = json.load(open(D + 'tr/%s/%s.json' % (tid, b['id']), encoding='utf-8'))
        for c, vs in tr.items():
            for v, text in vs.items():
                ws = o.get(c, {}).get(v)
                if not ws: continue
                S = [src_vocab.setdefault(w[1] or ('~' + w[0]), len(src_vocab)) for w in ws]
                chunks = text.split()
                T = []
                for ch in chunks:
                    n = norm(ch)
                    T.append(tgt_vocab.setdefault(lemma(n, lang), len(tgt_vocab)) if n else -1)
                verses.append((b['id'], c, v, S, T, len(chunks)))
    def fit(A, B, VA):
        """A[k]=(ids of generating side, rel. positions); B[k]=(ids of generated side, rel. positions). Returns list of posterior blocks (nB, mA+1), col 0 = NULL."""
        sa, sb, pri, tok, meta = [], [], [], [], []
        tc = 0; pos = 0
        for (ia, pa), (ib, pb) in zip(A, B):
            mA, nB = len(ia), len(ib)
            meta.append((pos, nB, mA + 1))
            if nB == 0 or mA == 0:
                meta[-1] = (pos, 0, mA + 1); continue
            pa = np.asarray(pa); ia = np.asarray(ia)
            for k in range(nB):
                pr = np.exp(-LAMBDA * np.abs(pa - pb[k])); pr = pr / pr.sum() * (1 - P0)
                sa.append(np.concatenate(([0], ia))); sb.append(np.full(mA + 1, ib[k]))
                pri.append(np.concatenate(([P0], pr))); tok.append(np.full(mA + 1, tc)); tc += 1; pos += mA + 1
        s_ = np.concatenate(sa); t_ = np.concatenate(sb); prior = np.concatenate(pri); tk = np.concatenate(tok)
        Vb = max(int(t_.max()) + 1, 1)
        code = s_.astype(np.int64) * Vb + t_
        uc, pid = np.unique(code, return_inverse=True); P = len(uc); psrc = uc // Vb
        theta = np.ones(P)
        for it in range(ITERS):
            num = theta[pid] * prior
            den = np.bincount(tk, weights=num, minlength=tc)
            post = num / den[tk]
            cnt = np.bincount(pid, weights=post, minlength=P)
            tot = np.bincount(psrc, weights=cnt, minlength=VA)
            theta = (cnt + 1e-9) / (tot[psrc] + 1e-9)
        num = theta[pid] * prior; den = np.bincount(tk, weights=num, minlength=tc); post = num / den[tk]
        return [post[p:p + n * m1].reshape(n, m1) if n else None for (p, n, m1) in meta]
    SA, TA = [], []
    for (bk, c, v, S, T, nch) in verses:
        m = len(S); js = [j for j, x in enumerate(T) if x >= 0]
        SA.append((S, [(i + 0.5) / m for i in range(m)]))
        TA.append(([T[j] for j in js], [(j + 0.5) / max(nch, 1) for j in js]))
    fwd = fit(SA, TA, len(src_vocab))          # target token j -> source i (+NULL)
    rev = fit(TA, SA, len(tgt_vocab) + 1)      # source i -> target token j (+NULL)
    out = collections.defaultdict(lambda: collections.defaultdict(dict)); stat = [0, 0]
    for (bk, c, v, S, T, nch), f, r in zip(verses, fwd, rev):
        js = [j for j, x in enumerate(T) if x >= 0]
        res = [-1] * nch
        if f is not None and r is not None:
            comb = f[:, 1:] * (r[:, 1:].T ** REVW)       # (n, m)
            a = comb.argmax(1)
            for k, j in enumerate(js):
                if comb[k, a[k]] >= THRESH and f[k, a[k] + 1] >= f[k, 0] * 0.5: res[j] = int(a[k])
            # grow: add forward-best links adjacent (<=2 chunks) to an existing link of the same source word
            fb = f[:, 1:].argmax(1)
            for _ in range(3):
                for k, j in enumerate(js):
                    if res[j] >= 0: continue
                    i = int(fb[k])
                    if f[k, i + 1] < max(f[k, 0], 0.2): continue
                    if any(res[j2] == i and abs(j2 - j) <= 2 for j2 in range(max(0, j - 2), min(nch, j + 3))): res[j] = i
            stat[0] += sum(1 for j in js if res[j] >= 0); stat[1] += len(js)
        out[bk].setdefault(c, {})[v] = res
    os.makedirs(D + 'align/' + tid, exist_ok=True)
    for bk, chs in out.items():
        path = D + 'align/%s/%s.json' % (tid, bk)
        cur = json.load(open(path)) if os.path.exists(path) else {}
        cur.update(chs)
        json.dump(cur, open(path, 'w'), separators=(',', ':'))
    print(tid, testament, 'verses', len(verses), 'aligned tokens %.1f%%' % (100 * stat[0] / max(stat[1], 1)), file=sys.stderr)

for tid in IDS:
    for test in ('OT', 'NT'):
        run(tid, test)
