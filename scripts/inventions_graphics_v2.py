"""Local vector and typography system for the invention film's explanatory shots."""
from pathlib import Path
import re
from html import escape

PUB = Path('public/episodes/inventions-since-2000')
CSS_V2 = """
@font-face{font-family:Inter;src:url('assets/fonts/InterVariable.woff2') format('woff2');font-weight:100 900;font-display:block}
#root{font-family:Inter,sans-serif;font-optical-sizing:auto;-webkit-font-smoothing:antialiased}
svg text{font-family:Inter,sans-serif;letter-spacing:-1.1px}
.bg{image-rendering:auto}.miko img,.native{image-rendering:pixelated}
.screen{border:3px solid #4e5159;border-radius:26px;background:#f5f5f7;box-shadow:0 25px 70px #0004;color:#1d1d1f}
.browser-bar{height:64px;border-bottom:1px solid #d2d2d7;background:#ebebee;gap:12px}
.browser-dot{width:12px;height:12px;background:#9b9ba1}.browser-dot:first-child{background:#ed6a5e}.browser-dot:nth-child(2){background:#f5bf4f}.browser-dot:nth-child(3){background:#61c454}
.address{font-size:28px;color:#62626a;font-weight:500;letter-spacing:-.4px}
.wiki-title{color:#1d1d1f;border-color:#d2d2d7;font-weight:400}
.article-line{background:#c6c8cb;height:11px}.article-line.link{background:#7195b1}
.phone{border:12px solid #1d1d1f;border-radius:55px;box-shadow:0 28px 70px #0004;background:#f5f5f7}
.phone:before{height:7px;background:#5b5b61;left:calc(50% - 50px)}
.photo-frame{border:1px solid #ffffff24;border-radius:18px;background:#17181c;box-shadow:none}
.name{font-size:52px;font-weight:600;letter-spacing:-1.2px;text-shadow:none;color:#f5f5f7}
.pill-label{font-weight:500;letter-spacing:-1.2px;color:#d2d2d7}
.chapter-label{gap:20px;text-shadow:0 2px 12px #0008}.chapter-rank{font-weight:650;color:#eee1c5;letter-spacing:-5px}
.chapter-name{font-weight:600;letter-spacing:-1.6px}.chapter-year{font-weight:450;color:#d2d2d7}
.caption{font-family:'DM Sans',sans-serif}.end-prompt{font-weight:650;letter-spacing:-2px;text-shadow:none}
"""

ICON_NAMES = {'wiki': 'book-open', 'car': 'car', 'map': 'map-pin', 'video': 'play',
              'music': 'audio-lines', 'dna': 'dna', 'phone': 'smartphone', 'chat': 'messages-square',
              'camera': 'camera', 'wallet': 'wallet', 'globe': 'globe', 'light': 'flashlight'}


def vector_icon(name, x, y, size=150, color='#f5f5f7'):
    text = (PUB / 'icons' / (ICON_NAMES.get(name, name) + '.svg')).read_text()
    body = re.sub(r'^.*?<svg[^>]*>', '', text, flags=re.S).rsplit('</svg>', 1)[0]
    return (f'<svg x="{x}" y="{y}" width="{size}" height="{size}" viewBox="0 0 24 24" '
            f'fill="none" stroke="{color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">{body}</svg>')


def brand_icon(name, x, y, size=150, dark=True, width=None):
    if name=='uber' and (PUB/'logos/uber-wordmark.svg').exists():name='uber-wordmark'
    original = PUB / 'logos' / (name + '.svg')
    target = original
    if dark:
        text = original.read_text()
        # Keep multicolour marks intact; use white ink for the supplied black ink.
        text = re.sub(r'fill="(?:#000(?:000)?|#0a0a08|black)"', 'fill="#ffffff"', text, flags=re.I)
        if 'fill=' not in re.search(r'<svg[^>]*>', text).group(0):
            text = text.replace('<svg ', '<svg fill="#ffffff" ', 1)
        target = PUB / 'logos' / (name + '-on-dark.svg')
        target.write_text(text)
    return f'<image href="assets/logos/{target.name}" x="{x}" y="{y}" width="{width or size}" height="{size}" preserveAspectRatio="xMidYMid meet"/>'


def ride_screen(button, logo):
    tiles = ''.join(f'<rect x="{20+c*110}" y="{100+r*85}" width="82" height="57" rx="8" fill="{["#dce3da","#d2ded8","#e5e5dc"][(c+r)%3]}"/>'
                    for c in range(4) for r in range(6))
    return ('<svg viewBox="0 0 460 660" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block">'
            '<rect width="460" height="660" fill="#f5f5f7"/>' + tiles +
            '<path d="M88 507V382H308V212" fill="none" stroke="#548ca3" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>'
            '<circle cx="88" cy="507" r="15" fill="#548ca3" stroke="#fff" stroke-width="5"/>' +
            vector_icon('map', 282, 155, 52, '#294b51') + vector_icon('car', 281, 329, 52, '#17343d') +
            '<rect x="0" y="0" width="460" height="76" fill="#f5f5f7"/>'
            f'<image href="assets/logos/{logo}.svg" x="24" y="18" width="100" height="38" preserveAspectRatio="xMidYMid meet"/>'
            '<rect x="24" y="574" width="412" height="62" rx="15" fill="#1d1d1f"/>'
            '<text x="230" y="615" text-anchor="middle" font-family="Inter" font-size="30" font-weight="550" fill="#fff">' +
            escape(button) + '</text></svg>')
