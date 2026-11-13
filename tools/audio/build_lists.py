import json, glob, collections, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from norm import norm, wid
root = os.path.join(os.path.dirname(__file__), '..', '..')
out = os.path.join(root, 'tools', 'audio', 'lists'); os.makedirs(out, exist_ok=True)
cnt = {'heb': collections.Counter(), 'grc': collections.Counter()}
for f in glob.glob(os.path.join(root, 'data', 'orig', '*.json')):
    d = json.load(open(f)); lang = 'heb' if d.get('lang') == 'heb' else 'grc'
    for ch in d['chapters'].values():
        for vs in ch.values():
            for w in vs:
                t = norm(w[0], lang)
                if t: cnt[lang][t] += 1
lem = {'heb': {}, 'grc': {}}
for lang, fn in (('heb', 'lex_H'), ('grc', 'lex_G')):
    for k, v in json.load(open(os.path.join(root, 'data', fn + '.json'))).items():
        t = norm(v['lemma'], lang)
        if t: lem[lang].setdefault(t, k)
def dump(name, lang, items):
    with open(os.path.join(out, name), 'w', encoding='utf-8') as f:
        for t in items: f.write(json.dumps({'id': wid(t, lang), 'text': t}, ensure_ascii=False) + '\n')
    print(name, len(items))
for lang in ('heb', 'grc'):
    L = sorted(lem[lang], key=lambda t: -cnt[lang].get(t, 0))
    dump(f'{lang}_lemmas.jsonl', lang, L)
    S = set(L)
    F = [t for t, _ in cnt[lang].most_common() if t not in S]
    dump(f'{lang}_forms.jsonl', lang, F)
    ids = [wid(t, lang) for t in L + F]; print(lang, 'id collisions:', len(ids) - len(set(ids)))
