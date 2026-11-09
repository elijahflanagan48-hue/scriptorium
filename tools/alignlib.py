"""Общие функции для улучшенного выравнивания (tools/align_pivot.py): загрузка данных, модель IBM-2, эталон из KJV со Стронгом."""
import json, os, re, collections
import numpy as np

LAMBDA, P0, ITERS, REVW = 4.0, 0.08, 7, 0.8
STRIP = re.compile(r"^[^\w]+|[^\w]+$", re.U)
PUNCT = re.compile(r'[.,;:!?«»"“”‘’()\[\]—–·]')
clean = lambda s: PUNCT.sub('', s.lower()).strip()

def fit(A, B, VA):
    """IBM Model 2 с диагональным приором (как fast_align). A[k]=(ids порождающей стороны, отн. позиции),
    B[k]=(ids порождаемой, отн. позиции). Возвращает для каждой пары блок апостериорных (nB, mA+1); столбец 0 = NULL."""
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
    return [post[p:p + n * m1].reshape(n, m1).astype(np.float32) if n else None for (p, n, m1) in meta]

_morph = None; _lem = {}
def lemma(w, lang):
    global _morph
    k = (w, lang); r = _lem.get(k)
    if r is None:
        if lang == 'ru':
            import pymorphy3
            if _morph is None: _morph = pymorphy3.MorphAnalyzer()
            r = _morph.parse(w)[0].normal_form.replace('ё', 'е')
        else:
            import simplemma
            r = simplemma.lemmatize(w, 'en')
        _lem[k] = r
    return r
def norm(chunk): return STRIP.sub('', chunk).lower().replace('’', "'")

class Corpus:
    """Стихи одного перевода вместе со словами оригинала."""
    def __init__(self, D, tid):
        self.D, self.tid = D, tid
        idx = json.load(open(D + 'index.json', encoding='utf-8'))
        self.books = idx['books']
        t = next(x for x in idx['translations'] if x['id'] == tid)
        self.lang = t['lang']
        self.verses = []   # (key=(book,c,v), testament, orig words, chunks)
        for b in self.books:
            if b['id'] not in t['books']: continue
            o = json.load(open(D + 'orig/%s.json' % b['id'], encoding='utf-8'))['chapters']
            tr = json.load(open(D + 'tr/%s/%s.json' % (tid, b['id']), encoding='utf-8'))
            for c, vs in tr.items():
                for v, text in vs.items():
                    ws = o.get(c, {}).get(v)
                    if ws: self.verses.append(((b['id'], c, v), b['testament'], ws, text.split()))

def lem_ids(chunks, lang, vocab):
    out = []
    for ch in chunks:
        n = norm(ch)
        out.append(vocab.setdefault(lemma(n, lang), len(vocab)) if n else -1)
    return out

def direct(cp, testament):
    """Прямое выравнивание перевод<->оригинал: {key: (js, F)}, F[(n,m)] = f(j->i) * r(i->j)^REVW."""
    src_vocab, tgt_vocab = {'<NULL>': 0}, {}
    vs = [v for v in cp.verses if v[1] == testament]
    SA, TA = [], []
    for key, _, ws, chunks in vs:
        S = [src_vocab.setdefault(w[1] or ('~' + w[0]), len(src_vocab)) for w in ws]
        T = lem_ids(chunks, cp.lang, tgt_vocab)
        m = len(S); js = [j for j, x in enumerate(T) if x >= 0]
        SA.append((S, [(i + 0.5) / m for i in range(m)]))
        TA.append(([T[j] for j in js], [(j + 0.5) / max(len(chunks), 1) for j in js]))
    fwd = fit(SA, TA, len(src_vocab)); rev = fit(TA, SA, len(tgt_vocab) + 1)
    out = {}
    for (key, _, ws, chunks), (S, _), f, r in zip(vs, SA, fwd, rev):
        js = [j for j, x in enumerate(norm(c) and 1 or -1 for c in chunks) if x >= 0]
        if f is None or r is None: out[key] = (js, None, None); continue
        F = f[:, 1:] * (r[:, 1:].T ** REVW)
        out[key] = (js, F, f[:, 0])
    return out

def pair(cp_a, cp_b):
    """Выравнивание между двумя переводами (по одним и тем же стихам): {key: (js_a, js_b, P)}, P[(na, nb)]."""
    va = {k: ch for k, _, _, ch in cp_a.verses}; vb = {k: ch for k, _, _, ch in cp_b.verses}
    keys = [k for k in va if k in vb]
    voc_a, voc_b = {'<NULL>': 0}, {}
    A, B, meta = [], [], []
    for k in keys:
        Ta = lem_ids(va[k], cp_a.lang, voc_a); Tb = lem_ids(vb[k], cp_b.lang, voc_b)
        ja = [j for j, x in enumerate(Ta) if x >= 0]; jb = [j for j, x in enumerate(Tb) if x >= 0]
        A.append(([Ta[j] for j in ja], [(j + 0.5) / max(len(va[k]), 1) for j in ja]))
        B.append(([Tb[j] for j in jb], [(j + 0.5) / max(len(vb[k]), 1) for j in jb]))
        meta.append((ja, jb))
    # a генерирует b: P(b_j -> a_l);  и обратно
    fwd = fit(A, B, len(voc_a) + len(voc_b) + 1)
    rev = fit(B, A, len(voc_a) + len(voc_b) + 1)
    out = {}
    for k, (ja, jb), f, r in zip(keys, meta, fwd, rev):
        if f is None or r is None: continue
        out[k] = (ja, jb, f[:, 1:] * (r[:, 1:].T ** REVW))   # (nb, na)
    return out

# ---- эталон: KJV со Стронгом (kaiserlik/kjv) ----
KMAP = 'Gen Exo Lev Num Deu Jos Jdg Rth 1Sa 2Sa 1Ki 2Ki 1Ch 2Ch Ezr Neh Est Job Psa Pro Ecc Sng Isa Jer Lam Eze Dan Hos Joe Amo Oba Jon Mic Nah Hab Zep Hag Zec Mal Mat Mar Luk Jhn Act Jas 1Pe 2Pe 1Jo 2Jo 3Jo Jde Rom 1Co 2Co Gal Eph Phl Col 1Th 2Th 1Ti 2Ti Tit Phm Heb Rev'.split()
TAG = re.compile(r'\[([HG]\d+)\]')
def parse_tagged(en):
    en = re.sub(r'</?em>', '', en); toks = []
    for part in en.split():
        tags = TAG.findall(part); w = TAG.sub('', part)
        if w: toks.append([w, tags])
        elif tags and toks: toks[-1][1] += tags
    return toks
def load_tagged(kdir, books):
    """{(book,c,v): [[слово,[H123,...]],...]}"""
    out = {}
    for bi, b in enumerate(books):
        raw = open(f'{kdir}/{KMAP[bi]}.json', encoding='utf-8').read()
        try:
            d = json.load(open(f'{kdir}/{KMAP[bi]}.json', encoding='utf-8'))
            items = [(k, o['en']) for ch in list(d.values())[0].values() for k, o in ch.items()]
        except Exception:
            items = [(m[1], json.loads('"' + m[2] + '"')) for m in re.finditer(r'"([^"]+\|\d+\|\d+)":\s*\{\s*"en":\s*"((?:[^"\\]|\\.)*)"', raw)]
        for k, en in items:
            _, c, v = k.split('|'); out[(b, str(int(c)), str(int(v)))] = parse_tagged(en)
    return out
def num(s): return re.sub(r'\D', '', s or '').lstrip('0')
def gold_for(cp, tagged):
    """{key: [gold-множество индексов оригинала или None для каждого чанка]} там, где текст совпал с размеченным."""
    out = {}
    for key, _, ws, chunks in cp.verses:
        tg = tagged.get(key)
        if not tg: continue
        a = [clean(c) for c in chunks]; b = [clean(t[0]) for t in tg]
        if a != b:
            # допускаем различие в пустых (чисто пунктуационных) словах
            a2 = [x for x in a if x]; b2 = [x for x in b if x]
            if a2 != b2: continue
            pa = [j for j, x in enumerate(a) if x]; pb = [j for j, x in enumerate(b) if x]
            mp = dict(zip(pa, pb))
        else: mp = {j: j for j in range(len(a))}
        row = [None] * len(chunks)
        for j in range(len(chunks)):
            if j not in mp: continue
            nums = {num(t) for t in tg[mp[j]][1]}
            g = {i for i, w in enumerate(ws) if w[1] and num(w[1]) in nums}
            if g: row[j] = g
        out[key] = row
    return out
