"""Режет переводы и выравнивания по главам: data/trc/<id>/<Book>/<ch>.json, data/alc/<id>/<Book>/<ch>.json
(глава ~2–10 КБ вместо целой книги 100–350 КБ — открывается мгновенно). Запуск: python3 tools/split_tr.py"""
import json, os, glob
root = os.path.join(os.path.dirname(__file__), '..', 'data')
n = 0
for src, dst in (('tr', 'trc'), ('align', 'alc')):
    for f in glob.glob(os.path.join(root, src, '*', '*.json')):
        tid = f.split(os.sep)[-2]; book = os.path.basename(f)[:-5]
        d = json.load(open(f, encoding='utf-8'))
        out = os.path.join(root, dst, tid, book); os.makedirs(out, exist_ok=True)
        for ch, v in d.items():
            with open(os.path.join(out, ch + '.json'), 'w', encoding='utf-8') as g:
                json.dump(v, g, ensure_ascii=False, separators=(',', ':')); n += 1
print('files', n)
