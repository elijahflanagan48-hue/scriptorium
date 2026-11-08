"""Словарь «слово перевода -> номера Стронга» для умного поиска.
По автоматическому выравниванию (data/align) считает, какими словами оригинала
передано каждое слово перевода. Результат: data/t2s/<ID>.json
{ "слово": [["G0026", 80], ["G0025", 3]], ... }  (до 3 номеров, только встретившиеся 2+ раза)
Запуск: python3 tools/t2s.py"""
import json, os, re, collections
D = os.path.join(os.path.dirname(__file__), '..', 'data')
idx = json.load(open(f'{D}/index.json', encoding='utf-8'))
def norm(w): return re.sub(r'[\W\d_]', '', w.lower().replace('ё', 'е'))
os.makedirs(f'{D}/t2s', exist_ok=True)
orig = {b['id']: json.load(open(f'{D}/orig/{b["id"]}.json', encoding='utf-8'))['chapters'] for b in idx['books']}
for t in idx['translations']:
    tid = t['id']; m = collections.defaultdict(collections.Counter)
    for bid in t['books']:
        tp, ap = f'{D}/tr/{tid}/{bid}.json', f'{D}/align/{tid}/{bid}.json'
        if not (os.path.exists(tp) and os.path.exists(ap)): continue
        tr, al = json.load(open(tp, encoding='utf-8')), json.load(open(ap, encoding='utf-8'))
        for c, vs in al.items():
            for v, a in vs.items():
                txt = tr.get(c, {}).get(v); ws = orig[bid].get(c, {}).get(v)
                if not txt or not ws: continue
                ch = txt.split()
                if len(ch) != len(a): continue
                for w, i in zip(ch, a):
                    if 0 <= i < len(ws) and ws[i][1]:
                        k = norm(w)
                        if k: m[k][ws[i][1]] += 1
    out = {k: [[s, n] for s, n in c.most_common(3) if n >= 2] for k, c in m.items()}
    out = {k: v for k, v in out.items() if v}
    json.dump(out, open(f'{D}/t2s/{tid}.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(tid, len(out))
