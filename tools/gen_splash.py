"""Статичные заставки запуска для iOS (apple-touch-startup-image): показываются мгновенно, ещё до загрузки страницы.
Запуск: python3 tools/gen_splash.py  (нужен playwright + chrome). Результат: splash/*.png и сниппет для index.html."""
import asyncio, base64, os, sys
from playwright.async_api import async_playwright
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ICON = base64.b64encode(open(os.path.join(root, 'icon.svg'), 'rb').read()).decode()
# (css-ширина, css-высота, dpr)
DEV = [(440,956,3),(430,932,3),(428,926,3),(402,874,3),(393,852,3),(390,844,3),(375,812,3),(414,896,3),(414,896,2),(414,736,3),(375,667,2),(320,568,2),
       (768,1024,2),(744,1133,2),(810,1080,2),(820,1180,2),(834,1112,2),(834,1194,2),(1024,1366,2)]
PAGE = '''<html><body style="margin:0;width:{w}px;height:{h}px;background:{bg};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;overflow:hidden">
<img src="data:image/svg+xml;base64,{icon}" style="width:104px;height:104px;border-radius:4px 24px 24px 4px;display:block">
<div style="text-align:center;font-family:-apple-system,system-ui,sans-serif;color:{fg}"><div style="font-weight:800;font-size:22px;line-height:1;letter-spacing:.02em">Ad fontes</div><div style="font-weight:500;font-size:13px;line-height:1.2;opacity:.55;margin-top:8px;letter-spacing:.04em">к истокам</div></div></body></html>'''
async def main():
    tags = []
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for w, h, d in DEV:
            for dark in (0, 1):
                bg, fg = ('#10131C', '#E8EBF5') if dark else ('#F5F7FC', '#14161F')
                c = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=d)
                pg = await c.new_page(); await pg.set_content(PAGE.format(w=w, h=h, bg=bg, fg=fg, icon=ICON))
                fn = f'splash/{w}x{h}x{d}{"d" if dark else ""}.png'
                await pg.screenshot(path=os.path.join(root, fn)); await c.close()
                tags.append(f'<link rel="apple-touch-startup-image" media="(device-width:{w}px) and (device-height:{h}px) and (-webkit-device-pixel-ratio:{d}) and (orientation:portrait) and (prefers-color-scheme:{"dark" if dark else "light"})" href="{fn}">')
        await b.close()
    open(os.path.join(root, 'splash', 'tags.html'), 'w').write('\n'.join(tags))
asyncio.run(main())
