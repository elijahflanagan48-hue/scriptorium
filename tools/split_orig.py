"""Оригинал по главам: data/origc/<Книга>/<глава>.json = {"id","lang","chapters":{"<глава>":{...}}}.
Читалка грузит только открытую главу (а не всю книгу). Запуск: python3 tools/split_orig.py"""
import json, os, shutil
D = os.path.join(os.path.dirname(__file__), '..', 'data')
idx = json.load(open(f'{D}/index.json', encoding='utf-8'))
shutil.rmtree(f'{D}/origc', ignore_errors=True)
for b in idx['books']:
    d = json.load(open(f'{D}/orig/{b["id"]}.json', encoding='utf-8'))
    os.makedirs(f'{D}/origc/{b["id"]}', exist_ok=True)
    for c, vs in d['chapters'].items():
        json.dump({'id': d['id'], 'lang': d['lang'], 'chapters': {c: vs}}, open(f'{D}/origc/{b["id"]}/{c}.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
