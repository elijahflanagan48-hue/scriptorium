"""Shared normalisation for word-audio. The app (speech.js) must apply the SAME rules
to a tapped word to find its file: id = sha1(norm(text)).hexdigest()[:12]; file = <lang>/<id>.opus"""
import re, unicodedata, hashlib
HEB_STRIP = re.compile('[֑-ֽ֯־ֿ׀׃-ׅ׳״]')
GRC_STRIP = re.compile(r'[·;·.,;:!?()\[\]{}"\'«»<>*†‡—–\-‹›·]')
def norm(text, lang):
    t = unicodedata.normalize('NFC', text)
    if lang == 'heb':
        t = HEB_STRIP.sub('', t)
        t = unicodedata.normalize('NFC', t)
    else:
        t = GRC_STRIP.sub('', t)
        t = t.replace('ͅ', '')  # keep as-is otherwise (polytonic accepted by the model)
        t = unicodedata.normalize('NFC', t)
    return t.strip()
def wid(text, lang):
    return hashlib.sha1(norm(text, lang).encode('utf-8')).hexdigest()[:12]
