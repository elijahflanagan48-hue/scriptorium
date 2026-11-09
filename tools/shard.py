"""Делит словарь и список вхождений на маленькие части по 100 номеров Стронга,
чтобы статья слова открывалась сразу, не дожидаясь загрузки больших файлов.
data/lx/G000.json … (из lex_G/lex_H), data/oc/G000.json … (из occ.json)
Запуск: python3 tools/shard.py"""
import json, os, re, collections
D = os.path.join(os.path.dirname(__file__), '..', 'data')
def shard(src, out):
    os.makedirs(f'{D}/{out}', exist_ok=True)
    for f in os.listdir(f'{D}/{out}'): os.remove(f'{D}/{out}/{f}')
    parts = collections.defaultdict(dict)
    for name in src:
        for k, v in json.load(open(f'{D}/{name}', encoding='utf-8')).items():
            m = re.match(r'^([GH])(\d+)', k)
            if m: parts[f'{m[1]}{int(m[2]) // 100:03d}'][k] = v
    for p, d in parts.items():
        json.dump(d, open(f'{D}/{out}/{p}.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(out, len(parts), 'файлов')
shard(['lex_G.json', 'lex_H.json'], 'lx')
shard(['occ.json'], 'oc')
