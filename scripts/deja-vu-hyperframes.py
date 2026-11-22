"""Build the editable deja-vu HyperFrames project: world video + timed captions + stems."""
import html, json, shutil
from pathlib import Path

EP = Path("episodes/deja-vu"); PUB = Path("public/episodes/deja-vu"); P = EP / "hyperframes"
SRC = Path("episodes/restless-friend/variants/cedar-v4-1p1x/hyperframes/assets")  # shared gsap + OFL fonts
T = json.loads((EP / "timeline.json").read_text()); D = T["duration"]
CUES = json.loads((EP / "caption-cues.json").read_text())
WORLD = "world-v1.mp4"
(P / "compositions").mkdir(parents=True, exist_ok=True); (P / "assets/fonts").mkdir(parents=True, exist_ok=True); (P / "assets/vendor").mkdir(parents=True, exist_ok=True)
for f in ["fonts/dmsans.ttf", "fonts/dmsans-OFL.txt", "vendor/gsap.min.js"]:
    shutil.copy(SRC / f, P / "assets" / f)
for n in ["narration", "music", "effects"]:
    shutil.copy(PUB / f"{n}.wav", P / f"assets/{n}.wav")
CSS = ("@font-face{font-family:'DM Sans';src:url('assets/fonts/dmsans.ttf');font-weight:100 1000}*{box-sizing:border-box}"
       "#root{position:absolute;inset:0;overflow:hidden}video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}"
       ".caption{position:absolute;left:90px;top:1320px;width:900px;height:150px;display:flex;align-items:center;justify-content:center;"
       "text-align:center;font:900 92px/1.05 'DM Sans';letter-spacing:-1.6px;color:white;-webkit-text-stroke:11px #10161c;"
       "paint-order:stroke fill;text-shadow:0 6px 0 #10161c}.caption span{display:inline-block}")
TONE = {"white": "#ffffff", "gold": "#ffc94a", "red": "#ff6f61"}


def doc(cid, body, js):
    return (f'<template><style>{CSS}</style><div id="root" data-composition-id="{cid}" data-width="1080" data-height="1920">{body}</div>'
            f'<script>window.__timelines=window.__timelines||{{}};const tl=gsap.timeline({{paused:true}});{js}window.__timelines["{cid}"]=tl;</script></template>')


# one continuous world clip (cuts are baked into the Blender frames)
world = (f'<video id="world" class="clip" src="assets/{WORLD}" data-start="0" data-duration="{D}" data-media-start="0" '
         f'data-track-index="0" muted playsinline></video>')
(P / "compositions/world.html").write_text(doc("world", world, f'tl.to({{c:0}},{{c:{D},duration:{D},ease:"none"}});'))
cc, js = [], []
for i, c in enumerate(CUES):
    text = " ".join(f'<span style="color:{TONE[w["tone"]]}">{html.escape(w["text"].upper())}</span>' for w in c["words"])
    cc.append(f'<div id="caption-{i}" class="clip caption" data-start="{c["start"]:.6f}" data-duration="{c["end"] - c["start"]:.6f}" '
              f'data-track-index="1"><span id="caption-inner-{i}">{text}</span></div>')
    js.append(f'tl.fromTo("#caption-inner-{i}",{{scale:.94}},{{scale:1,duration:.07,ease:"power2.out"}},{c["start"]});')
(P / "compositions/captions.html").write_text(doc("captions", "".join(cc), "".join(js)))
hosts = (f'<div id="world-host" class="clip" data-composition-id="world" data-composition-src="compositions/world.html" data-start="0" '
         f'data-duration="{D}" data-track-index="0" data-track-kind="graphics" data-width="1080" data-height="1920" style="position:absolute;inset:0;z-index:1"></div>'
         f'<div id="captions" class="clip" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" '
         f'data-duration="{D}" data-track-index="2" data-track-kind="captions" data-width="1080" data-height="1920" data-layout-allow-overlap '
         f'style="position:absolute;inset:0;z-index:10"></div>')
audio = "".join(f'<audio id="{n}" class="clip" src="assets/{n}.wav" data-start="0" data-duration="{D}" data-track-index="{i + 3}" data-volume="1"></audio>'
                for i, n in enumerate(["narration", "music", "effects"]))
(P / "index.html").write_text(
    f'<!doctype html><html lang="en" data-resolution="portrait"><head><meta charset="UTF-8"><meta name="viewport" content="width=1080,height=1920">'
    f'<script src="assets/vendor/gsap.min.js"></script><style>{CSS}html,body{{margin:0;width:1080px;height:1920px;overflow:hidden;background:#1a2c3a}}</style></head>'
    f'<body><div id="root" data-composition-id="main" data-width="1080" data-height="1920" data-start="0" data-duration="{D}" data-fps="30">{hosts}{audio}</div>'
    f'<script>window.__timelines=window.__timelines||{{}};const tl=gsap.timeline({{paused:true}});tl.to({{t:0}},{{t:{D},duration:{D},ease:"none"}});window.__timelines.main=tl;</script></body></html>')
(P / "meta.json").write_text(json.dumps({"id": "deja-vu-v1", "name": "Why Déjà Vu Feels Like a Memory"}, indent=2, ensure_ascii=False) + "\n")
(P / "package.json").write_text(json.dumps({"name": "deja-vu-hyperframes", "private": True, "type": "module",
    "scripts": {k: f"npx --yes hyperframes@0.9.23 {v}" for k, v in {"dev": "preview", "check": "check", "render": "render"}.items()}}, indent=2) + "\n")
print(json.dumps({"cues": len(CUES), "duration": D}))
