#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Сборка «Детской Библии» для Ad fontes. Запускать на Mac (нужен интернет): python3 kids_build.py
  1) текст: «Библейская история» прот. И. Базарова (1857, общественное достояние) с azbyka.ru;
  2) картины: Wikimedia Commons, порядок предпочтения Тиссо → Доре → Шнорр (только свободные лицензии);
  3) результат: папка kids_out/ и архив kids_ru.zip (его я забираю и кладу в data/kids/).
Повторный запуск быстрый: ответы Commons и скачанные картинки кэшируются в kids_out/.cache.
Шаги по отдельности: kids_build.py text | images | pack"""
import sys, os, re, json, time, html, zipfile, urllib.request, urllib.parse, urllib.error
from html.parser import HTMLParser
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kids_stories import STORIES

UA = 'AdFontesKidsBible/1.0 (personal non-commercial Bible study app; https://github.com/elijahflanagan48-hue/scriptorium)'
SRC = 'https://azbyka.ru/otechnik/Ioann-Bazarov/biblejskaja-istorija/'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'kids_out')
OUT = os.path.abspath(os.environ.get('KIDS_OUT', OUT))
ED = 'bazarov'
ARTISTS = [('tissot', 'Tissot'), ('doré', 'Doré'), ('schnorr', 'Schnorr')]
OKLIC = re.compile(r'(public domain|\bpd\b|cc0|cc[- ]by(?!.*(nc|nd))|no restrictions|gfdl)', re.I)
BADLIC = re.compile(r'(\bnc\b|-nc|\bnd\b|-nd|fair use|copyrighted|all rights)', re.I)
STOP = {'the', 'and', 'of', 'in', 'a', 'to', 'at', 'on', 'his', 'her', 'with', 'from', 'by', 'for'}


def get(url, binary=False, tries=4):
    for k in range(tries):
        try:
            rq = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(rq, timeout=60) as r:
                d = r.read()
            return d if binary else d.decode('utf-8', 'replace')
        except urllib.error.HTTPError as e:
            if e.code in (429, 503) and k < tries - 1:
                time.sleep(5 * (k + 1)); continue
            if k == tries - 1: raise
        except Exception:
            if k == tries - 1: raise
            time.sleep(2 * (k + 1))


def norm(s):
    s = s.lower().replace('ё', 'е')
    s = re.sub(r'[^0-9a-zа-я]+', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


# ------------------------------------------------------------------ текст
class TX(HTMLParser):
    BLK = {'p', 'div', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'tr', 'section', 'article', 'blockquote', 'ul', 'ol', 'table'}
    SKIP = {'script', 'style', 'noscript', 'svg', 'button', 'select', 'form'}

    def __init__(s):
        super().__init__(convert_charrefs=True); s.out = []; s.skip = 0

    def handle_starttag(s, t, a):
        if t in s.SKIP: s.skip += 1
        if t in s.BLK: s.out.append('\n')

    def handle_endtag(s, t):
        if t in s.SKIP and s.skip: s.skip -= 1
        if t in s.BLK: s.out.append('\n')

    def handle_data(s, d):
        if not s.skip: s.out.append(d)


def step_text():
    os.makedirs(OUT, exist_ok=True)
    cache = os.path.join(OUT, 'bazarov.html')
    if os.path.exists(cache):
        h = open(cache, encoding='utf-8').read()
    else:
        print('Скачиваю текст Базарова…'); h = get(SRC); open(cache, 'w', encoding='utf-8').write(h)
    p = TX(); p.feed(h)
    lines = [re.sub(r'\s+', ' ', x).strip() for x in ''.join(p.out).split('\n')]
    lines = [x for x in lines if x]
    nl = [norm(x) for x in lines]
    tn = [norm(s[1]) for s in STORIES]

    def occ(k):
        return [i for i, x in enumerate(nl) if re.sub(r'^\d+ ', '', x) == tn[k]]
    # начало тела: первое вхождение 1-го заголовка, после которого 2-й заголовок не рядом (иначе это оглавление)
    pos = []
    o0 = occ(0); o1 = occ(1)
    start = None
    for i in o0:
        nxt = [j for j in o1 if j > i]
        if nxt and nxt[0] - i > 3: start = i; break
    if start is None: sys.exit('Не нашёл начало текста (заголовок «О творении»).')
    pos.append(start)
    for k in range(1, len(STORIES)):
        c = [i for i in occ(k) if i > pos[-1]]
        if not c: sys.exit('Не нашёл заголовок №%d «%s». Пришлите мне вывод.' % (k + 1, STORIES[k][1]))
        pos.append(c[0])
    END = re.compile(r'^(Источник|Комментарии|Библиотеке требуются|Поделиться|Рейтинг|Оглавление|Предыдущая|Следующая|Скачать|Читать также|Похожие)', re.I)
    ot, nt, report = {}, {}, []
    for k, (tst, title, ref, kw, *_) in enumerate(STORIES):
        a = pos[k] + 1
        b = pos[k + 1] if k + 1 < len(STORIES) else min(len(lines), a + 400)
        seg = lines[a:b]
        cut = len(seg)
        for j, x in enumerate(seg):
            if END.match(x) and (k + 1 == len(STORIES) or j > 3): cut = j; break
        seg = [x for x in seg[:cut] if norm(x) not in ('из нового завета', 'из ветхого завета')]
        sid = '%s%02d' % (tst, sum(1 for s in STORIES[:k + 1] if s[0] == tst))
        (ot if tst == 'ot' else nt)[sid] = seg
        w = sum(len(x.split()) for x in seg)
        if w < 40 or w > 3500: report.append('  ВНИМАНИЕ %s «%s»: %d слов' % (sid, title, w))
    json.dump(ot, open(os.path.join(OUT, 'ot.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    json.dump(nt, open(os.path.join(OUT, 'nt.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    tot = sum(len(x.split()) for d in (ot, nt) for v in d.values() for x in v)
    print('Текст готов: %d рассказов, %d слов.' % (len(ot) + len(nt), tot))
    print('\n'.join(report) or '  объём всех рассказов в норме')


# ------------------------------------------------------------------ картины
def api(params):
    q = urllib.parse.urlencode(dict(params, format='json', formatversion=2))
    return json.loads(get('https://commons.wikimedia.org/w/api.php?' + q))


def meta(d, k):
    v = (d.get(k) or {}).get('value') or ''
    return html.unescape(re.sub(r'<[^>]+>', ' ', v)).strip()


def search(cache, q):
    if q in cache: return cache[q]
    try:
        r = api(dict(action='query', generator='search', gsrsearch=q, gsrnamespace=6, gsrlimit=20,
                     prop='imageinfo', iiprop='url|extmetadata|size|mime', iiurlwidth=800))
    except Exception as e:
        print('   сбой запроса', q, e); return []
    out = []
    for p in (r.get('query') or {}).get('pages') or []:
        ii = (p.get('imageinfo') or [{}])[0]
        if not ii.get('thumburl'): continue
        em = ii.get('extmetadata') or {}
        out.append(dict(title=p['title'], thumb=ii['thumburl'], page=ii.get('descriptionurl', ''), mime=ii.get('mime', ''),
                        w=ii.get('width', 0), h=ii.get('height', 0), lic=meta(em, 'LicenseShortName'),
                        artist=meta(em, 'Artist'), desc=meta(em, 'ImageDescription'), name=meta(em, 'ObjectName')))
    cache[q] = out; time.sleep(0.4)
    return out


def toks(s):
    return {w for w in re.findall(r"[a-zà-ÿ]{3,}", s.lower().replace('’', "'")) if w not in STOP}


def pick(cache, story):
    tst, title, ref, kws, *ov = story
    if ov:  # ручной выбор файла
        for c in search(cache, ov[0].replace('File:', '')):
            if c['title'] == ov[0]: return c, 'ручной'
    for ai, (akey, aname) in enumerate(ARTISTS):
        best = None
        for ki, kw in enumerate(kws):
            kt = toks(kw)
            if not kt: continue
            for c in search(cache, '%s %s' % (aname, kw)):
                hay = (c['title'] + ' ' + c['artist'] + ' ' + c['desc'] + ' ' + c['name']).lower()
                if akey not in hay and not (akey == 'schnorr' and 'carolsfeld' in hay): continue
                if not c['mime'].startswith('image/') or c['mime'] in ('image/svg+xml', 'image/gif', 'image/tiff'): continue
                if c['w'] < 500: continue
                if not OKLIC.search(c['lic']) or BADLIC.search(c['lic']): continue
                tt = toks(c['title'] + ' ' + c['desc'])
                ov_ = len(kt & tt) / len(kt)
                if ov_ < 0.6: continue
                key = (ki, -ov_)
                if best is None or key < best[0]: best = (key, c)
        if best: return best[1], '%s / запрос %d' % (aname, best[0][0] + 1)
    return None, 'нет'


def step_images():
    os.makedirs(os.path.join(OUT, 'img'), exist_ok=True)
    cpath = os.path.join(OUT, '.cache.json')
    cache = json.load(open(cpath)) if os.path.exists(cpath) else {}
    res = {}
    for k, st in enumerate(STORIES):
        sid = '%s%02d' % (st[0], sum(1 for s in STORIES[:k + 1] if s[0] == st[0]))
        c, how = pick(cache, st)
        json.dump(cache, open(cpath, 'w'), ensure_ascii=False)
        if not c:
            print('%s %-40s — картина не найдена' % (sid, st[1][:40])); res[sid] = None; continue
        ext = '.png' if c['mime'] == 'image/png' else '.jpg'
        fn = sid + ext; fp = os.path.join(OUT, 'img', fn)
        if not os.path.exists(fp):
            try: open(fp, 'wb').write(get(c['thumb'], binary=True)); time.sleep(0.5)
            except Exception as e:
                print('%s не скачалась: %s' % (sid, e)); res[sid] = None; continue
        art = re.sub(r'\s+', ' ', c['artist'])[:80]
        res[sid] = dict(f=fn, file=c['title'], how=how, lic=c['lic'], artist=art, page=c['page'])
        print('%s %-40s ← %s [%s]' % (sid, st[1][:40], c['title'][5:70], how))
    json.dump(res, open(os.path.join(OUT, 'images.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    miss = [s for s, v in res.items() if not v]
    print('\nКартины: найдено %d из %d. Без картины: %s' % (len(res) - len(miss), len(res), ', '.join(miss) or 'нет'))


# ------------------------------------------------------------------ упаковка
def step_pack():
    ot = json.load(open(os.path.join(OUT, 'ot.json'), encoding='utf-8'))
    nt = json.load(open(os.path.join(OUT, 'nt.json'), encoding='utf-8'))
    imgs = json.load(open(os.path.join(OUT, 'images.json'), encoding='utf-8')) if os.path.exists(os.path.join(OUT, 'images.json')) else {}
    stories = []
    for k, (tst, title, ref, kw, *_) in enumerate(STORIES):
        sid = '%s%02d' % (tst, sum(1 for s in STORIES[:k + 1] if s[0] == tst))
        b, c, v = ref.split('.')
        im = imgs.get(sid)
        stories.append(dict(id=sid, t=tst, n=int(sid[2:]), title=title, ref=dict(b=b, c=int(c), v=int(v)),
                            img=dict(f=im['f'], by=im['artist'], lic=im['lic'], src=im['page']) if im else None))
    index = dict(title='Детская Библия', text='Библейская история, сокращённо извлечённая из священных книг Ветхого и Нового Завета — прот. Иоанн Базаров, 1857 (общественное достояние)',
                 stories=stories)
    zp = os.path.join(OUT, 'kids_ru.zip')
    with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr(ED + '/index.json', json.dumps(index, ensure_ascii=False, separators=(',', ':')))
        z.writestr(ED + '/ot.json', json.dumps(ot, ensure_ascii=False, separators=(',', ':')))
        z.writestr(ED + '/nt.json', json.dumps(nt, ensure_ascii=False, separators=(',', ':')))
        for s in stories:
            if s['img']: z.write(os.path.join(OUT, 'img', s['img']['f']), 'img/' + ED + '/' + s['img']['f'])
    # контактный лист для проверки подбора картин
    rows = ''.join('<figure><img src="img/%s"><figcaption><b>%s %s</b><br>%s<br><small>%s</small></figcaption></figure>' % (
        s['img']['f'] if s['img'] else '', s['id'], html.escape(s['title']), html.escape((imgs.get(s['id']) or {}).get('file', '— нет —')), html.escape((imgs.get(s['id']) or {}).get('how', ''))) for s in stories)
    open(os.path.join(OUT, 'review.html'), 'w', encoding='utf-8').write(
        '<meta charset=utf-8><style>body{font:13px system-ui;display:grid;grid-template-columns:repeat(auto-fill,260px);gap:10px}img{width:260px;height:170px;object-fit:cover}</style>' + rows)
    print('Готово: %s (%.1f МБ)' % (zp, os.path.getsize(zp) / 1e6))


if __name__ == '__main__':
    a = sys.argv[1] if len(sys.argv) > 1 else 'all'
    if a in ('text', 'all'): step_text()
    if a in ('images', 'all'): step_images()
    if a in ('pack', 'all'): step_pack()
